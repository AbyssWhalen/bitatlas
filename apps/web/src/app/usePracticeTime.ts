import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { storage } from './storage';
import { useActiveTime } from './useActiveTime';

/** Checkpoints are monotonic and never overwrite hints or an already submitted answer. */
export function usePracticeTime(sessionId: string | undefined, questionId: string | undefined, enabled: boolean, locked: RefObject<boolean>, onError: (message: string) => void) {
  const key = `${sessionId}:${questionId}`;
  const sample = useActiveTime(key, enabled);
  const state = useRef({ key: '', base: undefined as number | undefined, pending: Promise.resolve() });
  const errorHandler = useRef(onError);
  useEffect(() => { errorHandler.current = onError; }, [onError]);
  const flush = useCallback(async () => {
    if (!sessionId || !questionId) return undefined;
    if (state.current.key !== key) state.current = { key, base: undefined, pending: Promise.resolve() };
    const current = state.current;
    const total = sample();
    const task = current.pending.then(async () => {
      const saved = await storage.reviewRepository.getPracticeEvidence(sessionId, questionId);
      current.base ??= saved?.activeDurationMs ?? 0;
      return await storage.reviewRepository.checkpointPracticeTime(sessionId, questionId, current.base + total) ?? saved;
    });
    current.pending = task.then(() => undefined, () => undefined);
    return task;
  }, [key, sessionId, questionId, sample]);
  useEffect(() => {
    if (!enabled || !sessionId || !questionId) return;
    const checkpoint = () => {
      if (!locked.current) void flush().catch((reason: unknown) => errorHandler.current(`有效用时保存失败：${String(reason)}`));
    };
    checkpoint();
    const timer = window.setInterval(checkpoint, 1000);
    document.addEventListener('visibilitychange', checkpoint);
    window.addEventListener('pagehide', checkpoint);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkpoint);
      window.removeEventListener('pagehide', checkpoint);
      checkpoint();
    };
  }, [enabled, sessionId, questionId, locked, flush]);
  const duration = () => (state.current.key === key ? state.current.base ?? 0 : 0) + sample();
  return { flush, duration };
}
