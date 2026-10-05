import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerPwaUpdates } from './pwa';

const cleanups: Array<() => void> = [];

function setup(controller: object | null = { postMessage: vi.fn() }) {
  const registration = Object.assign(new EventTarget(), {
    waiting: null as EventTarget | null,
    installing: null as EventTarget | null,
    update: vi.fn(async () => undefined),
  });
  const serviceWorkers = { controller, register: vi.fn(async () => registration) };
  vi.stubGlobal('navigator', { serviceWorker: serviceWorkers });
  const onWaiting = vi.fn();
  return { registration, serviceWorkers, onWaiting };
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('PWA update lifecycle', () => {
  it('reports an already waiting update without activating it or reloading other tabs', async () => {
    const { registration, serviceWorkers, onWaiting } = setup();
    const postMessage = vi.fn();
    registration.waiting = Object.assign(new EventTarget(), { postMessage });
    cleanups.push(registerPwaUpdates(onWaiting));
    await Promise.resolve();

    expect(serviceWorkers.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(onWaiting).toHaveBeenCalledOnce();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('observes a new installation and keeps its worker waiting', async () => {
    const { registration, onWaiting } = setup();
    cleanups.push(registerPwaUpdates(onWaiting));
    await Promise.resolve();
    const worker = Object.assign(new EventTarget(), { postMessage: vi.fn() });
    registration.installing = worker;
    registration.dispatchEvent(new Event('updatefound'));
    expect(onWaiting).not.toHaveBeenCalled();

    registration.waiting = worker;
    worker.dispatchEvent(new Event('statechange'));
    expect(onWaiting).toHaveBeenCalledOnce();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('does not label the first offline installation as an update', async () => {
    const { registration, onWaiting } = setup(null);
    registration.waiting = new EventTarget();
    cleanups.push(registerPwaUpdates(onWaiting));
    await Promise.resolve();
    expect(onWaiting).not.toHaveBeenCalled();
  });

  it('checks for updates on a visible page, tolerates offline failure and cleans up', async () => {
    vi.useFakeTimers();
    const { registration, onWaiting } = setup();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    registration.update.mockRejectedValue(new Error('offline'));
    const cleanup = registerPwaUpdates(onWaiting);
    cleanups.push(cleanup);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(registration.update).toHaveBeenCalledOnce();
    cleanup();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(registration.update).toHaveBeenCalledOnce();
    registration.waiting = new EventTarget();
    registration.dispatchEvent(new Event('updatefound'));
    expect(onWaiting).not.toHaveBeenCalled();
  });

  it('ignores registration completion after unmount (including StrictMode cleanup)', async () => {
    const { registration, onWaiting } = setup();
    registration.waiting = new EventTarget();
    registerPwaUpdates(onWaiting)();
    await Promise.resolve();
    expect(onWaiting).not.toHaveBeenCalled();
  });
});
