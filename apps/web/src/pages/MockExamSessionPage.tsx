import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Flag,
  RefreshCw,
  RotateCcw,
  Save,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getMockExamRemainingMs,
  type Question,
  type UserResponse,
} from '@408os/domain';
import { MockExamConflictError, type MockExamBundle } from '@408os/storage';
import { createSerialWriteQueue } from '../app/serial-write-queue';
import { useStudy } from '../app/StudyContext';
import { LazyContentRenderer } from '../components/LazyContentRenderer';

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function formatRemaining(value: number): string {
  const seconds = Math.max(0, Math.ceil(value / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':');
}

function monotonicTimestamp(previous: string): string {
  const previousMs = Date.parse(previous);
  return new Date(Math.max(currentTimeMs(), Number.isFinite(previousMs) ? previousMs + 1 : 0)).toISOString();
}

function currentTimeMs(): number {
  return new Date().getTime();
}

function contentVersionIssue(bundle: MockExamBundle, questionsById: ReadonlyMap<string, Question>): string | null {
  for (const snapshot of bundle.exam.blueprint.questions) {
    const question = questionsById.get(snapshot.id);
    if (!question) return `模考试题 ${snapshot.id} 已不存在。`;
    if (
      question.contentVersion !== snapshot.contentVersion
      || question.number !== snapshot.number
      || question.kind !== snapshot.kind
    ) {
      return `模考试题 ${snapshot.id} 的题面版本已变化。`;
    }
  }
  return null;
}

function MockExamFailure({ message, retry }: { message: string; retry?: () => void }) {
  const navigate = useNavigate();
  return (
    <section className="fatal-state" role="alert">
      <TriangleAlert size={28} aria-hidden="true" />
      <h1>无法恢复模考</h1>
      <p>{message}</p>
      <div className="command-row">
        {retry && <button className="primary-command" onClick={retry}><RotateCcw size={16} aria-hidden="true" />重新读取</button>}
        <button className="secondary-command" onClick={() => navigate('/mock')}>返回模考</button>
      </div>
    </section>
  );
}

type ExternalExamUpdate =
  | { kind: 'updated'; bundle: MockExamBundle }
  | { kind: 'removed' };

export function MockExamSessionPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { questions, getMockExam, subscribeMockExam, saveMockExamDraft, submitMockExam, selfScoreMockExam } = useStudy();
  const questionsById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const [bundle, setBundle] = useState<MockExamBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorKey, setLoadErrorKey] = useState<string | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [resolvedLoadKey, setResolvedLoadKey] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, UserResponse>>({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [busy, setBusy] = useState<'save' | 'submit' | 'score' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [selfScoreDraft, setSelfScoreDraft] = useState('0');
  const [checkedRubricIds, setCheckedRubricIds] = useState<string[]>([]);
  const [syncConflict, setSyncConflict] = useState<ExternalExamUpdate | null>(null);
  const bundleRef = useRef<MockExamBundle | null>(null);
  const currentIndexRef = useRef(0);
  const draftsRef = useRef<Record<string, UserResponse>>({});
  const questionStartedAtRef = useRef(0);
  const writeQueueRef = useRef(createSerialWriteQueue());
  const submittingRef = useRef(false);
  const draftBaseUpdatedAtRef = useRef<Record<string, string>>({});
  const selfScoreDirtyRef = useRef(false);
  const localMutationAtRef = useRef<string | null>(null);
  const pendingExternalRef = useRef<ExternalExamUpdate | null>(null);
  const loadKey = `${examId ?? 'missing'}:${loadRevision}`;
  const versionIssue = bundle ? contentVersionIssue(bundle, questionsById) : null;
  const currentSnapshot = bundle?.exam.blueprint.questions[currentIndex];
  const currentQuestion = currentSnapshot ? questionsById.get(currentSnapshot.id) : undefined;
  const currentResponse = currentSnapshot
    ? drafts[currentSnapshot.id] ?? bundle?.session.responses[currentSnapshot.id]
    : undefined;
  const pendingSelfScoreId = bundle?.exam.score?.pendingSelfScoreQuestionIds[0];
  const pendingSelfScoreQuestion = pendingSelfScoreId ? questionsById.get(pendingSelfScoreId) : undefined;

  const replaceBundle = useCallback((next: MockExamBundle) => {
    const previousPending = bundleRef.current?.exam.score?.pendingSelfScoreQuestionIds[0];
    const nextPending = next.exam.score?.pendingSelfScoreQuestionIds[0];
    bundleRef.current = next;
    setBundle(next);
    if (previousPending !== nextPending) {
      selfScoreDirtyRef.current = false;
      setSelfScoreDraft('0');
      setCheckedRubricIds([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    bundleRef.current = null;
    draftsRef.current = {};
    draftBaseUpdatedAtRef.current = {};
    selfScoreDirtyRef.current = false;
    localMutationAtRef.current = null;
    pendingExternalRef.current = null;
    currentIndexRef.current = 0;
    submittingRef.current = false;
    writeQueueRef.current = createSerialWriteQueue();
    if (!examId) return () => { active = false; };

    void getMockExam(examId).then(
      (result) => {
        if (!active) return;
        if (!result) {
          setSyncConflict(null);
          setSaveNotice(null);
          setLoadError('未找到持久化模考。它可能已被清除，或已由备份恢复替换。');
          setLoadErrorKey(loadKey);
          setResolvedLoadKey(loadKey);
          return;
        }
        try {
          setSyncConflict(null);
          setSaveNotice(null);
          const nextRemaining = result.exam.status === 'in-progress'
            ? getMockExamRemainingMs(result.exam.startedAt, new Date().toISOString(), result.exam.blueprint.durationMinutes)
            : 0;
          replaceBundle(result);
          currentIndexRef.current = result.session.currentIndex;
          setCurrentIndex(result.session.currentIndex);
          questionStartedAtRef.current = currentTimeMs();
          setRemainingMs(nextRemaining);
        } catch (reason) {
          setLoadError(`读取持久化模考失败：${errorMessage(reason, '模考数据无效')}`);
          setLoadErrorKey(loadKey);
        }
        setResolvedLoadKey(loadKey);
      },
      (reason) => {
        if (!active) return;
        setSyncConflict(null);
        setSaveNotice(null);
        setLoadError(`读取持久化模考失败：${errorMessage(reason, '本地数据库暂时不可用')}`);
        setLoadErrorKey(loadKey);
        setResolvedLoadKey(loadKey);
      },
    );

    return () => { active = false; };
  }, [examId, getMockExam, loadKey, replaceBundle]);

  useEffect(() => {
    if (!examId || resolvedLoadKey !== loadKey || !bundleRef.current) return undefined;
    return subscribeMockExam(
      examId,
      (next) => {
        const current = bundleRef.current;
        if (!current || next?.exam.updatedAt === current.exam.updatedAt) return;
        if (next && next.exam.updatedAt === localMutationAtRef.current) {
          replaceBundle(next);
          return;
        }
        const external: ExternalExamUpdate = next ? { kind: 'updated', bundle: next } : { kind: 'removed' };
        const hasLocalInput = Object.keys(draftsRef.current).length > 0 || selfScoreDirtyRef.current;
        if (!next || hasLocalInput) {
          pendingExternalRef.current = external;
          setSyncConflict(external);
          setSaveNotice(null);
          setActionError(null);
          return;
        }
        replaceBundle(next);
        setActionError(null);
        setSaveNotice('已同步另一标签页的最新记录。');
      },
      (reason) => setActionError(`实时同步暂时不可用：${errorMessage(reason, '请刷新页面重试')}`),
    );
  }, [examId, loadKey, replaceBundle, resolvedLoadKey, subscribeMockExam]);

  const updateDraft = (questionId: string, response: UserResponse) => {
    if (!Object.hasOwn(draftBaseUpdatedAtRef.current, questionId)) {
      draftBaseUpdatedAtRef.current[questionId] = bundleRef.current?.exam.updatedAt ?? '';
    }
    const next = { ...draftsRef.current, [questionId]: response };
    draftsRef.current = next;
    setDrafts(next);
    setSaveNotice(null);
    setActionError(null);
  };

  const stageLatestConflict = useCallback(async () => {
    if (!examId) return;
    try {
      const latest = await getMockExam(examId);
      const external: ExternalExamUpdate = latest ? { kind: 'updated', bundle: latest } : { kind: 'removed' };
      pendingExternalRef.current = external;
      setSyncConflict(external);
      setSaveNotice(null);
    } catch (reason) {
      setActionError(`读取另一标签页的最新记录失败：${errorMessage(reason, '请刷新页面重试')}`);
    }
  }, [examId, getMockExam]);

  const persistDraft = useCallback(async (
    questionId: string,
    response: UserResponse,
    nextIndex: number,
  ): Promise<MockExamBundle> => {
    return writeQueueRef.current.enqueue(async () => {
      const current = bundleRef.current;
      if (!current || current.exam.status !== 'in-progress') throw new Error('当前模考已经交卷。');
      const nowMs = currentTimeMs();
      const startedAtMs = Date.parse(current.exam.startedAt);
      const updatedAt = monotonicTimestamp(current.exam.updatedAt);
      const updatedAtMs = Date.parse(updatedAt);
      const elapsedExamMs = Math.max(0, updatedAtMs - startedAtMs);
      const previousDuration = current.exam.questionDurationsMs[questionId] ?? 0;
      const activeDuration = Math.max(0, nowMs - questionStartedAtRef.current);
      const durationMs = Math.min(elapsedExamMs, previousDuration + activeDuration);
      localMutationAtRef.current = updatedAt;
      try {
        const result = await saveMockExamDraft({
          examId: current.exam.id,
          questionId,
          response,
          currentIndex: nextIndex,
          durationMs: Math.floor(durationMs),
          expectedUpdatedAt: draftBaseUpdatedAtRef.current[questionId] ?? current.exam.updatedAt,
          updatedAt,
        });
        replaceBundle(result);
        if (draftsRef.current[questionId] === response) {
          const nextDrafts = { ...draftsRef.current };
          delete nextDrafts[questionId];
          draftsRef.current = nextDrafts;
          setDrafts(nextDrafts);
          delete draftBaseUpdatedAtRef.current[questionId];
        } else {
          draftBaseUpdatedAtRef.current[questionId] = result.exam.updatedAt;
        }
        return result;
      } catch (reason) {
        if (localMutationAtRef.current === updatedAt) localMutationAtRef.current = null;
        throw reason;
      }
    });
  }, [replaceBundle, saveMockExamDraft]);

  const saveCurrent = useCallback(async (nextIndex = currentIndexRef.current) => {
    const current = bundleRef.current;
    const snapshot = current?.exam.blueprint.questions[currentIndexRef.current];
    if (!snapshot) throw new Error('当前题目位置无效。');
    const response = draftsRef.current[snapshot.id] ?? current.session.responses[snapshot.id];
    if (!response) throw new Error('当前题尚未作答。');
    return persistDraft(snapshot.id, response, nextIndex);
  }, [persistDraft]);

  const submitExam = useCallback(async (reason: 'manual' | 'timeout') => {
    const current = bundleRef.current;
    if (!current || current.exam.status !== 'in-progress' || submittingRef.current || syncConflict) return;
    submittingRef.current = true;
    setBusy('submit');
    setActionError(null);
    try {
      const snapshot = current.exam.blueprint.questions[currentIndexRef.current];
      const response = snapshot
        ? draftsRef.current[snapshot.id] ?? current.session.responses[snapshot.id]
        : undefined;
      if (snapshot && response) await persistDraft(snapshot.id, response, currentIndexRef.current);
      const latest = bundleRef.current ?? current;
      const submittedAt = monotonicTimestamp(latest.exam.updatedAt);
      localMutationAtRef.current = submittedAt;
      const result = await submitMockExam({
        examId: latest.exam.id,
        expectedUpdatedAt: latest.exam.updatedAt,
        submittedAt,
        reason,
      });
      replaceBundle(result);
      setRemainingMs(0);
      setSaveNotice(reason === 'timeout' ? '考试时间已到，系统已自动交卷。' : '交卷已保存到本地。');
    } catch (reasonValue) {
      if (reasonValue instanceof MockExamConflictError) await stageLatestConflict();
      setActionError(reasonValue instanceof MockExamConflictError
        ? '另一标签页已更新此模考，当前交卷未执行。'
        : `${reason === 'timeout' ? '自动交卷' : '提交整卷'}失败：${errorMessage(reasonValue, '请稍后重试')}`);
      submittingRef.current = false;
    } finally {
      setBusy(null);
    }
  }, [persistDraft, replaceBundle, stageLatestConflict, submitMockExam, syncConflict]);

  useEffect(() => {
    if (!bundle || bundle.exam.status !== 'in-progress' || versionIssue || syncConflict) return undefined;
    const tick = () => {
      try {
        const next = getMockExamRemainingMs(
          bundle.exam.startedAt,
          new Date().toISOString(),
          bundle.exam.blueprint.durationMinutes,
        );
        setRemainingMs(next);
        if (next === 0) void submitExam('timeout');
      } catch (reason) {
        setActionError(`倒计时异常：${errorMessage(reason, '模考时间无效')}`);
      }
    };
    tick();
    const timer = globalThis.setInterval(tick, 1000);
    return () => globalThis.clearInterval(timer);
  }, [bundle, submitExam, syncConflict, versionIssue]);

  const goTo = async (nextIndex: number) => {
    const current = bundleRef.current;
    if (!current || busy || syncConflict || nextIndex === currentIndexRef.current) return;
    const bounded = Math.max(0, Math.min(nextIndex, current.exam.blueprint.questions.length - 1));
    setActionError(null);
    try {
      if (current.exam.status === 'in-progress') {
        const snapshot = current.exam.blueprint.questions[currentIndexRef.current];
        const response = snapshot
          ? draftsRef.current[snapshot.id] ?? current.session.responses[snapshot.id]
          : undefined;
        if (snapshot && response) await persistDraft(snapshot.id, response, bounded);
      }
      currentIndexRef.current = bounded;
      setCurrentIndex(bounded);
      questionStartedAtRef.current = currentTimeMs();
      setSaveNotice(null);
    } catch (reason) {
      if (reason instanceof MockExamConflictError) await stageLatestConflict();
      setActionError(reason instanceof MockExamConflictError
        ? '另一标签页已更新此模考，当前草稿未覆盖最新记录。'
        : `切换题目失败：${errorMessage(reason, '草稿未能保存')}`);
    }
  };

  const handleSave = async () => {
    if (busy || syncConflict) return;
    setBusy('save');
    setActionError(null);
    try {
      await saveCurrent();
      questionStartedAtRef.current = currentTimeMs();
      setSaveNotice('当前草稿已保存。');
    } catch (reason) {
      if (reason instanceof MockExamConflictError) await stageLatestConflict();
      setActionError(reason instanceof MockExamConflictError
        ? '另一标签页已更新此模考，当前草稿未覆盖最新记录。'
        : `保存草稿失败：${errorMessage(reason, '请稍后重试')}`);
    } finally {
      setBusy(null);
    }
  };

  const handleSelfScore = async () => {
    const current = bundleRef.current;
    if (!current || !pendingSelfScoreQuestion || busy || syncConflict) return;
    const numericScore = Number(selfScoreDraft);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > current.exam.blueprint.questions.find((entry) => entry.id === pendingSelfScoreQuestion.id)!.maxScore) {
      setActionError('综合题自评分超出本题分值范围。');
      return;
    }
    setBusy('score');
    setActionError(null);
    try {
      const assessedAt = monotonicTimestamp(current.exam.updatedAt);
      localMutationAtRef.current = assessedAt;
      const result = await selfScoreMockExam({
        examId: current.exam.id,
        questionId: pendingSelfScoreQuestion.id,
        selfScore: numericScore,
        checkedRubricIds,
        expectedUpdatedAt: current.exam.updatedAt,
        assessedAt,
      });
      selfScoreDirtyRef.current = false;
      replaceBundle(result);
      setSaveNotice(`第 ${pendingSelfScoreQuestion.number} 题自评已保存。`);
    } catch (reason) {
      if (reason instanceof MockExamConflictError) await stageLatestConflict();
      setActionError(reason instanceof MockExamConflictError
        ? '另一标签页已更新此模考，当前自评未覆盖最新记录。'
        : `保存自评失败：${errorMessage(reason, '请稍后重试')}`);
    } finally {
      setBusy(null);
    }
  };

  const loadLatestExternal = () => {
    const external = pendingExternalRef.current;
    if (!external) return;
    if (external.kind === 'removed') {
      navigate('/mock');
      return;
    }
    draftsRef.current = {};
    draftBaseUpdatedAtRef.current = {};
    selfScoreDirtyRef.current = false;
    setDrafts({});
    replaceBundle(external.bundle);
    pendingExternalRef.current = null;
    setSyncConflict(null);
    setActionError(null);
    setSaveNotice('已加载另一标签页的最新记录。');
    questionStartedAtRef.current = currentTimeMs();
  };

  if (!examId) return <MockExamFailure message="当前地址没有持久化模考编号。" />;
  if (resolvedLoadKey !== loadKey) {
    return <div className="practice-loading"><span className="loader" /><p>恢复持久化模考</p></div>;
  }
  if (loadError && loadErrorKey === loadKey) return <MockExamFailure message={loadError} retry={() => setLoadRevision((value) => value + 1)} />;
  if (!bundle) return <div className="practice-loading"><span className="loader" /><p>恢复持久化模考</p></div>;
  if (versionIssue) return <MockExamFailure message={`${versionIssue} 已阻止继续答题和计分。`} />;
  if (!currentSnapshot || !currentQuestion) return <MockExamFailure message="模考当前位置无效，已阻止继续答题。" />;

  const interactionBlocked = Boolean(busy) || Boolean(syncConflict);
  const readOnly = bundle.exam.status !== 'in-progress' || busy === 'submit' || Boolean(syncConflict);
  const answeredCount = bundle.exam.blueprint.questions.filter((entry) => Boolean(drafts[entry.id] ?? bundle.session.responses[entry.id])).length;
  const score = bundle.exam.score;
  const comprehensiveResponse = currentResponse?.type === 'comprehensive'
    ? currentResponse
    : { type: 'comprehensive' as const, text: '', checkedRubricIds: [] };
  const pendingSnapshot = pendingSelfScoreQuestion
    ? bundle.exam.blueprint.questions.find((entry) => entry.id === pendingSelfScoreQuestion.id)
    : undefined;
  const pendingResponse = pendingSelfScoreQuestion
    ? bundle.session.responses[pendingSelfScoreQuestion.id]
    : undefined;

  return (
    <div className="practice-shell mock-exam-shell">
      <header className="practice-topbar mock-exam-topbar">
        <button className="icon-command" onClick={() => navigate('/mock')} title="退出模考" aria-label="退出模考"><ArrowLeft size={19} /></button>
        <div>
          <span>{bundle.exam.status === 'in-progress' ? `剩余 ${formatRemaining(remainingMs)}` : '本地持久化记录'}</span>
          <h1>2009 整卷模考</h1>
        </div>
        <div className="practice-progress" aria-label={`答题进度 ${answeredCount} / ${bundle.exam.blueprint.questions.length}`}>
          <span style={{ width: `${(answeredCount / bundle.exam.blueprint.questions.length) * 100}%` }} />
        </div>
        {bundle.exam.status === 'in-progress' ? (
          <button className="primary-command compact-command" disabled={interactionBlocked} onClick={() => void submitExam('manual')} aria-label="提交整卷">
            <Flag size={16} aria-hidden="true" />提交整卷
          </button>
        ) : (
          <span className={`mock-status-pill ${bundle.exam.status}`}>{bundle.exam.status === 'completed' ? '自评完成' : '已交卷'}</span>
        )}
      </header>

      <aside className="question-palette" aria-label="模考答题卡">
        <div className="palette-heading"><span>答题卡</span><strong>{answeredCount}/{bundle.exam.blueprint.questions.length}</strong></div>
        <div className="palette-grid">
          {bundle.exam.blueprint.questions.map((snapshot, index) => {
            const answered = Boolean(drafts[snapshot.id] ?? bundle.session.responses[snapshot.id]);
            return (
              <button
                key={snapshot.id}
                className={`${index === currentIndex ? 'current' : ''} ${answered ? 'done' : ''}`}
                disabled={interactionBlocked}
                onClick={() => void goTo(index)}
                title={`第 ${snapshot.number} 题`}
                aria-label={`第 ${snapshot.number} 题${answered ? '，已作答' : '，未作答'}`}
              >
                {snapshot.number}
              </button>
            );
          })}
        </div>
        <div className="palette-legend"><span><i className="done" />已作答</span><span><i className="mock-pending" />未作答</span></div>
      </aside>

      <main className="question-workspace mock-question-workspace">
        {bundle.exam.status === 'submitted' && <div className="mock-result-banner"><ClipboardCheck size={18} aria-hidden="true" /><strong>交卷完成，等待综合题自评</strong></div>}
        {bundle.exam.status === 'completed' && <div className="mock-result-banner complete"><Check size={18} aria-hidden="true" /><strong>模考与综合题自评均已完成</strong></div>}
        {syncConflict && (
          <div className="review-warning mock-sync-conflict" role="alert">
            <RefreshCw size={17} aria-hidden="true" />
            <span>{syncConflict.kind === 'updated'
              ? '另一标签页已更新此模考。当前未保存输入仍保留，但已停止写入。'
              : '此模考已在另一标签页被删除或由备份替换。'}</span>
            <button className="secondary-command compact-command" type="button" onClick={loadLatestExternal}>
              {syncConflict.kind === 'updated' ? '加载最新记录' : '返回模考'}
            </button>
          </div>
        )}
        {actionError && <div className="review-warning" role="alert"><TriangleAlert size={17} aria-hidden="true" /><span>{actionError}</span></div>}
        {saveNotice && !actionError && <div className="mock-save-notice" role="status"><Check size={15} aria-hidden="true" />{saveNotice}</div>}

        <div className="question-title-row">
          <div className="question-badges">
            <span>{currentSnapshot.kind === 'single-choice' ? '单项选择' : '综合应用'}</span>
            <span>{currentSnapshot.maxScore} 分</span>
            {readOnly && <span className="draft-badge">答案已冻结</span>}
          </div>
          <span className="mock-question-position">{currentIndex + 1} / {bundle.exam.blueprint.questions.length}</span>
        </div>

        <div className="question-body">
          <span className="question-index">{currentQuestion.number}</span>
          <LazyContentRenderer blocks={currentQuestion.stem} />
        </div>

        {currentQuestion.kind === 'single-choice' && currentQuestion.options ? (
          <div className="option-list mock-option-list">
            {currentQuestion.options.map((option) => {
              const selected = currentResponse?.type === 'choice' && currentResponse.optionId === option.id;
              return (
                <button
                  key={option.id}
                  className={selected ? 'selected' : ''}
                  disabled={readOnly || Boolean(busy)}
                  onClick={() => updateDraft(currentQuestion.id, { type: 'choice', optionId: option.id })}
                  aria-label={`选择 ${option.id}`}
                  aria-pressed={selected}
                >
                  <span>{option.id}</span>
                  <LazyContentRenderer blocks={option.content} compact />
                  {selected ? <Check size={16} aria-hidden="true" /> : <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="comprehensive-response">
            <label htmlFor={`mock-response-${currentQuestion.id}`}>作答内容</label>
            <textarea
              id={`mock-response-${currentQuestion.id}`}
              value={comprehensiveResponse.text}
              disabled={readOnly || Boolean(busy)}
              onChange={(event) => updateDraft(currentQuestion.id, {
                type: 'comprehensive',
                text: event.target.value,
                checkedRubricIds: [],
              })}
            />
          </div>
        )}

        {bundle.exam.status === 'in-progress' && (
          <div className="answer-actions mock-answer-actions">
            <span>{currentResponse ? '当前题已有草稿' : '当前题尚未作答'}</span>
            <button className="primary-command" disabled={!currentResponse || interactionBlocked} onClick={() => void handleSave()}>
              <Save size={16} aria-hidden="true" />{busy === 'save' ? '正在保存' : '保存当前草稿'}
            </button>
          </div>
        )}

        <nav className="question-navigation" aria-label="模考试题导航">
          <button className="secondary-command" disabled={currentIndex === 0 || interactionBlocked} onClick={() => void goTo(currentIndex - 1)}><ChevronLeft size={16} aria-hidden="true" />上一题</button>
          <span>第 {currentQuestion.number} 题</span>
          <button className="secondary-command" disabled={currentIndex === bundle.exam.blueprint.questions.length - 1 || interactionBlocked} onClick={() => void goTo(currentIndex + 1)}>下一题<ChevronRight size={16} aria-hidden="true" /></button>
        </nav>
      </main>

      <aside className="study-tools mock-exam-tools">
        <section>
          <div className="tool-heading"><Timer size={16} aria-hidden="true" /><h2>考试状态</h2></div>
          <dl className="mock-score-facts">
            <div><dt>已作答</dt><dd>{answeredCount} / 47</dd></div>
            <div><dt>客观题</dt><dd>{score ? `${score.objectiveScore} / ${bundle.exam.blueprint.objectiveMaxScore}` : '交卷后计分'}</dd></div>
            <div><dt>综合题</dt><dd>{score ? `${score.comprehensiveScore} / ${bundle.exam.blueprint.comprehensiveMaxScore}` : '交卷后自评'}</dd></div>
            <div><dt>总分</dt><dd>{score ? `${score.totalScore} / ${bundle.exam.blueprint.totalMaxScore}` : `-- / ${bundle.exam.blueprint.totalMaxScore}`}</dd></div>
          </dl>
        </section>

        {pendingSelfScoreQuestion && pendingSnapshot && (
          <section className="mock-self-score-panel">
            <div className="tool-heading"><ClipboardCheck size={16} aria-hidden="true" /><h2>第 {pendingSelfScoreQuestion.number} 题自评</h2></div>
            {pendingResponse?.type === 'comprehensive' && pendingResponse.text ? <blockquote>{pendingResponse.text}</blockquote> : <p className="mock-unanswered-note">本题交卷时未填写作答。</p>}
            {pendingSelfScoreQuestion.answer.type === 'comprehensive' && (
              <div className="mock-rubric-list">
                {pendingSelfScoreQuestion.answer.rubric.map((rubric) => (
                  <label key={rubric.id}>
                    <input
                      type="checkbox"
                      checked={checkedRubricIds.includes(rubric.id)}
                      disabled={interactionBlocked}
                      onChange={() => {
                        selfScoreDirtyRef.current = true;
                        setCheckedRubricIds((current) => current.includes(rubric.id)
                          ? current.filter((id) => id !== rubric.id)
                          : [...current, rubric.id]);
                      }}
                    />
                    <span>{rubric.description}</span><strong>{rubric.points} 分</strong>
                  </label>
                ))}
              </div>
            )}
            <label className="score-field mock-score-field">
              <span>综合题自评分</span>
              <input
                aria-label="综合题自评分"
                type="number"
                min="0"
                max={pendingSnapshot.maxScore}
                step="0.5"
                value={selfScoreDraft}
                disabled={interactionBlocked}
                onChange={(event) => {
                  selfScoreDirtyRef.current = true;
                  setSelfScoreDraft(event.target.value);
                }}
              />
              <span>/ {pendingSnapshot.maxScore}</span>
            </label>
            <button className="primary-command" disabled={interactionBlocked} onClick={() => void handleSelfScore()}>
              <Save size={16} aria-hidden="true" />{busy === 'score' ? '正在保存自评' : '保存本题自评'}
            </button>
          </section>
        )}

        {bundle.exam.status === 'completed' && (
          <section className="mock-complete-summary">
            <div className="tool-heading"><Check size={16} aria-hidden="true" /><h2>最终成绩</h2></div>
            <strong>{score?.totalScore ?? 0}<small> / {bundle.exam.blueprint.totalMaxScore}</small></strong>
            <button className="secondary-command" onClick={() => navigate('/mock')}>返回模考记录</button>
          </section>
        )}
      </aside>
    </div>
  );
}
