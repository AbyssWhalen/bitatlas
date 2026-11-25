import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiFailure, setApiAccount } from './api';

beforeEach(() => { setApiAccount(null); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('API response and account boundaries', () => {
  it('reports an HTML gateway error without exposing the body or a JSON parser error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>upstream diagnostic</html>', { status: 502 })));
    await expect(api('/content')).rejects.toMatchObject({ status: 502, code: 'REQUEST_FAILED' });
  });

  it('locks the current account on an empty 401 response', async () => {
    const required = vi.fn();
    window.addEventListener('bitatlas-auth-required', required);
    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
      await expect(api('/sync/pull')).rejects.toBeInstanceOf(ApiFailure);
      expect(required).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener('bitatlas-auth-required', required); }
  });

  it('does not let a delayed 401 from the previous account lock the newly active account', async () => {
    let resolve!: (value: Response) => void;
    const required = vi.fn();
    window.addEventListener('bitatlas-auth-required', required);
    try {
      setApiAccount('previous');
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>((done) => { resolve = done; })));
      const result = api('/sync/pull');
      setApiAccount('current');
      resolve(Response.json({ code: 'AUTH_REQUIRED', message: 'expired' }, { status: 401 }));
      await expect(result).rejects.toBeInstanceOf(ApiFailure);
      expect(required).not.toHaveBeenCalled();
    } finally { window.removeEventListener('bitatlas-auth-required', required); }
  });

  it('does not let a late response lock a new login to the same account', async () => {
    let resolve!: (value: Response) => void;
    const required = vi.fn();
    window.addEventListener('bitatlas-auth-required', required);
    try {
      setApiAccount('same-account');
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>((done) => { resolve = done; })));
      const result = api('/sync/pull');
      setApiAccount(null);
      setApiAccount('same-account');
      resolve(Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 }));
      await expect(result).rejects.toBeInstanceOf(ApiFailure);
      expect(required).not.toHaveBeenCalled();
    } finally { window.removeEventListener('bitatlas-auth-required', required); }
  });

  it('rejects a malformed successful response as a protocol error, not an offline signal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>challenge</html>')));
    await expect(api('/auth/me')).rejects.toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
  });

  it('preserves structured server errors and never retries a mutation automatically', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ code: 'VERSION_CONFLICT', message: '版本冲突' }, { status: 409 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(api('/sync/push', { operationId: 'unchanged' })).rejects.toMatchObject({ status: 409, code: 'VERSION_CONFLICT', message: '版本冲突' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retains native network failures so offline qualification remains explicit', async () => {
    const offline = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(offline));
    await expect(api('/auth/me')).rejects.toBe(offline);
  });

  it('does not interpret an interrupted HTTP error body as an offline login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 503, json: () => Promise.reject(new TypeError('body stream failed')),
    } as unknown as Response));
    await expect(api('/auth/me')).rejects.toMatchObject({ status: 503, code: 'REQUEST_FAILED' });
  });

  it('honors session cancellation and clears its deadline without retrying', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetcher = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal!.addEventListener('abort', () => reject(options.signal!.reason), { once: true });
    }));
    vi.stubGlobal('fetch', fetcher);
    const cancelled = api('/sync/pull', undefined, 'GET', 'old-account', { signal: controller.signal })
      .catch((error: unknown) => error);
    controller.abort();
    expect(await cancelled).toMatchObject({ name: 'AbortError' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('request deadline', () => {
  it('ends a stalled request instead of blocking login or synchronization indefinitely', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
      signal = options.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal!.reason), { once: true });
      });
    }));
    const result = api('/sync/push', { operationId: 'retry-with-same-id' });
    const failure = result.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(signal?.aborted).toBe(true);
    expect(await failure).toMatchObject({ code: 'REQUEST_TIMEOUT' });
    expect(await failure).not.toBeInstanceOf(TypeError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the deadline active while a response body is still streaming', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
      signal = options.signal ?? undefined;
      return {
        ok: true, status: 200,
        json: () => new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal!.reason), { once: true });
        }),
      } as Response;
    }));
    const failure = api('/content/large').catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(signal?.aborted).toBe(true);
    expect(await failure).toMatchObject({ code: 'REQUEST_TIMEOUT' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the deadline after a successful request', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true })));
    await expect(api('/health')).resolves.toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });
});
