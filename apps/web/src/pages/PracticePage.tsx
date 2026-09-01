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
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { evaluateResponse, type Mastery, type StudySession, type UserResponse } from '@408os/domain';
import { StudySessionConflictError, studySessionVersionIssue } from '@408os/storage';
import { useStudy } from '../app/StudyContext';
import { questionLabLink } from '../app/lab-links';
import { LazyContentRenderer } from '../components/LazyContentRenderer';
import { SourcePageImage } from '../components/SourcePageImage';

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
    <section className="fatal-state" role="alert">
      <TriangleAlert size={28} />
      <h1>无法恢复练习</h1>
      <p>{message}</p>
      <div className="command-row">
        {retry && <button className="primary-command" onClick={retry}>重新读取</button>}
        <button className="secondary-command" onClick={onReturn}>返回真题</button>
      </div>
    </section>
  );
}

export function PracticePage() {
  const { sessionId } = useParams();
  return <PracticeSession key={sessionId ?? 'missing'} sessionId={sessionId} />;
}

function PracticeSession({ sessionId }: { sessionId: string | undefined }) {
  const navigate = useNavigate();
  const {
    packs,
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
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingResponseWrites, setPendingResponseWrites] = useState(0);
  const startedAt = useRef(new Map<string, number>());
  const responseSaveQueue = useRef<Promise<StudySession> | null>(null);
  const persistedSession = useRef<StudySession | null>(null);
  const responseSaveFailure = useRef<Error | null>(null);
  const answerStatusRef = useRef<HTMLDivElement | null>(null);
  const sourceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sourceDialogRef = useRef<HTMLDivElement | null>(null);
  const sourceCloseRef = useRef<HTMLButtonElement | null>(null);
  const previousQuestionId = useRef<string | null>(null);
  const previousSubmitted = useRef(false);
  const loadKey = `${sessionId ?? 'missing'}:${loadRevision}`;
  const questionsById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const question = session ? questionsById.get(session.questionIds[session.currentIndex] ?? '') : undefined;
  const labLink = questionLabLink(question?.id);
  const submitted = Boolean(question && session?.submittedQuestionIds.includes(question.id));
  const response = question ? responseDrafts[question.id] ?? session?.responses[question.id] ?? null : null;
  const hintCount = question ? hintCounts[question.id] ?? 0 : 0;
  const showReference = Boolean(question && (submitted || revealedQuestionIds.has(question.id)));
  const noteBody = question ? noteDrafts[question.id] ?? notes.get(question.id)?.body ?? '' : '';

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
    const trigger = sourceTriggerRef.current;
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

  const retryLoad = () => setLoadRevision((revision) => revision + 1);
  const returnToQuestions = () => navigate('/questions');

  if (!sessionId) {
    return <PracticeFailure message="当前地址没有练习会话编号。" onReturn={returnToQuestions} />;
  }

  if (resolvedLoadKey !== loadKey) {
    return <div className="practice-loading"><span className="loader" /><p>恢复练习会话</p></div>;
  }

  if (loadError) {
    return <PracticeFailure message={loadError} retry={retryLoad} onReturn={returnToQuestions} />;
  }

  if (!session) {
    return <div className="practice-loading"><span className="loader" /><p>恢复练习会话</p></div>;
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
      persistedSession.current = latest;
      responseSaveQueue.current = Promise.resolve(latest);
      responseSaveFailure.current = null;
      setSession(latest);
      setSourceOpen(false);
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
    if (writeBlocked) return;
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
    if (!response || submitting || writeBlocked) return;
    if (question.kind === 'comprehensive' && !showReference) {
      setRevealedQuestionIds((ids) => new Set(ids).add(question.id));
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const currentSession = await flushResponses();
      const questionStartedAt = startedAt.current.get(question.id) ?? selectedAt;
      const updated = await submitResponse(currentSession, question, response, Math.max(1000, selectedAt - questionStartedAt));
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
    }
  };

  const goTo = async (index: number, selectedAt: number) => {
    if (writeBlocked) return;
    setActionError(null);
    try {
      const currentSession = await flushResponses();
      const updated = await moveSession(currentSession, index);
      const questionId = updated.questionIds[updated.currentIndex];
      if (questionId) startedAt.current.set(questionId, selectedAt);
      persistedSession.current = updated;
      responseSaveQueue.current = Promise.resolve(updated);
      setSourceOpen(false);
      setSession(updated);
    } catch (reason) {
      if (!enterSessionConflict(reason)) {
        setActionError(`切换题目失败：${errorMessage(reason, '请稍后重试')}`);
      }
    }
  };

  const finish = async () => {
    if (writeBlocked) return;
    setActionError(null);
    try {
      const currentSession = await flushResponses();
      await finishSession(currentSession);
      navigate('/stats');
    } catch (reason) {
      if (!enterSessionConflict(reason)) {
        setActionError(`结束练习失败：${errorMessage(reason, '请稍后重试')}`);
      }
    }
  };

  const evaluation = question.kind === 'single-choice' && response
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

  return (
    <div className="practice-shell">
      <header className="practice-topbar">
        <button className="icon-command" onClick={() => navigate('/questions')} title="退出练习" aria-label="退出练习"><ArrowLeft size={19} /></button>
        <div><span>2009 全国统考</span><strong>第 {question.number} 题 <small>/ {session.questionIds.length}</small></strong></div>
        <div className="practice-progress"><span style={{ width: `${((session.currentIndex + 1) / session.questionIds.length) * 100}%` }} /></div>
        <button className="secondary-command compact-command" disabled={Boolean(saveError) || writeBlocked} onClick={() => void finish()}><Flag size={16} />结束</button>
      </header>

      <aside className="question-palette">
        <div className="palette-heading"><span>答题卡</span><strong>{session.submittedQuestionIds.length}/{session.questionIds.length}</strong></div>
        <div className="palette-grid">
          {session.questionIds.map((id, index) => {
            const paletteQuestion = questionsById.get(id);
            const itemProgress = paletteQuestion ? currentProgress.get(paletteQuestion.id) : undefined;
            return <button key={id} disabled={Boolean(saveError) || writeBlocked} className={`${index === session.currentIndex ? 'current' : ''} ${session.submittedQuestionIds.includes(id) ? itemProgress?.lastCorrect === false ? 'wrong' : 'done' : ''}`} onClick={(event) => void goTo(index, event.timeStamp)} title={`第 ${paletteQuestion?.number ?? index + 1} 题`}>{paletteQuestion?.number ?? index + 1}</button>;
          })}
        </div>
        <div className="palette-legend"><span><i className="done" />已答</span><span><i className="wrong" />错题</span></div>
      </aside>

      <main className="question-workspace">
        {sessionConflict && (
          <div className="review-warning" role="alert">
            <TriangleAlert size={17} />
            <span>
              另一标签页已更新此练习。本页草稿仍保留，但当前页面已停止写入，不会覆盖最新进度。
              {conflictRecoveryError && ` ${conflictRecoveryError}`}
            </span>
            <button
              className="secondary-command"
              disabled={recoveringConflict || pendingResponseWrites > 0}
              onClick={() => void reloadSessionConflict()}
            >
              {recoveringConflict ? '读取中' : '重新读取最新进度'}
            </button>
          </div>
        )}
        {sessionClosed && !sessionConflict && (
          <div className="review-warning" role="alert">
            <TriangleAlert size={17} />
            <span>练习已结束。本页未提交草稿仅供查看，不会再写回练习进度。</span>
            <div className="command-row">
              <button className="primary-command" onClick={() => navigate('/stats')}>查看统计</button>
              <button className="secondary-command" onClick={returnToQuestions}>返回真题</button>
            </div>
          </div>
        )}
        {saveError && !sessionConflict && (
          <div className="review-warning" role="alert">
            <TriangleAlert size={17} />
            <span>{saveError}。草稿仍保留在本页，可继续修改，或重试保存后再跳题、提交。</span>
            <button className="secondary-command" onClick={retryResponseSave}>重试保存</button>
          </div>
        )}
        {actionError && !saveError && !sessionConflict && (
          <div className="review-warning" role="alert">
            <TriangleAlert size={17} />
            <span>{actionError}。当前内容仍保留，可以再次执行该操作。</span>
          </div>
        )}
        <div className="question-title-row">
          <div className="question-badges"><span>{question.subject === 'data-structures' ? '数据结构' : question.subject === 'computer-organization' ? '组成原理' : question.subject === 'operating-systems' ? '操作系统' : '计算机网络'}</span><span>{question.kind === 'single-choice' ? '单项选择' : '综合应用'}</span><span className="draft-badge">{question.reviewStatus}</span></div>
          <button className={`icon-command ${collections.has(question.id) ? 'selected' : ''}`} onClick={() => void runPageAction('更新收藏', () => toggleCollection(question.id))} title={collections.has(question.id) ? '取消收藏' : '收藏'} aria-label={collections.has(question.id) ? '取消收藏' : '收藏'}><Bookmark size={19} fill={collections.has(question.id) ? 'currentColor' : 'none'} /></button>
        </div>

        <section className="question-body">
          <span className="question-index">{String(question.number).padStart(2, '0')}</span>
          <LazyContentRenderer blocks={question.stem} />
        </section>

        {question.kind === 'single-choice' && question.options && (
        <section className="option-list" aria-label="答案选项" aria-busy={pendingResponseWrites > 0}>
            {question.options.map((option) => {
              const selected = response?.type === 'choice' && response.optionId === option.id;
              const correct = submitted && question.answer.type === 'choice' && question.answer.optionId === option.id;
              const wrong = submitted && selected && !correct;
              return (
                <button key={option.id} aria-pressed={selected} disabled={submitted || writeBlocked} className={`${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'incorrect' : ''}`} onClick={() => persistResponse({ type: 'choice', optionId: option.id })}>
                  <span>{option.id}</span><LazyContentRenderer blocks={option.content} compact />{correct && <Check size={18} />}
                </button>
              );
            })}
          </section>
        )}

        {question.kind === 'comprehensive' && (
          <section className="comprehensive-response">
            <label htmlFor="response-text">作答草稿</label>
            <textarea id="response-text" value={comprehensiveResponse.text} disabled={submitted || writeBlocked} onChange={(event) => persistResponse({ ...comprehensiveResponse, text: event.target.value })} />
            {showReference && !submitted && question.answer.type === 'comprehensive' && (
              <>
                <label className="score-field">
                  自评分
                  <input
                    type="number"
                    min="0"
                    max={question.answer.maxScore}
                    value={selfScoreDraft}
                    disabled={writeBlocked}
                    aria-invalid={selfScoreIsInvalid}
                    aria-describedby={selfScoreIsInvalid ? selfScoreErrorId : undefined}
                    onChange={(event) => updateSelfScore(event.target.value)}
                  />
                  <span>/ {question.answer.maxScore}</span>
                </label>
                {selfScoreIsInvalid && (
                  <span id={selfScoreErrorId} className="score-error" role="alert">
                    请输入 0 到 {question.answer.maxScore} 之间的分数。
                  </span>
                )}
              </>
            )}
          </section>
        )}

        {!submitted && (
          <div className="answer-actions">
            <button className="hint-command" disabled={hintCount >= question.hints.length} onClick={() => setHintCounts((counts) => ({ ...counts, [question.id]: Math.min(question.hints.length, hintCount + 1) }))}><Lightbulb size={17} />提示 {hintCount}/{question.hints.length}</button>
            <button className="primary-command" disabled={submitting || pendingResponseWrites > 0 || Boolean(saveError) || writeBlocked || !response || (question.kind === 'comprehensive' && showReference && !selfScoreIsValid)} onClick={(event) => void submit(event.timeStamp)}>{submitting || pendingResponseWrites > 0 ? '保存中' : question.kind === 'comprehensive' ? showReference ? '完成自评' : '查看参考答案' : '提交答案'}<ArrowRight size={17} /></button>
          </div>
        )}

        {hintCount > 0 && <section className="hint-panel">{question.hints.slice(0, hintCount).map((hint, index) => <div key={index}><span>{index + 1}</span><LazyContentRenderer blocks={hint} compact /></div>)}</section>}

        {(submitted || showReference) && (
          <section className="answer-panel">
            <div ref={answerStatusRef} className="answer-status" role="status" aria-live="polite" aria-atomic="true" tabIndex={-1}>
              {question.kind === 'single-choice' ? <strong className={evaluation?.correct ? 'correct-text' : 'incorrect-text'}>{evaluation?.correct ? '回答正确' : '回答错误'}</strong> : <strong>参考答案</strong>}
              {question.answer.type === 'choice' && <span>正确选项 {question.answer.optionId}</span>}
              {latestAttempt?.score !== null && latestAttempt?.score !== undefined && question.kind === 'comprehensive' && <span>自评 {latestAttempt.score} 分</span>}
            </div>
            {question.answer.type === 'comprehensive' && <LazyContentRenderer blocks={question.answer.reference} />}
            {question.explanation.map((section) => <div className="explanation-section" key={section.id}><h3>{section.title}</h3><LazyContentRenderer blocks={section.content} /></div>)}
          </section>
        )}

        <footer className="question-navigation">
          <button className="secondary-command" disabled={session.currentIndex === 0 || Boolean(saveError) || writeBlocked} onClick={(event) => void goTo(session.currentIndex - 1, event.timeStamp)}><ChevronLeft size={17} />上一题</button>
          <span>{session.currentIndex + 1} / {session.questionIds.length}</span>
          {session.currentIndex < session.questionIds.length - 1
            ? <button className="secondary-command" disabled={Boolean(saveError) || writeBlocked} onClick={(event) => void goTo(session.currentIndex + 1, event.timeStamp)}>下一题<ChevronRight size={17} /></button>
            : sessionClosed
              ? <button className="primary-command" disabled>练习已结束</button>
              : <button className="primary-command" disabled={Boolean(saveError) || sessionConflict} onClick={() => void finish()}>查看统计<ArrowRight size={17} /></button>}
        </footer>
      </main>

      <aside className="study-tools">
        {labLink && (
          <section>
            <div className="tool-heading"><FlaskConical size={17} /><h2>可视化实验</h2></div>
            <button className="source-button" onClick={() => navigate(labLink.destination)}>
              <span>{labLink.label}</span><ArrowRight size={16} />
            </button>
          </section>
        )}
        <section>
          <div className="tool-heading"><FileScan size={17} /><h2>来源</h2></div>
          <button ref={sourceTriggerRef} className="source-button" onClick={() => setSourceOpen(true)}><span>原卷第 {questionPages.join('、')} 页</span><ArrowRight size={16} /></button>
          <small>{question.source.question.publisher}</small>
        </section>
        <section>
          <div className="tool-heading"><NotebookPen size={17} /><h2>笔记</h2></div>
          <textarea value={noteBody} placeholder="记录易错点" onChange={(event) => setNoteDrafts((drafts) => ({ ...drafts, [question.id]: event.target.value }))} onBlur={() => void runPageAction('保存笔记', () => saveNote(question.id, noteBody))} />
          <span className="autosave-label"><Save size={13} />失焦保存</span>
        </section>
        <section>
          <div className="tool-heading"><Check size={17} /><h2>掌握度</h2></div>
          <div className="mastery-control">{masteryOptions.map((option) => <button key={option.value} className={questionProgress?.mastery === option.value ? 'active' : ''} onClick={() => void runPageAction('更新掌握度', () => setMastery(question.id, option.value))}>{option.label}</button>)}</div>
        </section>
      </aside>

      {sourceOpen && (
        <div ref={sourceDialogRef} className="source-modal" role="dialog" aria-modal="true" aria-label="来源页">
          <div className="source-modal-header"><div><span>第 {question.number} 题</span><strong>来源页核对</strong></div><button ref={sourceCloseRef} className="icon-command" onClick={() => setSourceOpen(false)} title="关闭" aria-label="关闭"><X size={20} /></button></div>
          <div className="source-tabs-label"><span>原卷</span><span>解析</span></div>
          <div className="source-pages">
            <div data-source-label="原卷">
              {pack
                ? questionPages.map((page) => <SourcePageImage key={`q-${page}`} packId={pack.id} document="questions" page={page} alt={`${question.year} 真题第 ${page} 页`} loading="lazy" />)
                : <p className="warning-text" role="alert">未找到 {question.year} 来源题包。</p>}
            </div>
            <div data-source-label="解析">
              {pack
                ? answerPages.map((page) => <SourcePageImage key={`a-${page}`} packId={pack.id} document="answers" page={page} alt={`${question.year} 解析第 ${page} 页`} loading="lazy" />)
                : <p className="warning-text" role="alert">未找到 {question.year} 来源题包。</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
