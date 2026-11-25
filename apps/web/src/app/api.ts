export class ApiFailure extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
export const API_REQUEST_TIMEOUT_MS = 30_000;
let expectedAccount: string | null = null;
let accountGeneration = 0;
export function setApiAccount(id: string | null) { expectedAccount = id; accountGeneration++; }
export async function api<T>(url: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', accountId = expectedAccount, options: { signal?: AbortSignal } = {}): Promise<T> {
  const generation = accountGeneration;
  const controller = new AbortController();
  const cancel = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new ApiFailure(0, 'REQUEST_TIMEOUT',
    '请求超时，请稍后重试。尚未同步的记录仍保存在本机。')), API_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`/api/v1${url}`, {
      method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accountId && !url.startsWith('/auth/') ? { 'X-BitAtlas-Account': accountId } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    // A revoked session must lock even when a proxy strips the JSON body. An
    // earlier login's delayed response must never lock the current session.
    if (response.status === 401 && generation === accountGeneration
      && (url.startsWith('/auth/') || accountId === expectedAccount)) {
      window.dispatchEvent(new CustomEvent('bitatlas-auth-required'));
    }
    let result: unknown;
    try { result = await response.json(); }
    catch {
      if (controller.signal.aborted) throw controller.signal.reason;
      if (response.ok) throw new ApiFailure(response.status, 'INVALID_RESPONSE', '服务器返回了无法识别的内容，请稍后重试。');
      // Proxy HTML and empty error bodies are not application error messages.
      // A known HTTP failure is never reclassified as offline authentication.
    }
    if (!response.ok) {
      const details = result && typeof result === 'object' ? result as Record<string, unknown> : {};
      throw new ApiFailure(response.status, typeof details.code === 'string' ? details.code : 'REQUEST_FAILED',
        typeof details.message === 'string' ? details.message : `请求失败（HTTP ${response.status}），请稍后重试。`);
    }
    return result as T;
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
