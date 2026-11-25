import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom';
import type { StudySession } from '@408os/domain';
import { storage } from '../app/storage';
import {
  clearPracticeLabReturn,
  PRACTICE_LAB_RETURN_PARAM,
  readStoredPracticeLabReturn,
  rememberPracticeLabReturn,
} from './practiceLabReturn';

function PracticeLabReturnBannerInRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const querySessionId = new URLSearchParams(location.search).get(PRACTICE_LAB_RETURN_PARAM)?.trim() || null;
  const candidateId = querySessionId ?? readStoredPracticeLabReturn();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState<{ id: string; session: StudySession | null }>({ id: '', session: null });

  useEffect(() => {
    if (querySessionId) {
      rememberPracticeLabReturn(querySessionId);
    }
  }, [querySessionId]);

  useEffect(() => {
    if (!candidateId || candidateId === dismissedId) return;
    try {
      globalThis.window?.scrollTo?.(0, 0);
      globalThis.document?.querySelector?.('.main-area')?.scrollTo?.(0, 0);
    } catch {
      // Ignore non-browser environments (e.g. jsdom without scrollTo implementation).
    }
  }, [candidateId, dismissedId]);

  useEffect(() => {
    let active = true;
    if (!candidateId || candidateId === dismissedId) {
      return () => { active = false; };
    }

    const getSessionFn = storage?.studyRepository?.getSession;
    if (typeof getSessionFn !== 'function') {
      return () => { active = false; };
    }

    void Promise.resolve()
      .then(() => getSessionFn.call(storage.studyRepository, candidateId))
      .then(
        (found) => {
          if (!active) return;
          if (found && !found.completedAt && found.mode !== 'mock' && found.questionIds.length > 0) {
            setResolved({ id: candidateId, session: found });
          } else {
            if (!querySessionId) clearPracticeLabReturn();
            setResolved({ id: candidateId, session: null });
          }
        },
        () => {
          if (!active) return;
          setResolved({ id: candidateId, session: null });
        },
      );

    return () => { active = false; };
  }, [candidateId, dismissedId, querySessionId]);

  if (!candidateId || candidateId === dismissedId) return null;
  const activeSession = resolved.id === candidateId ? resolved.session : null;
  if (!activeSession) return null;

  const currentPos = Math.min(activeSession.questionIds.length, Math.max(1, activeSession.currentIndex + 1));
  const totalCount = activeSession.questionIds.length;

  return (
    <div className="lab-exhibit-return-bar" role="region" aria-label="返回练习会话">
      <button
        type="button"
        className="lab-exhibit-return-btn"
        onClick={() => {
          clearPracticeLabReturn();
          navigate(`/practice/${encodeURIComponent(activeSession.id)}`);
        }}
      >
        <span>← 返回刚才的练习（第 {currentPos} / {totalCount} 题）</span>
      </button>
      <button
        type="button"
        className="lab-exhibit-return-dismiss"
        aria-label="关闭返回练习提示"
        title="关闭提示"
        onClick={() => {
          clearPracticeLabReturn();
          setDismissedId(candidateId);
        }}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export function PracticeLabReturnBanner() {
  const inRouter = useInRouterContext();
  return inRouter ? <PracticeLabReturnBannerInRouter /> : null;
}
