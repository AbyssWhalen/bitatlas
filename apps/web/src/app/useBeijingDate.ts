import { useSyncExternalStore } from 'react';

const DAY_MS = 24 * 60 * 60 * 1_000;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});

function dateKey(): string {
  const parts = formatter.formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
}

function subscribe(onChange: () => void): () => void {
  let timer: number;
  const schedule = () => {
    window.clearTimeout(timer);
    // The study calendar uses present-day Beijing time (UTC+08:00).
    const midnight = new Date(`${dateKey()}T00:00:00+08:00`).getTime() + DAY_MS;
    timer = window.setTimeout(refresh, Math.max(1, midnight - Date.now()));
  };
  const refresh = () => {
    onChange();
    schedule();
  };
  const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
  schedule();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('focus', refresh);
  };
}

export function useBeijingDate(): string {
  return useSyncExternalStore(subscribe, dateKey);
}
