const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1_000;

// Do not send SKIP_WAITING or reload on controllerchange: a different tab may
// have unsaved input. Workbox keeps the old precache until its last client exits.
export function registerPwaUpdates(onWaiting: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => undefined;

  let disposed = false;
  let detach = () => undefined;
  const serviceWorkers = navigator.serviceWorker;
  const base = import.meta.env.BASE_URL;

  void serviceWorkers.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).then((registration) => {
    if (disposed) return;
    const watched = new Set<ServiceWorker>();
    let lastCheck = Date.now();

    const checkWaiting = () => {
      if (!disposed && registration.waiting && serviceWorkers.controller) onWaiting();
    };
    const watchInstalling = () => {
      const worker = registration.installing;
      if (worker && !watched.has(worker)) {
        watched.add(worker);
        worker.addEventListener('statechange', checkWaiting);
      }
      checkWaiting();
    };
    const checkForUpdate = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) return;
      lastCheck = Date.now();
      // Being offline must not prevent using the already installed app.
      void registration.update().catch(() => undefined);
    };

    registration.addEventListener('updatefound', watchInstalling);
    document.addEventListener('visibilitychange', checkForUpdate);
    window.addEventListener('pageshow', checkForUpdate);
    const timer = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    watchInstalling();
    detach = () => {
      window.clearInterval(timer);
      registration.removeEventListener('updatefound', watchInstalling);
      document.removeEventListener('visibilitychange', checkForUpdate);
      window.removeEventListener('pageshow', checkForUpdate);
      for (const worker of watched) worker.removeEventListener('statechange', checkWaiting);
    };
  }).catch((reason: unknown) => {
    console.warn('PWA registration failed; the app remains available online.', reason);
  });

  return () => {
    disposed = true;
    detach();
  };
}
