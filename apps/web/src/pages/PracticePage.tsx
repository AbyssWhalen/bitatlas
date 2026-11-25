import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  FileScan,
  Flag,
  FlaskConical,
  Lightbulb,
  NotebookPen,
  Save,
  TriangleAlert,
  X,
  ZoomIn,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  evaluateResponse,
  practiceEvidenceId,
  questionAvailability,
  type Mastery,
  type MistakeReason,
  type PracticeEvidence,
  type StudySession,
  type UserResponse,
} from '@408os/domain';
import { StudySessionConflictError, studySessionVersionIssue } from '@408os/storage';
import { useStudy } from '../app/StudyContext';
import { questionLabLink } from '../app/lab-links';
import { LazyContentRenderer } from '../components/LazyContentRenderer';
import { PracticeConceptBridge } from '../components/PracticeConceptBridge';
import { rememberPracticeLabReturn } from '../components/practiceLabReturn';
import { PracticeMistakePanel } from '../components/PracticeMistakePanel';
import { ReadingImageLightbox, type LightboxImage } from '../components/ReadingImageLightbox';
import {
  extractLightboxImageFromElement,
  extractLightboxImageFromScope,
} from '../components/readingImageLightboxUtils';
import { isInteractiveTarget, shouldIgnoreReadingShortcut } from '../components/readingKeyboard';
import { SourcePageImage } from '../components/SourcePageImage';
import { SubjectShape } from '../components/SubjectShape';
import { storage } from '../app/storage';
import { useLearning } from '../app/LearningContext';
import { QuestionSupplement } from '../components/QuestionSupplement';
import { usePracticeTime } from '../app/usePracticeTime';

const masteryOptions: Array<{ value: Mastery; label: string }> = [
  { value: 'learning', label: '学习中' },
  { value: 'familiar', label: '熟悉' },
  { value: 'mastered', label: '已掌握' },
];

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function PracticeFailure({
  message,
  retry,
  onReturn,
}: {
  message: string;
  retry?: () => void;
  onReturn: () => void;
}) {
  return (
    <section className="fatal-state rl-fatal" role="alert">
      <TriangleAlert size={28} aria-hidden="true" />
      <h1>无法恢复练习</h1>
      <p>{message}</p>
      <div className="command-row">
        {retry && <button type="button" className="primary-command rl-primary-btn" onClick={retry}>重新读取</button>}
        <button type="button" className="secondary-command rl-secondary-btn" onClick={onReturn}>返回真题</button>
      </div>
    </section>
  );
}

interface PracticeKeyboardShortcutsProps {
  enabled: boolean;
  submitted: boolean;
  answerBlocked: boolean;
  writeBlocked: boolean;
  saveError: string | null;
  canSubmit: boolean;
  hasNext: boolean;
  options: Array<{ id: 'A' | 'B' | 'C' | 'D' }> | undefined;
  isSingleChoice: boolean;
  onSelectChoice: (optionId: 'A' | 'B' | 'C' | 'D') => void;
  onSubmit: (timeStamp: number) => void;
  onNext: (timeStamp: number) => void;
}

