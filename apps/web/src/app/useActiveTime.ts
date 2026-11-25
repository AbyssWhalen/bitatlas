import { useCallback, useEffect, useRef } from 'react';

/** Long gaps are sleep/suspension, not evidence of active studying. */
export function activeTimeIncrement(elapsed: number, active: boolean) {
  return active && elapsed >= 0 && elapsed <= 2500 ? elapsed : 0;
}
export function useActiveTime(key: string, enabled = true) {
  const state = useRef({ key: '', total: 0, tick: 0, foreground: false });
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
    if (state.current.key !== key) state.current = { key, total: 0, tick: performance.now(), foreground: false };
    state.current.foreground = document.visibilityState === 'visible' && document.hasFocus();
    const sample = () => {
      const now = performance.now();
      state.current.total += activeTimeIncrement(now - state.current.tick, enabledRef.current && state.current.foreground);
      state.current.tick = now;
    };
    const change = () => { sample(); state.current.foreground = document.visibilityState === 'visible' && document.hasFocus(); };
    const timer = window.setInterval(sample, 1000);
    window.addEventListener('focus', change); window.addEventListener('blur', change);
    document.addEventListener('visibilitychange', change);
    return () => {
      sample(); window.clearInterval(timer);
      window.removeEventListener('focus', change); window.removeEventListener('blur', change);
      document.removeEventListener('visibilitychange', change);
    };
  }, [key, enabled]);
  return useCallback(() => {
    const current = state.current;
    if (current.key !== key) return 0;
    const now = performance.now();
    current.total += activeTimeIncrement(now - current.tick, enabledRef.current && current.foreground);
    current.tick = now;
    return Math.round(current.total);
  }, [key]);
}