function PracticeKeyboardShortcuts(props: PracticeKeyboardShortcutsProps) {
  const latestRef = useRef(props);
  const enterLockedUntilKeyUpRef = useRef(false);

  useEffect(() => {
    latestRef.current = props;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = latestRef.current;
      if (!current.enabled) return;
      if (shouldIgnoreReadingShortcut(event)) return;

      const lower = event.key.toLowerCase();
      if (lower === 'a' || lower === 'b' || lower === 'c' || lower === 'd') {
        if (event.repeat || current.submitted || current.answerBlocked) return;
        if (!current.isSingleChoice || !current.options) return;
        const matched = current.options.find((option) => option.id.toLowerCase() === lower);
        if (!matched) return;
        event.preventDefault();
        current.onSelectChoice(matched.id);
        return;
      }

      if (event.key === 'Enter') {
        if (event.repeat) {
          if (!isInteractiveTarget(event.target)) event.preventDefault();
          return;
        }
        if (isInteractiveTarget(event.target)) {
          if (!current.submitted) enterLockedUntilKeyUpRef.current = true;
          return;
        }
        if (enterLockedUntilKeyUpRef.current) {
          event.preventDefault();
          return;
        }
        if (!current.submitted) {
          if (!current.canSubmit) return;
          enterLockedUntilKeyUpRef.current = true;
          event.preventDefault();
          current.onSubmit(event.timeStamp);
          return;
        }
        if (current.hasNext && !current.saveError && !current.writeBlocked) {
          enterLockedUntilKeyUpRef.current = true;
          event.preventDefault();
          current.onNext(event.timeStamp);
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Enter') enterLockedUntilKeyUpRef.current = false;
    };
    const onBlur = () => {
      enterLockedUntilKeyUpRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return null;
}

export function PracticePage() {
  const { sessionId } = useParams();
  return <PracticeSession key={sessionId ?? 'missing'} sessionId={sessionId} />;
}

function PracticeSession({ sessionId }: { sessionId: string | undefined }) {
  const navigate = useNavigate();
  const {
    packs,
    assets,
    questions,
    attempts,
    progress,
    currentProgress,
    collections,
    notes,
    getSession,
    saveResponse,
    submitResponse,
    moveSession,
    finishSession,
    setMastery,
    toggleCollection,
    saveNote,
  } = useStudy();
  const [session, setSession] = useState<StudySession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [resolvedLoadKey, setResolvedLoadKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [conflictRecoveryError, setConflictRecoveryError] = useState<string | null>(null);
  const [recoveringConflict, setRecoveringConflict] = useState(false);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, UserResponse>>({});
  const [selfScoreDrafts, setSelfScoreDrafts] = useState<Record<string, string>>({});
  const [hintCounts, setHintCounts] = useState<Record<string, number>>({});
  const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<string>>(() => new Set());
  const [sourceOpen, setSourceOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [mistakeDrafts, setMistakeDrafts] = useState<Record<string, MistakeReason | ''>>({});
  const [mistakeNoteDrafts, setMistakeNoteDrafts] = useState<Record<string, string>>({});
  const [mistakeSkipped, setMistakeSkipped] = useState<Record<string, boolean>>({});
  const [mistakeJustSaved, setMistakeJustSaved] = useState<Record<string, boolean>>({});
  const [mistakeBusy, setMistakeBusy] = useState(false);
  const mistakeSavePromise = useRef<Promise<void> | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const optionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const noteVersions = useRef(new Map<string, string | null>());
  const [submitting, setSubmitting] = useState(false);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const evidenceLock = useRef(false);
  const [pendingResponseWrites, setPendingResponseWrites] = useState(0);
  const startedAt = useRef(new Map<string, number>());
  const responseSaveQueue = useRef<Promise<StudySession> | null>(null);
  const persistedSession = useRef<StudySession | null>(null);
  const responseSaveFailure = useRef<Error | null>(null);
  const answerStatusRef = useRef<HTMLDivElement | null>(null);
  const sourceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lastSourceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sourceDialogRef = useRef<HTMLDivElement | null>(null);
  const sourceCloseRef = useRef<HTMLButtonElement | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const lightboxOpenRef = useRef(false);
  const previousQuestionId = useRef<string | null>(null);
  const previousSubmitted = useRef(false);
  const loadKey = `${sessionId ?? 'missing'}:${loadRevision}`;
  const questionsById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const question = session ? questionsById.get(session.questionIds[session.currentIndex] ?? '') : undefined;
  const { evidence: learningEvidence } = useLearning();
  const savedEvidence = learningEvidence.find((entry) => entry.sessionId === sessionId && entry.questionId === question?.id);
  const evidenceRef = useRef<PracticeEvidence | undefined>(undefined);
  useEffect(() => {
    if (!savedEvidence || evidenceRef.current?.id !== savedEvidence.id || savedEvidence.revision >= evidenceRef.current.revision) {
      evidenceRef.current = savedEvidence;
    }
  }, [savedEvidence]);
  const activeTime = usePracticeTime(
    sessionId,
    question?.id,
    Boolean(session && question && !session.completedAt && !sessionConflict && !session.submittedQuestionIds.includes(question.id)),
    evidenceLock,
    setActionError,
  );
  const labLink = questionLabLink(question?.id);
  const submitted = Boolean(question && session?.submittedQuestionIds.includes(question.id));
  const response = question ? responseDrafts[question.id] ?? session?.responses[question.id] ?? null : null;
  const hintCount = question ? Math.max(hintCounts[question.id] ?? 0, savedEvidence?.hintsUsed ?? 0) : 0;
  const showReference = Boolean(question && (submitted || revealedQuestionIds.has(question.id) || savedEvidence?.answerRevealedAt));
  const noteBody = question ? noteDrafts[question.id] ?? notes.get(question.id)?.body ?? '' : '';

  useEffect(() => {
    lightboxOpenRef.current = Boolean(lightboxImage);
  }, [lightboxImage]);

  useEffect(() => {
    let active = true;
    responseSaveQueue.current = null;
    persistedSession.current = null;
    responseSaveFailure.current = null;

    if (!sessionId) return () => { active = false; };

    void Promise.resolve().then(() => getSession(sessionId)).then(
      (value) => {
        if (!active) return;
        setSaveError(null);
        setActionError(null);
        if (!value) {
          setSession(null);
          setLoadError('未找到练习会话。它可能已被清除，或已由备份恢复替换。');
          setResolvedLoadKey(loadKey);
          return;
        }
        const questionId = value.questionIds[value.currentIndex];
        if (questionId) startedAt.current.set(questionId, globalThis.performance.now());
        persistedSession.current = value;
        responseSaveQueue.current = Promise.resolve(value);
        setLoadError(null);
        setSessionConflict(false);
        setConflictRecoveryError(null);
        setSession(value);
        setResolvedLoadKey(loadKey);
      },
      (reason) => {
        if (!active) return;
        setSession(null);
        setLoadError(`读取练习会话失败：${errorMessage(reason, '本地数据库暂时不可用')}`);
        setResolvedLoadKey(loadKey);
      },
    );

    return () => { active = false; };
  }, [getSession, loadKey, sessionId]);

  useEffect(() => {
    const questionId = question?.id ?? null;
    const questionChanged = previousQuestionId.current !== questionId;
    if (questionId && submitted && !questionChanged && !previousSubmitted.current) {
      answerStatusRef.current?.focus();
    }
    previousQuestionId.current = questionId;
    previousSubmitted.current = submitted;
  }, [question?.id, submitted]);

  useEffect(() => {
    if (!sourceOpen) return undefined;
    const dialog = sourceDialogRef.current;
    if (!dialog) return undefined;
    const trigger = lastSourceTriggerRef.current ?? sourceTriggerRef.current;
    const root = dialog.parentElement;
    const background = root
      ? Array.from(root.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child !== dialog)
      : [];
    const previousBackgroundState = background.map((element) => ({
      element,
      inert: element.hasAttribute('inert'),
      ariaHidden: element.getAttribute('aria-hidden'),
    }));
    background.forEach((element) => {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });

    const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const onKeyDown = (event: KeyboardEvent) => {
      if (lightboxOpenRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setSourceOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', onKeyDown);
    sourceCloseRef.current?.focus();
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      previousBackgroundState.forEach(({ element, inert, ariaHidden }) => {
        if (inert) element.setAttribute('inert', '');
        else element.removeAttribute('inert');
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
      if (trigger?.isConnected) trigger.focus();
    };
  }, [sourceOpen]);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  const handleImageClickDelegation = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (!submitted && !sourceOpen && target.closest('button.rl-option')) return;
    const nextImage = extractLightboxImageFromElement(target, '图片预览');
    if (!nextImage) return;
    lightboxTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLightboxImage(nextImage);
  }, [sourceOpen, submitted]);

  const openOptionImageLightbox = useCallback((optionId: string, trigger: HTMLElement | null) => {
    const scope = optionButtonRefs.current[optionId];
    const nextImage = extractLightboxImageFromScope(scope, `选项 ${optionId} 题图`);
    if (!nextImage) return;
    lightboxTriggerRef.current = trigger;
    setLightboxImage(nextImage);
  }, []);

  const getLightboxRestoreTarget = useCallback(
    () => (sourceOpen ? sourceCloseRef.current : lightboxTriggerRef.current),
    [sourceOpen],
  );

  const retryLoad = () => setLoadRevision((revision) => revision + 1);
  const returnToQuestions = () => navigate('/questions');

  if (!sessionId) {
    return <PracticeFailure message="当前地址没有练习会话编号。" onReturn={returnToQuestions} />;
  }

  if (resolvedLoadKey !== loadKey) {
    return <div className="practice-loading rl-loading"><span className="loader" /><p>恢复练习会话</p></div>;
  }

  if (loadError) {
    return <PracticeFailure message={loadError} retry={retryLoad} onReturn={returnToQuestions} />;
  }

  if (!session) {
    return <div className="practice-loading rl-loading"><span className="loader" /><p>恢复练习会话</p></div>;
  }

  const missingQuestionId = session.questionIds.find((questionId) => !questionsById.has(questionId));
  if (missingQuestionId) {
    return (
      <PracticeFailure
        message={`会话引用的题目 ${missingQuestionId} 不存在，题包可能已更新。请返回真题并新建练习。`}
        onReturn={returnToQuestions}
      />
    );
  }

  const sessionVersionIssue = studySessionVersionIssue(session, questionsById);
  if (sessionVersionIssue) {
    return (
      <PracticeFailure
        message={`${sessionVersionIssue} 请返回真题并新建练习。`}
        onReturn={returnToQuestions}
      />
    );
  }

  if (!question) {
    return (
      <PracticeFailure
        message="会话中的当前位置无效，无法确定要显示的题目。请返回真题并新建练习。"
        onReturn={returnToQuestions}
      />
    );
  }

  const sessionClosed = Boolean(session.completedAt);
  const writeBlocked = sessionConflict || sessionClosed;
  const availability = questionAvailability(question, assets);
  const answerBlocked = writeBlocked || !availability.practice;

  const enterSessionConflict = (reason: unknown): boolean => {
    if (!(reason instanceof StudySessionConflictError)) return false;
    responseSaveFailure.current = reason;
    setSessionConflict(true);
    setConflictRecoveryError(null);
    setSaveError(null);
    setActionError(null);
    return true;
  };

  const reloadSessionConflict = async () => {
    setRecoveringConflict(true);
    setConflictRecoveryError(null);
    try {
      const latest = await getSession(session.id);
      if (!latest) throw new Error('未找到练习会话，它可能已被清除或由备份替换。');
      setResponseDrafts((drafts) => {
        const next = { ...drafts };
        for (const questionId of latest.submittedQuestionIds) delete next[questionId];
        return next;
      });
      setSelfScoreDrafts((drafts) => {
        const next = { ...drafts };
        for (const questionId of latest.submittedQuestionIds) delete next[questionId];
        return next;
      });
      setMistakeDrafts({});
      setMistakeNoteDrafts({});
      setMistakeSkipped({});
      setMistakeJustSaved({});
      persistedSession.current = latest;
      responseSaveQueue.current = Promise.resolve(latest);
      responseSaveFailure.current = null;
      setSession(latest);
      setSourceOpen(false);
      setLightboxImage(null);
      setSaveError(null);
      setActionError(null);
      setSessionConflict(false);
    } catch (reason) {
      setConflictRecoveryError(`读取最新进度失败：${errorMessage(reason, '请稍后重试')}`);
    } finally {
      setRecoveringConflict(false);
    }
  };

  const persistResponse = (next: UserResponse) => {
    if (answerBlocked) return;
    setResponseDrafts((drafts) => ({ ...drafts, [question.id]: next }));
    setPendingResponseWrites((count) => count + 1);
    const fallback = persistedSession.current ?? session;
    const previous = responseSaveQueue.current ?? Promise.resolve(fallback);
    const pending = previous.then((current) => saveResponse(current, question.id, next));
    const recovered = pending.then(
      (updated) => {
        persistedSession.current = updated;
        responseSaveFailure.current = null;
        setSession(updated);
        setSaveError(null);
        setActionError(null);
        return updated;
      },
      (reason) => {
        const failure = reason instanceof Error ? reason : new Error('本地数据库写入失败');
        responseSaveFailure.current = failure;
        if (!enterSessionConflict(failure)) setSaveError(`答案草稿保存失败：${failure.message}`);
        return persistedSession.current ?? fallback;
      },
    );
    responseSaveQueue.current = recovered;
    void recovered.then(() => setPendingResponseWrites((count) => Math.max(0, count - 1)));
  };

  const flushResponses = async () => {
    const updated = await (responseSaveQueue.current ?? Promise.resolve(persistedSession.current ?? session));
    if (responseSaveFailure.current) throw responseSaveFailure.current;
    return updated;
  };

  const retryResponseSave = () => {
    if (response) persistResponse(response);
  };

  const runPageAction = async (label: string, action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (reason) {
      setActionError(`${label}失败：${errorMessage(reason, '请稍后重试')}`);
    }
  };

  const submit = async (selectedAt: number) => {
    if (!response || submitting || answerBlocked || evidenceLock.current) return;
    evidenceLock.current = true;
    if (question.kind === 'comprehensive' && !showReference) {
      setEvidenceBusy(true);
      await runPageAction('保存答案揭示记录', async () => {
        await persistEvidence({ firstResponse: response, answerRevealedAt: new Date().toISOString() });
        setRevealedQuestionIds((ids) => new Set(ids).add(question.id));
      });
      setEvidenceBusy(false);
      evidenceLock.current = false;
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const currentSession = await flushResponses();
      void selectedAt;
      evidenceRef.current = await activeTime.flush();
      const previous = evidenceRef.current;
      const duration = Math.max(previous?.activeDurationMs ?? 0, activeTime.duration());
      const evidence = makeEvidence({ firstResponse: previous?.firstResponse ?? response, activeDurationMs: duration });
      const updated = await submitResponse(currentSession, question, response, duration, evidence);
      persistedSession.current = updated;
      responseSaveQueue.current = Promise.resolve(updated);
      setSession(updated);
      setRevealedQuestionIds((ids) => new Set(ids).add(question.id));
    } catch (reason) {
      if (!enterSessionConflict(reason)) {
        setActionError(`提交答案失败：${errorMessage(reason, '请稍后重试')}`);
      }
    } finally {
      setSubmitting(false);
      evidenceLock.current = false;
    }
  };

  const goTo = async (index: number, selectedAt: number) => {
    if (mistakeSavePromise.current) await mistakeSavePromise.current;
    if (writeBlocked || evidenceLock.current) return;
    evidenceLock.current = true;
    setActionError(null);
    try {
      const currentSession = await flushResponses();
      await activeTime.flush();
      const updated = await moveSession(currentSession, index);
      const questionId = updated.questionIds[updated.currentIndex];
      if (questionId) startedAt.current.set(questionId, selectedAt);
      persistedSession.current = updated;
      responseSaveQueue.current = Promise.resolve(updated);
      setSourceOpen(false);
      setLightboxImage(null);
      setSession(updated);
    } catch (reason) {
      if (!enterSessionConflict(reason)) {
        setActionError(`切换题目失败：${errorMessage(reason, '请稍后重试')}`);
      }
    } finally { evidenceLock.current = false; }
  };

  const finish = async () => {
    if (mistakeSavePromise.current) await mistakeSavePromise.current;
    if (writeBlocked || evidenceLock.current) return;
    evidenceLock.current = true;
    setActionError(null);
    try {
      const currentSession = await flushResponses();
      await activeTime.flush();
      await finishSession(currentSession);
      navigate(`/practice/${currentSession.id}/summary`);
    } catch (reason) {
      if (!enterSessionConflict(reason)) {
        setActionError(`结束练习失败：${errorMessage(reason, '请稍后重试')}`);
      }
    } finally { evidenceLock.current = false; }
  };

  function makeEvidence(patch: Partial<PracticeEvidence>): PracticeEvidence {
    const previous = evidenceRef.current;
    return {
      id: practiceEvidenceId(session!.id, question!.id),
      sessionId: session!.id,
      questionId: question!.id,
      questionContentVersion: question!.contentVersion,
      hintsUsed: 0,
      evidenceFromStart: false,
      activeDurationMs: 0,
      mistakeNote: '',
      ...previous,
      ...patch,
      revision: (previous?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  async function persistEvidence(
    patch: Partial<PracticeEvidence>,
    options?: { clearMistakeReason?: boolean; skipActiveTimeFlush?: boolean },
  ) {
    if (options?.skipActiveTimeFlush) {
      evidenceRef.current = (await storage.reviewRepository.getPracticeEvidence(session!.id, question!.id)) ?? evidenceRef.current;
    } else {
      evidenceRef.current = await activeTime.flush();
    }
    const previous = evidenceRef.current;
    const mergedDuration = options?.skipActiveTimeFlush
      ? previous?.activeDurationMs ?? 0
      : Math.max(previous?.activeDurationMs ?? 0, activeTime.duration());
    const candidate = makeEvidence({ activeDurationMs: mergedDuration, ...patch });
    if (options?.clearMistakeReason) {
      delete candidate.mistakeReason;
    }
    evidenceRef.current = await storage.reviewRepository.savePracticeEvidence(candidate, previous?.revision ?? 0);
  }

  const saveMistakeReason = async (nextReason: MistakeReason | null) => {
    if (writeBlocked || evidenceLock.current) return;
    const questionId = question.id;
    const pendingNote = mistakeNoteDrafts[questionId];
    evidenceLock.current = true;
    setMistakeBusy(true);
    setMistakeJustSaved((prev) => ({ ...prev, [questionId]: false }));
    const task = runPageAction('保存错因', async () => {
      await persistEvidence(
        {
          ...(nextReason ? { mistakeReason: nextReason } : {}),
          ...(pendingNote !== undefined ? { mistakeNote: pendingNote } : {}),
        },
        { clearMistakeReason: !nextReason, skipActiveTimeFlush: true },
      );
      setMistakeDrafts((drafts) => ({ ...drafts, [questionId]: nextReason ?? '' }));
      setMistakeSkipped((skipped) => ({ ...skipped, [questionId]: false }));
      setMistakeJustSaved((prev) => ({ ...prev, [questionId]: true }));
    }).finally(() => {
      setMistakeBusy(false);
      evidenceLock.current = false;
      mistakeSavePromise.current = null;
    });
    mistakeSavePromise.current = task;
    await task;
  };

  const saveMistakeNote = async () => {
    const questionId = question.id;
    const drafted = mistakeNoteDrafts[questionId];
    if (drafted === undefined) return;
    const baseline = savedEvidence?.mistakeNote ?? evidenceRef.current?.mistakeNote ?? '';
    if (drafted === baseline) {
      setMistakeNoteDrafts((drafts) => {
        const next = { ...drafts };
        delete next[questionId];
        return next;
      });
      return;
    }
    if (writeBlocked || evidenceLock.current) return;
    evidenceLock.current = true;
    setMistakeBusy(true);
    setMistakeJustSaved((prev) => ({ ...prev, [questionId]: false }));
    const task = runPageAction('保存错因笔记', async () => {
      await persistEvidence({ mistakeNote: drafted }, { skipActiveTimeFlush: true });
      setMistakeSkipped((skipped) => ({ ...skipped, [questionId]: false }));
      setMistakeJustSaved((prev) => ({ ...prev, [questionId]: true }));
    }).finally(() => {
      setMistakeBusy(false);
      evidenceLock.current = false;
      mistakeSavePromise.current = null;
    });
    mistakeSavePromise.current = task;
    await task;
  };

  const showHint = async () => {
    if (evidenceLock.current) return;
    evidenceLock.current = true;
    setEvidenceBusy(true);
    await runPageAction('保存提示使用记录', async () => {
      const next = Math.min(question.hints.length, hintCount + 1);
      await persistEvidence({ hintsUsed: next });
      setHintCounts((counts) => ({ ...counts, [question.id]: next }));
    });
    setEvidenceBusy(false);
    evidenceLock.current = false;
  };

  const evaluation = availability.practice && question.kind === 'single-choice' && response
    ? evaluateResponse(question, response)
    : null;
  const questionProgress = progress.get(question.id);
  const latestAttempt = [...attempts].reverse().find((attempt) => attempt.sessionId === session.id && attempt.questionId === question.id);
  const questionPages = question.source.question.pages;
  const answerPages = question.source.answer.pages;
  const pack = packs.find((candidate) => candidate.year === question.year);
  const comprehensiveResponse = response?.type === 'comprehensive' ? response : { type: 'comprehensive' as const, text: '', checkedRubricIds: [] };
  const selfScoreDraft = selfScoreDrafts[question.id]
    ?? (comprehensiveResponse.selfScore === undefined ? '' : String(comprehensiveResponse.selfScore));
  const parsedSelfScore = selfScoreDraft === '' ? undefined : Number(selfScoreDraft);
  const selfScoreIsValid = question.answer.type === 'comprehensive'
    && parsedSelfScore !== undefined
    && Number.isFinite(parsedSelfScore)
    && parsedSelfScore >= 0
    && parsedSelfScore <= question.answer.maxScore;
  const selfScoreIsInvalid = question.answer.type === 'comprehensive'
    && selfScoreDraft !== ''
    && !selfScoreIsValid;
  const selfScoreErrorId = `self-score-error-${question.id}`;

  const canSubmit = Boolean(
    !submitted
    && availability.practice
    && !evidenceBusy
    && !submitting
    && pendingResponseWrites === 0
    && !saveError
    && !writeBlocked
    && response
    && !(question.kind === 'comprehensive' && showReference && !selfScoreIsValid),
  );
  const canKeyboardSubmit = Boolean(
    !submitted
    && availability.practice
    && !evidenceBusy
    && !submitting
    && !saveError
    && !writeBlocked
    && response
    && !(question.kind === 'comprehensive' && showReference && !selfScoreIsValid),
  );
  const hasNext = session.currentIndex < session.questionIds.length - 1;
  const showMistakeEntry = Boolean(
    submitted
    && (
      (question.kind === 'single-choice' && evaluation?.correct === false)
      || (
        question.kind === 'comprehensive'
        && question.answer.type === 'comprehensive'
        && latestAttempt?.score !== null
        && latestAttempt?.score !== undefined
        && latestAttempt.score < question.answer.maxScore
      )
    ),
  );
  const currentMistakeReason: MistakeReason | '' = mistakeDrafts[question.id] !== undefined
    ? mistakeDrafts[question.id]!
    : savedEvidence?.mistakeReason ?? '';
  const currentMistakeNote = mistakeNoteDrafts[question.id] !== undefined
    ? mistakeNoteDrafts[question.id]!
    : savedEvidence?.mistakeNote ?? '';
  const hasImageOptions = Boolean(
    question.kind === 'single-choice'
    && question.options?.some((option) => option.content.some((block) => block.type === 'image')),
  );

  const updateSelfScore = (rawScore: string) => {
    if (question.answer.type !== 'comprehensive') return;
    setSelfScoreDrafts((drafts) => ({ ...drafts, [question.id]: rawScore }));
    if (rawScore === '') {
      const clearedResponse = { ...comprehensiveResponse };
      delete clearedResponse.selfScore;
      persistResponse(clearedResponse);
      return;
    }
    const nextScore = Number(rawScore);
    if (!Number.isFinite(nextScore) || nextScore < 0 || nextScore > question.answer.maxScore) return;
    persistResponse({ ...comprehensiveResponse, selfScore: nextScore });
  };

  const subjectLabel = question.subject === 'data-structures'
    ? '数据结构'
    : question.subject === 'computer-organization'
      ? '组成原理'
      : question.subject === 'operating-systems'
        ? '操作系统'
        : '计算机网络';

  return (
    <div className="practice-shell rl-practice">
      <header className="practice-topbar rl-topbar">
        <button type="button" className="icon-command rl-icon-btn" onClick={() => navigate('/questions')} title="退出练习" aria-label="退出练习">
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <div className="rl-topbar-meta">
          <span>{question.year} 全国统考</span>
          <strong>第 {question.number} 题 <small>/ {session.questionIds.length}</small></strong>
        </div>
        <div className="practice-progress rl-progress" aria-hidden="true">
          <span style={{ width: `${((session.currentIndex + 1) / session.questionIds.length) * 100}%` }} />
        </div>
        <button
          type="button"
          className="secondary-command compact-command rl-secondary-btn rl-finish-btn"
          disabled={Boolean(saveError) || writeBlocked}
          onClick={() => void finish()}
        >
          <Flag size={15} aria-hidden="true" />
          <span>结束</span>
        </button>
      </header>

      <aside className="question-palette rl-palette" aria-label="答题卡">
        <div className="palette-heading rl-palette-heading">
          <span>答题卡</span>
          <strong>{session.submittedQuestionIds.length}/{session.questionIds.length}</strong>
        </div>
        <div className="palette-grid rl-palette-grid">
          {session.questionIds.map((id, index) => {
            const paletteQuestion = questionsById.get(id);
            const itemProgress = paletteQuestion ? currentProgress.get(paletteQuestion.id) : undefined;
            const isCurrent = index === session.currentIndex;
            const isSubmitted = session.submittedQuestionIds.includes(id);
            const stateClass = isSubmitted ? (itemProgress?.lastCorrect === false ? 'wrong' : 'done') : '';
            return (
              <button
                key={id}
                type="button"
                disabled={Boolean(saveError) || writeBlocked}
                aria-current={isCurrent ? 'step' : undefined}
                className={`${isCurrent ? 'current' : ''} ${stateClass}`.trim()}
                onClick={(event) => void goTo(index, event.timeStamp)}
                title={`第 ${paletteQuestion?.number ?? index + 1} 题`}
              >
                {paletteQuestion?.number ?? index + 1}
              </button>
            );
          })}
        </div>
        <div className="palette-legend rl-palette-legend">
          <span><i className="done" />已答</span>
          <span><i className="wrong" />错题</span>
        </div>
      </aside>

      <main className="question-workspace rl-workspace">
        <div className="rl-reading-col" onClick={handleImageClickDelegation}>
          {sessionConflict && (
            <div className="review-warning rl-banner" role="alert">
              <TriangleAlert size={17} aria-hidden="true" />
              <span>
                另一标签页已更新此练习。本页草稿仍保留，但当前页面已停止写入，不会覆盖最新进度。
                {conflictRecoveryError && ` ${conflictRecoveryError}`}
              </span>
              <button
                type="button"
                className="secondary-command rl-secondary-btn"
                disabled={recoveringConflict || pendingResponseWrites > 0}
                onClick={() => void reloadSessionConflict()}
              >
                {recoveringConflict ? '读取中' : '重新读取最新进度'}
              </button>
            </div>
          )}
          {sessionClosed && !sessionConflict && (
            <div className="review-warning rl-banner" role="alert">
              <TriangleAlert size={17} aria-hidden="true" />
              <span>练习已结束。本页未提交草稿仅供查看，不会再写回练习进度。</span>
              <div className="command-row">
                <button type="button" className="primary-command rl-primary-btn" onClick={() => navigate('/stats')}>查看统计</button>
                <button type="button" className="secondary-command rl-secondary-btn" onClick={returnToQuestions}>返回真题</button>
              </div>
            </div>
          )}
          {saveError && !sessionConflict && (
            <div className="review-warning rl-banner" role="alert">
              <TriangleAlert size={17} aria-hidden="true" />
              <span>{saveError}。草稿仍保留在本页，可继续修改，或重试保存后再跳题、提交。</span>
              <button type="button" className="secondary-command rl-secondary-btn" onClick={retryResponseSave}>重试保存</button>
            </div>
          )}
          {actionError && !saveError && !sessionConflict && (
            <div className="review-warning rl-banner" role="alert">
              <TriangleAlert size={17} aria-hidden="true" />
              <span>{actionError}。当前内容仍保留，可以再次执行该操作。</span>
            </div>
          )}

          <div className="question-title-row rl-question-header">
            <div className="question-badges rl-badges">
              <span className="rl-subject-badge"><SubjectShape subject={question.subject} /><span>{subjectLabel}</span></span>
              <span>{question.kind === 'single-choice' ? '单项选择' : '综合应用'}</span>
            </div>
            <div className="rl-header-actions">
              <button
                type="button"
                className="secondary-command rl-secondary-btn rl-mobile-head-btn"
                onClick={(event) => {
                  lastSourceTriggerRef.current = event.currentTarget;
                  setSourceOpen(true);
                }}
              >
                <FileScan size={14} aria-hidden="true" />
                <span>原卷</span>
              </button>
              <button
                type="button"
                className="secondary-command rl-secondary-btn rl-mobile-head-btn"
                onClick={() => {
                  const target = noteTextareaRef.current;
                  if (!target) return;
                  try {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } catch {
                    target.scrollIntoView();
                  }
                  target.focus({ preventScroll: true });
                }}
              >
                <NotebookPen size={14} aria-hidden="true" />
                <span>笔记</span>
              </button>
              <button
                type="button"
                className={`icon-command rl-icon-btn ${collections.has(question.id) ? 'selected' : ''}`}
                onClick={() => void runPageAction('更新收藏', () => toggleCollection(question.id))}
                title={collections.has(question.id) ? '取消收藏' : '收藏'}
                aria-label={collections.has(question.id) ? '取消收藏' : '收藏'}
                aria-pressed={collections.has(question.id)}
              >
                <Bookmark size={18} fill={collections.has(question.id) ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            </div>
          </div>

          <section className="question-body rl-stem rl-reading">
            <span className="question-index rl-question-num">{String(question.number).padStart(2, '0')}</span>
            <div className="rl-stem-content">
              <LazyContentRenderer blocks={question.stem} />
            </div>
          </section>

          {!availability.practice && (
            <p className="rl-unavailable-note" role="status">
              本题暂停练习：{availability.reasons.join('；')}。原作答和笔记保留，可以查看来源或跳到下一题。
            </p>
          )}

          {question.kind === 'single-choice' && question.options && (
            <>
              <section
                className={hasImageOptions ? 'option-list rl-options has-image-options' : 'option-list rl-options'}
                aria-label="答案选项"
                aria-busy={pendingResponseWrites > 0}
              >
                {question.options.map((option, index) => {
                  const selected = response?.type === 'choice' && response.optionId === option.id;
                  const correct = submitted && question.answer.type === 'choice' && question.answer.optionId === option.id;
                  const wrong = submitted && selected && !correct;
                  const optionHasImage = option.content.some((block) => block.type === 'image');
                  const optionClasses = [
                    'rl-option',
                    optionHasImage ? 'has-option-image' : '',
                    selected ? 'selected' : '',
                    correct ? 'correct' : '',
                    wrong ? 'incorrect' : '',
                  ].filter(Boolean).join(' ');
                  const cellPlacement = hasImageOptions ? { gridRow: index + 1, gridColumn: 1 } : undefined;
                  return (
                    <button
                      key={option.id}
                      ref={(node) => { optionButtonRefs.current[option.id] = node; }}
                      type="button"
                      style={cellPlacement}
                      aria-pressed={selected}
                      aria-keyshortcuts={submitted ? undefined : option.id}
                      disabled={submitted || answerBlocked}
                      className={optionClasses}
                      onClick={() => persistResponse({ type: 'choice', optionId: option.id })}
                    >
                      <span className="rl-option-key" aria-hidden="true">{option.id}</span>
                      <div className="rl-option-body rl-reading">
                        <LazyContentRenderer blocks={option.content} compact />
                      </div>
                      {(correct || wrong || (!submitted && selected)) && (
                        <div className="rl-option-state">
                          {correct && (
                            <span className="rl-state-tag is-correct">
                              <Check size={15} aria-hidden="true" />
                              <span>{selected ? '已选 · 正确' : '正确'}</span>
                            </span>
                          )}
                          {wrong && (
                            <span className="rl-state-tag is-wrong">
                              <X size={15} aria-hidden="true" />
                              <span>所选有误</span>
                            </span>
                          )}
                          {!submitted && selected && (
                            <span className="rl-state-tag is-selected">
                              <Check size={15} aria-hidden="true" />
                              <span>已选</span>
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
                {hasImageOptions && question.options.map((option, index) => {
                  if (!option.content.some((block) => block.type === 'image')) return null;
                  return (
                    <div
                      key={`zoom-${option.id}`}
                      className={submitted ? 'rl-option-zoom-slot is-post-submit' : 'rl-option-zoom-slot'}
                      style={{ gridRow: index + 1, gridColumn: 1 }}
                      onClick={submitted ? (event) => {
                        if (event.target instanceof HTMLElement && event.target.closest('button')) return;
                        const zoomBtn = event.currentTarget.querySelector<HTMLElement>('button');
                        openOptionImageLightbox(option.id, zoomBtn);
                      } : undefined}
                    >
                      <button
                        type="button"
                        className="rl-option-zoom-btn"
                        aria-label={`放大选项 ${option.id} 题图`}
                        title={`放大选项 ${option.id} 题图`}
                        onClick={(event) => openOptionImageLightbox(option.id, event.currentTarget)}
                      >
                        <ZoomIn size={14} aria-hidden="true" />
                        <span>放大</span>
                      </button>
                    </div>
                  );
                })}
              </section>
              {!submitted && availability.practice && (
                <p className="rl-shortcut-hint">快捷键：A–D 选择选项 · Enter 提交答案</p>
              )}
            </>
          )}

          {question.kind === 'comprehensive' && (
            <section className="comprehensive-response rl-comprehensive">
              <label htmlFor="response-text">作答草稿</label>
              <textarea
                id="response-text"
                value={comprehensiveResponse.text}
                disabled={submitted || answerBlocked}
                onChange={(event) => persistResponse({ ...comprehensiveResponse, text: event.target.value })}
              />
              {showReference && !submitted && question.answer.type === 'comprehensive' && (
                <>
                  <label className="score-field rl-score-field">
                    自评分
                    <input
                      type="number"
                      min="0"
                      max={question.answer.maxScore}
                      value={selfScoreDraft}
                      disabled={answerBlocked}
                      aria-invalid={selfScoreIsInvalid}
                      aria-describedby={selfScoreIsInvalid ? selfScoreErrorId : undefined}
                      onChange={(event) => updateSelfScore(event.target.value)}
                    />
                    <span>/ {question.answer.maxScore}</span>
                  </label>
                  {selfScoreIsInvalid && (
                    <span id={selfScoreErrorId} className="score-error rl-score-error" role="alert">
                      请输入 0 到 {question.answer.maxScore} 之间的分数。
                    </span>
                  )}
                </>
              )}
            </section>
          )}

          {!submitted && availability.practice && (
            <div className={question.hints.length > 0 ? 'answer-actions rl-actions' : 'answer-actions rl-actions is-single'}>
              {question.hints.length > 0 && (
                <button
                  type="button"
                  className="hint-command rl-hint-btn"
                  disabled={evidenceBusy || hintCount >= question.hints.length}
                  onClick={() => void showHint()}
                >
                  <Lightbulb size={16} aria-hidden="true" />
                  {`提示 ${hintCount}/${question.hints.length}`}
                </button>
              )}
              <button
                type="button"
                className="primary-command rl-primary-btn"
                disabled={!canSubmit}
                onClick={(event) => void submit(event.timeStamp)}
              >
                {submitting || pendingResponseWrites > 0 ? '保存中' : question.kind === 'comprehensive' ? showReference ? '完成自评' : '查看参考答案' : '提交答案'}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {hintCount > 0 && (
            <section className="hint-panel rl-hint-panel rl-reading" aria-label="解题提示">
              {question.hints.slice(0, hintCount).map((hint, index) => (
                <div key={index} className="rl-hint-item">
                  <span className="rl-hint-index">{index + 1}</span>
                  <div className="rl-hint-body">
                    <LazyContentRenderer blocks={hint} compact />
                  </div>
                </div>
              ))}
            </section>
          )}

          {(submitted || showReference) && (
            <section className="answer-panel rl-answer-panel rl-reading" aria-label="答案与解析">
              <div
                ref={answerStatusRef}
                className="answer-status rl-answer-status"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                tabIndex={-1}
              >
                {question.kind === 'single-choice' ? (
                  <strong className={evaluation?.correct ? 'correct-text rl-status-ok' : 'incorrect-text rl-status-wrong'}>
                    {evaluation?.correct ? <Check size={17} aria-hidden="true" /> : <X size={17} aria-hidden="true" />}
                    <span>{evaluation?.correct ? '回答正确' : '回答错误'}</span>
                  </strong>
                ) : (
                  <strong className="rl-status-ref">参考答案</strong>
                )}
                {question.answer.type === 'choice' && <span className="rl-answer-meta">正确选项 {question.answer.optionId}</span>}
                {latestAttempt?.score !== null && latestAttempt?.score !== undefined && question.kind === 'comprehensive' && (
                  <span className="rl-answer-meta">自评 {latestAttempt.score} 分</span>
                )}
              </div>

              {showMistakeEntry && (
                <PracticeMistakePanel
                  value={currentMistakeReason}
                  noteValue={currentMistakeNote}
                  busy={mistakeBusy}
                  disabled={writeBlocked}
                  skipped={Boolean(mistakeSkipped[question.id])}
                  justSaved={Boolean(mistakeJustSaved[question.id])}
                  onSelect={(reason) => void saveMistakeReason(reason)}
                  onNoteChange={(next) => {
                    setMistakeJustSaved((prev) => ({ ...prev, [question.id]: false }));
                    setMistakeNoteDrafts((drafts) => ({ ...drafts, [question.id]: next }));
                  }}
                  onNoteCommit={() => void saveMistakeNote()}
                  onSkip={() => setMistakeSkipped((prev) => ({ ...prev, [question.id]: true }))}
                  onReopen={() => setMistakeSkipped((prev) => ({ ...prev, [question.id]: false }))}
                />
              )}

              {question.answer.type === 'comprehensive' && (
                <div className="rl-reference-body">
                  <LazyContentRenderer blocks={question.answer.reference} />
                </div>
              )}

              {!availability.explanationMissing && question.explanation.map((section) => (
                <div className="explanation-section rl-explanation-section" key={section.id}>
                  <h3>{section.title}</h3>
                  <LazyContentRenderer blocks={section.content} />
                </div>
              ))}

              {availability.explanationMissing && (
                <div className="rl-explanation-missing-bar">
                  <p className="rl-explanation-missing">本题文字解析缺失，请通过“来源页”查看原始答案资料。</p>
                  <button
                    type="button"
                    className="secondary-command rl-secondary-btn rl-inline-source-btn"
                    onClick={(event) => {
                      lastSourceTriggerRef.current = event.currentTarget;
                      setSourceOpen(true);
                    }}
                  >
                    <FileScan size={15} aria-hidden="true" />
                    <span>查看来源扫描页</span>
                  </button>
                </div>
              )}

              <QuestionSupplement question={question} />
              <PracticeConceptBridge
                question={question}
                onOpenLab={(destination) => {
                  rememberPracticeLabReturn(session.id);
                  navigate(destination);
                }}
              />
            </section>
          )}

          <footer className="question-navigation rl-nav-footer">
            <button
              type="button"
              className="secondary-command rl-secondary-btn"
              disabled={session.currentIndex === 0 || Boolean(saveError) || writeBlocked}
              onClick={(event) => void goTo(session.currentIndex - 1, event.timeStamp)}
            >
              <ChevronLeft size={17} aria-hidden="true" />
              上一题
            </button>
            <span className="rl-nav-count">{session.currentIndex + 1} / {session.questionIds.length}</span>
            {hasNext ? (
              <button
                type="button"
                className={submitted ? 'primary-command rl-primary-btn' : 'secondary-command rl-secondary-btn'}
                disabled={Boolean(saveError) || writeBlocked}
                onClick={(event) => void goTo(session.currentIndex + 1, event.timeStamp)}
              >
                下一题
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            ) : sessionClosed ? (
              <button type="button" className="primary-command rl-primary-btn" disabled>练习已结束</button>
            ) : (
              <button
                type="button"
                className={submitted ? 'primary-command rl-primary-btn' : 'secondary-command rl-secondary-btn'}
                disabled={Boolean(saveError) || sessionConflict}
                onClick={() => void finish()}
              >
                本轮总结
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </footer>
        </div>
      </main>

      <aside className="study-tools rl-tools" aria-label="学习工具">
        {labLink && (
          <section className="rl-tool-section">
            <div className="tool-heading rl-tool-heading"><FlaskConical size={16} aria-hidden="true" /><h2>可视化实验</h2></div>
            <button
              type="button"
              className="source-button rl-tool-btn"
              onClick={() => {
                rememberPracticeLabReturn(session.id);
                navigate(labLink.destination);
              }}
            >
              <span>{labLink.label}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </section>
        )}
        <section className="rl-tool-section">
          <div className="tool-heading rl-tool-heading"><FileScan size={16} aria-hidden="true" /><h2>来源</h2></div>
          <details className="rl-version-details">
            <summary>内容版本与审核信息</summary>
            <p>{question.contentVersion} · {question.reviewStatus}</p>
          </details>
          <button
            type="button"
            ref={sourceTriggerRef}
            className="source-button rl-tool-btn"
            onClick={(event) => {
              lastSourceTriggerRef.current = event.currentTarget;
              setSourceOpen(true);
            }}
          >
            <span>原卷第 {questionPages.join('、')} 页</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <small>{question.source.question.publisher}</small>
        </section>
        <section className="rl-tool-section">
          <div className="tool-heading rl-tool-heading"><NotebookPen size={16} aria-hidden="true" /><h2>笔记</h2></div>
          <textarea
            ref={noteTextareaRef}
            value={noteBody}
            placeholder="记录易错点"
            onChange={(event) => {
              if (!noteVersions.current.has(question.id)) noteVersions.current.set(question.id, notes.get(question.id)?.updatedAt ?? null);
              setNoteDrafts((drafts) => ({ ...drafts, [question.id]: event.target.value }));
            }}
            onBlur={() => {
              if (!noteVersions.current.has(question.id)) return;
              void runPageAction('保存笔记', async () => {
                await saveNote(question.id, noteBody, noteVersions.current.get(question.id)!);
                noteVersions.current.delete(question.id);
                setNoteDrafts((drafts) => { const next = { ...drafts }; delete next[question.id]; return next; });
              });
            }}
          />
          <span className="autosave-label rl-autosave"><Save size={13} aria-hidden="true" />失焦保存</span>
        </section>
        <section className="rl-tool-section">
          <div className="tool-heading rl-tool-heading"><Check size={16} aria-hidden="true" /><h2>掌握度</h2></div>
          <div className="mastery-control rl-mastery">
            {masteryOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={questionProgress?.mastery === option.value}
                className={questionProgress?.mastery === option.value ? 'active' : ''}
                onClick={() => void runPageAction('更新掌握度', () => setMastery(question.id, option.value))}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </aside>

      {sourceOpen && (
        <div ref={sourceDialogRef} className="source-modal rl-source-modal" role="dialog" aria-modal="true" aria-label="来源页">
          <div className="source-modal-header rl-source-modal-header">
            <div>
              <span>第 {question.number} 题</span>
              <strong>来源页核对（点击图片可放大）</strong>
            </div>
            <button ref={sourceCloseRef} type="button" className="icon-command rl-icon-btn" onClick={() => setSourceOpen(false)} title="关闭" aria-label="关闭">
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          <div className="source-tabs-label rl-source-tabs"><span>原卷</span><span>解析</span></div>
          <div className="source-pages rl-source-pages" onClick={handleImageClickDelegation}>
            <div data-source-label="原卷">
              {pack
                ? questionPages.map((page) => (
                  <SourcePageImage
                    key={`q-${page}`}
                    packId={pack.id}
                    document="questions"
                    page={page}
                    alt={`${question.year} 真题第 ${page} 页`}
                    loading="lazy"
                    className="rl-zoomable-img"
                    title="点击放大查看"
                  />
                ))
                : <p className="warning-text" role="alert">未找到 {question.year} 来源题包。</p>}
            </div>
            <div data-source-label="解析">
              {pack
                ? answerPages.map((page) => (
                  <SourcePageImage
                    key={`a-${page}`}
                    packId={pack.id}
                    document="answers"
                    page={page}
                    alt={`${question.year} 解析第 ${page} 页`}
                    loading="lazy"
                    className="rl-zoomable-img"
                    title="点击放大查看"
                  />
                ))
                : <p className="warning-text" role="alert">未找到 {question.year} 来源题包。</p>}
            </div>
          </div>
        </div>
      )}

      <PracticeKeyboardShortcuts
        enabled={!sourceOpen && !lightboxImage}
        submitted={submitted}
        answerBlocked={answerBlocked}
        writeBlocked={writeBlocked}
        saveError={saveError}
        canSubmit={canKeyboardSubmit}
        hasNext={hasNext}
        options={question.options}
        isSingleChoice={question.kind === 'single-choice'}
        onSelectChoice={(optionId) => persistResponse({ type: 'choice', optionId })}
        onSubmit={(timeStamp) => { void submit(timeStamp); }}
        onNext={(timeStamp) => { void goTo(session.currentIndex + 1, timeStamp); }}
      />

      <ReadingImageLightbox
        image={lightboxImage}
        onClose={closeLightbox}
        getRestoreFocusTarget={getLightboxRestoreTarget}
      />
    </div>
  );
}
