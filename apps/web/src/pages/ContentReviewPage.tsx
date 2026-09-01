import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Download,
  ExternalLink,
  FileQuestion,
  FileText,
  Save,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  canApproveContentReview,
  emptyContentReviewChecks,
  type ContentReviewCheck,
  type ContentReviewChecks,
  type ContentReviewDecision,
  type ContentReviewRecord,
  type Question,
} from '@408os/domain';
import { ContentReviewConflictError } from '@408os/storage';
import { CONTENT_REVIEW_DOWNLOAD_PREFIX } from '../app/brand';
import { useStudy, type ContentReviewDraft } from '../app/StudyContext';
import { createSerialWriteQueue } from '../app/serial-write-queue';
import { LazyContentRenderer } from '../components/LazyContentRenderer';
import { SourcePageImage } from '../components/SourcePageImage';

const checkLabels: Array<{ id: ContentReviewCheck; label: string }> = [
  { id: 'stem', label: '题干' },
  { id: 'options', label: '选项' },
  { id: 'answer', label: '答案' },
  { id: 'explanation', label: '解析' },
  { id: 'rubric', label: '评分点' },
  { id: 'assets', label: '资源' },
  { id: 'sources', label: '来源' },
  { id: 'knowledgePoints', label: '知识点' },
];

const subjectLabels: Record<Question['subject'], string> = {
  'data-structures': '数据结构',
  'computer-organization': '组成原理',
  'operating-systems': '操作系统',
  'computer-networks': '计算机网络',
};

const decisionLabels: Record<ContentReviewDecision, string> = {
  pending: '待复核',
  approved: '已通过',
  rejected: '有问题',
};

type ReviewView = 'source' | 'structured' | 'checklist';
type ContentMode = 'question' | 'answer';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type ReviewFilter = 'all' | ContentReviewDecision;

const reviewFilters: Array<{ id: ReviewFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待复核' },
  { id: 'rejected', label: '有问题' },
  { id: 'approved', label: '已通过' },
];

function isReviewFilter(value: string | null): value is ReviewFilter {
  return value === 'all' || value === 'pending' || value === 'rejected' || value === 'approved';
}

function draftFromRecord(record: ContentReviewRecord | undefined, rememberedReviewer: string): ContentReviewDraft {
  return {
    checks: record ? { ...record.checks } : emptyContentReviewChecks(),
    reviewer: record?.reviewer ?? rememberedReviewer,
    issueNote: record?.issueNote ?? '',
  };
}

function DecisionIcon({ decision }: { decision: ContentReviewDecision }) {
  if (decision === 'approved') return <CheckCircle2 size={14} aria-hidden="true" />;
  if (decision === 'rejected') return <XCircle size={14} aria-hidden="true" />;
  return <CircleDashed size={14} aria-hidden="true" />;
}

function StructuredQuestion({ question, mode }: { question: Question; mode: ContentMode }) {
  if (mode === 'question') {
    return (
      <div className="review-structured-body">
        <section className="review-question-stem" aria-labelledby="review-stem-heading">
          <h3 id="review-stem-heading">题干</h3>
          <LazyContentRenderer blocks={question.stem} />
        </section>

        <section aria-labelledby="review-options-heading">
          <h3 id="review-options-heading">选项</h3>
          {question.options?.length ? (
            <div className="review-option-list">
              {question.options.map((option) => (
                <div key={option.id}>
                  <strong>{option.id}</strong>
                  <LazyContentRenderer blocks={option.content} compact />
                </div>
              ))}
            </div>
          ) : <p className="review-empty-copy">综合题无选择项。</p>}
        </section>

        <section className="review-metadata" aria-labelledby="review-metadata-heading">
          <h3 id="review-metadata-heading">结构化元数据</h3>
          <dl>
            <div><dt>题目 ID</dt><dd>{question.id}</dd></div>
            <div><dt>内容版本</dt><dd>{question.contentVersion}</dd></div>
            <div><dt>资源</dt><dd>{question.assetIds.length ? question.assetIds.join('、') : '无独立资源'}</dd></div>
            <div><dt>知识点</dt><dd>{question.knowledgePointIds.length ? question.knowledgePointIds.join('、') : '未标注'}</dd></div>
          </dl>
        </section>
      </div>
    );
  }

  return (
    <div className="review-structured-body">
      <section aria-labelledby="review-answer-heading">
        <h3 id="review-answer-heading">正式答案</h3>
        {question.answer.type === 'choice' ? (
          <p className="review-choice-answer">正确选项 <strong>{question.answer.optionId}</strong></p>
        ) : (
          <>
            <div className="review-score-line"><span>综合题</span><strong>满分 {question.answer.maxScore} 分</strong></div>
            <LazyContentRenderer blocks={question.answer.reference} />
          </>
        )}
      </section>

      {question.answer.type === 'comprehensive' && (
        <section aria-labelledby="review-rubric-heading">
          <h3 id="review-rubric-heading">评分点</h3>
          {question.answer.rubric.length ? (
            <div className="review-rubric-list">
              {question.answer.rubric.map((item) => (
                <div key={item.id}><span>{item.description}</span><strong>{item.points} 分</strong></div>
              ))}
            </div>
          ) : <p className="review-empty-copy">暂无评分点。</p>}
        </section>
      )}

      <section aria-labelledby="review-explanation-heading">
        <h3 id="review-explanation-heading">解析</h3>
        {question.explanation.length ? question.explanation.map((section) => (
          <div className="review-explanation" key={section.id}>
            <h4>{section.title}</h4>
            <LazyContentRenderer blocks={section.content} />
          </div>
        )) : <p className="review-empty-copy">暂无解析。</p>}
      </section>
    </div>
  );
}

export function ContentReviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    loading,
    error,
    packs,
    questions,
    reviewRecords,
    reviewSummary,
    saveContentReviewDraft,
    approveContentReview,
    rejectContentReview,
    reloadContentReviewRecord,
    exportContentReviewLedger,
  } = useStudy();
  const [mode, setMode] = useState<ContentMode>('question');
  const [mobileView, setMobileView] = useState<ReviewView>('source');
  const [draft, setDraft] = useState<ContentReviewDraft>(() => draftFromRecord(undefined, ''));
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [statusMessage, setStatusMessage] = useState('当前记录已同步');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const rememberedReviewer = useRef('');
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const recordTokenRef = useRef<string | null>(null);
  const activeQuestionId = useRef<string | null>(null);
  const reviewRecordsRef = useRef(reviewRecords);
  const writeQueueRef = useRef(createSerialWriteQueue());
  const writeEpochRef = useRef(0);
  const decisionBusyRef = useRef(false);

  useEffect(() => {
    reviewRecordsRef.current = reviewRecords;
  }, [reviewRecords]);

  const yearQuestions = useMemo(
    () => questions.filter((question) => question.year === 2009).sort((left, right) => left.number - right.number),
    [questions],
  );
  const pack = packs.find((candidate) => candidate.year === 2009);
  const requestedNumber = Number(searchParams.get('question'));
  const requestedFilter = searchParams.get('status');
  const reviewFilter: ReviewFilter = isReviewFilter(requestedFilter) ? requestedFilter : 'all';
  const question = yearQuestions.find((candidate) => candidate.number === requestedNumber) ?? yearQuestions[0];
  const questionId = question?.id;
  const currentIndex = question ? yearQuestions.findIndex((candidate) => candidate.id === question.id) : -1;
  const currentRecord = question ? reviewRecords.get(question.id) : undefined;
  const writeBlocked = actionBusy || conflict;
  const effectiveDecision: ContentReviewDecision = conflict
    ? 'pending'
    : dirty ? 'pending' : currentRecord?.decision ?? 'pending';
  const effectiveDecisionLabel = conflict ? '待重新读取' : decisionLabels[effectiveDecision];
  const allChecked = canApproveContentReview(draft.checks);
  const reviewerMissing = !draft.reviewer.trim();
  const issueMissing = !draft.issueNote.trim();

  useEffect(() => {
    if (!question) return;
    const next = new URLSearchParams(searchParams);
    let changed = false;
    if (requestedNumber !== question.number) {
      next.set('question', String(question.number));
      changed = true;
    }
    if (requestedFilter !== null && !isReviewFilter(requestedFilter)) {
      next.delete('status');
      changed = true;
    }
    if (changed) setSearchParams(next, { replace: true });
  }, [question, requestedFilter, requestedNumber, searchParams, setSearchParams]);

  useEffect(() => {
    if (!questionId) return;
    const next = draftFromRecord(reviewRecordsRef.current.get(questionId), rememberedReviewer.current);
    recordTokenRef.current = reviewRecordsRef.current.get(questionId)?.updatedAt ?? null;
    activeQuestionId.current = questionId;
    draftRef.current = next;
    dirtyRef.current = false;
    setDraft(next);
    setDirty(false);
    setSaveState('idle');
    setStatusMessage('当前记录已同步');
    setActionError(null);
    conflictRef.current = false;
    setConflict(false);
  }, [questionId]);

  const updateDraft = useCallback((update: (current: ContentReviewDraft) => ContentReviewDraft) => {
    if (conflictRef.current) return;
    setDraft((current) => {
      const next = update(current);
      draftRef.current = next;
      rememberedReviewer.current = next.reviewer;
      return next;
    });
    dirtyRef.current = true;
    setDirty(true);
    setSaveState('idle');
    setStatusMessage('等待自动保存');
    setActionError(null);
  }, []);

  const persistDraft = useCallback(async () => {
    if (decisionBusyRef.current || conflictRef.current) return false;
    const questionId = activeQuestionId.current;
    if (!questionId) return false;
    const payload = draftRef.current;
    const writeEpoch = writeEpochRef.current;
    setSaveState('saving');
    setStatusMessage('正在保存审核记录');
    try {
      const executed = await writeQueueRef.current.enqueue(async () => {
        if (writeEpochRef.current !== writeEpoch || conflictRef.current) return false;
        const expectedUpdatedAt = recordTokenRef.current;
        const record = await saveContentReviewDraft(questionId, payload, expectedUpdatedAt);
        if (activeQuestionId.current === questionId) recordTokenRef.current = record.updatedAt;
        return true;
      });
      if (executed && writeEpochRef.current === writeEpoch && activeQuestionId.current === questionId && draftRef.current === payload) {
        dirtyRef.current = false;
        setDirty(false);
        setSaveState('saved');
        setStatusMessage('草稿已保存');
      }
      return executed;
    } catch (reason) {
      if (activeQuestionId.current === questionId) {
        setSaveState('error');
        if (reason instanceof ContentReviewConflictError) {
          conflictRef.current = true;
          setConflict(true);
          setStatusMessage('记录已被另一标签页更新');
          setActionError(null);
        } else {
          setStatusMessage('保存失败');
          setActionError(reason instanceof Error ? reason.message : '审核草稿保存失败。');
        }
      }
      return false;
    }
  }, [saveContentReviewDraft]);

  useEffect(() => {
    if (!dirty || actionBusy || conflict) return;
    const timer = window.setTimeout(() => void persistDraft(), 650);
    return () => window.clearTimeout(timer);
  }, [actionBusy, conflict, dirty, draft, persistDraft]);

  useEffect(() => () => {
    if (dirtyRef.current && activeQuestionId.current) {
      void persistDraft().catch(() => undefined);
    }
  }, [persistDraft, questionId]);

  const goToQuestion = async (number: number) => {
    if (writeBlocked || number === question?.number) return;
    if (dirtyRef.current && !(await persistDraft())) return;
    const next = new URLSearchParams(searchParams);
    next.set('question', String(number));
    setSearchParams(next);
  };

  const setReviewFilter = (filter: ReviewFilter) => {
    if (writeBlocked) return;
    const next = new URLSearchParams(searchParams);
    if (filter === 'all') next.delete('status');
    else next.set('status', filter);
    setSearchParams(next);
  };

  const decide = async (decision: 'approved' | 'rejected') => {
    if (!question || writeBlocked) return;
    decisionBusyRef.current = true;
    writeEpochRef.current += 1;
    setActionBusy(true);
    setActionError(null);
    setSaveState('saving');
    setStatusMessage('正在保存审核记录');
    try {
      const payload = draftRef.current;
      const committed = await writeQueueRef.current.enqueue(async () => {
        if (conflictRef.current) return false;
        const expectedUpdatedAt = recordTokenRef.current;
        const record = decision === 'approved'
          ? await approveContentReview(question.id, payload, expectedUpdatedAt)
          : await rejectContentReview(question.id, payload, expectedUpdatedAt);
        if (activeQuestionId.current === question.id) recordTokenRef.current = record.updatedAt;
        return true;
      });
      if (!committed) return;
      dirtyRef.current = false;
      setDirty(false);
      setSaveState('saved');
      setStatusMessage(decision === 'approved' ? '已通过复核' : '已标记问题');
    } catch (reason) {
      setSaveState('error');
      if (reason instanceof ContentReviewConflictError) {
        conflictRef.current = true;
        setConflict(true);
        setStatusMessage('记录已被另一标签页更新');
        setActionError(null);
      } else {
        setStatusMessage('保存失败');
        setActionError(reason instanceof Error ? reason.message : '审核状态保存失败。');
      }
    } finally {
      decisionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const reloadAuthority = async () => {
    if (!question || actionBusy) return;
    writeEpochRef.current += 1;
    setActionBusy(true);
    setActionError(null);
    try {
      const record = await reloadContentReviewRecord(question.id);
      const next = draftFromRecord(record, rememberedReviewer.current);
      recordTokenRef.current = record?.updatedAt ?? null;
      draftRef.current = next;
      dirtyRef.current = false;
      conflictRef.current = false;
      setDraft(next);
      setDirty(false);
      setConflict(false);
      setSaveState('idle');
      setStatusMessage('已重新读取最新复核记录');
    } catch (reason) {
      setSaveState('error');
      setStatusMessage('读取最新记录失败');
      setActionError(reason instanceof Error ? reason.message : '最新复核记录读取失败。');
    } finally {
      setActionBusy(false);
    }
  };

  const exportLedger = async () => {
    if (writeBlocked) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (dirtyRef.current && !(await persistDraft())) return;
      const json = await exportContentReviewLedger();
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${CONTENT_REVIEW_DOWNLOAD_PREFIX}-2009-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setSaveState('saved');
      setStatusMessage('审核记录已导出');
    } catch (reason) {
      setSaveState('error');
      setStatusMessage('导出失败');
      setActionError(reason instanceof Error ? reason.message : '审核记录导出失败。');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <section className="loading-state"><span className="loader" /><p>载入复核工作台</p></section>;
  if (error) return <section className="fatal-state"><AlertTriangle size={24} /><h1>复核工作台不可用</h1><p>{error}</p></section>;
  if (!pack || !question) {
    return (
      <section className="large-empty content-pack-empty" aria-labelledby="content-pack-empty-title">
        <FileQuestion size={28} aria-hidden="true" />
        <h1 id="content-pack-empty-title">本地 2009 题包未安装</h1>
        <p>公开代码不附带来源版权状态不明确的题包。导入经过校验的本地内容后，复核工作台才会启用。</p>
        <div className="command-row">
          <Link className="secondary-command" to="/"><ArrowLeft size={16} aria-hidden="true" />返回总览</Link>
          <Link className="secondary-command" to="/settings"><FileText size={16} aria-hidden="true" />打开数据设置</Link>
          <Link className="primary-command" to="/lab"><ExternalLink size={16} aria-hidden="true" />进入实验</Link>
        </div>
      </section>
    );
  }

  const sourceDocument = mode === 'question' ? question.source.question : question.source.answer;
  const previous = yearQuestions[currentIndex - 1];
  const next = yearQuestions[currentIndex + 1];
  const reviewItems = yearQuestions.map((item) => ({
    question: item,
    decision: item.id === question.id ? effectiveDecision : reviewRecords.get(item.id)?.decision ?? 'pending',
  }));
  const reviewCounts: Record<ReviewFilter, number> = {
    all: reviewItems.length,
    pending: reviewItems.filter((item) => item.decision === 'pending').length,
    rejected: reviewItems.filter((item) => item.decision === 'rejected').length,
    approved: reviewItems.filter((item) => item.decision === 'approved').length,
  };
  const filteredReviewItems = reviewFilter === 'all'
    ? reviewItems
    : reviewItems.filter((item) => item.decision === reviewFilter);
  const nextPending = reviewItems.find((item) => item.decision === 'pending' && item.question.number > question.number)
    ?? reviewItems.find((item) => item.decision === 'pending');

  return (
    <div className="content-review-shell">
      <header className="content-review-topbar">
        <button className="review-back-command" disabled={writeBlocked} onClick={() => navigate('/')} aria-label="返回总览"><ArrowLeft size={18} /><span>总览</span></button>
        <div className="review-title-block">
          <span>CONTENT QA · LOCAL ONLY</span>
          <h1>2009 内容复核</h1>
        </div>
        <div className="review-pack-warning" role="note">
          <AlertTriangle size={16} />
          <span>正式题包状态</span>
          <strong>{pack.reviewStatus}</strong>
        </div>
        <div className="review-summary-line" aria-label="复核进度">
          <strong>已通过 {reviewSummary.approved} / 47</strong>
          <span>有问题 {reviewSummary.rejected} / 47</span>
        </div>
        <button className="secondary-command compact-command review-export" disabled={writeBlocked} onClick={() => void exportLedger()}><Download size={16} />导出审核记录</button>
      </header>

      <aside className="review-palette" aria-label="47 题复核导航">
        <div className="review-palette-heading">
          <span>题号</span>
          <strong>{reviewSummary.approved + reviewSummary.rejected}/47</strong>
        </div>
        <div className="review-filter-controls" aria-label="复核状态筛选">
          {reviewFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-label={`${filter.label} ${reviewCounts[filter.id]}`}
              aria-pressed={reviewFilter === filter.id}
              disabled={writeBlocked}
              onClick={() => setReviewFilter(filter.id)}
            >
              <span>{filter.label}</span>
              <strong>{reviewCounts[filter.id]}</strong>
            </button>
          ))}
        </div>
        <button
          className="review-next-pending"
          type="button"
          disabled={writeBlocked || !nextPending}
          onClick={() => nextPending && void goToQuestion(nextPending.question.number)}
        >
          <span>下一道待复核</span>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
        <div className="review-palette-grid">
          {filteredReviewItems.map((item) => {
            const { question: paletteQuestion, decision } = item;
            return (
              <button
                key={paletteQuestion.id}
                className={`review-palette-item is-${decision}`}
                aria-label={`第 ${paletteQuestion.number} 题`}
                aria-current={paletteQuestion.id === question.id ? 'step' : undefined}
                title={`第 ${paletteQuestion.number} 题 · ${decisionLabels[decision]}`}
                disabled={writeBlocked}
                onClick={() => void goToQuestion(paletteQuestion.number)}
              >
                <span>{paletteQuestion.number}</span>
                <DecisionIcon decision={decision} />
              </button>
            );
          })}
        </div>
        <div className="review-palette-legend" aria-label="状态图例">
          <span><CheckCircle2 size={13} />已通过</span>
          <span><XCircle size={13} />有问题</span>
          <span><CircleDashed size={13} />待复核</span>
        </div>
      </aside>

      <main className="review-workspace">
        <div className="review-mobile-tabs" role="tablist" aria-label="复核视图">
          {([['source', '来源'], ['structured', '结构化'], ['checklist', '核对']] as const).map(([id, label]) => (
            <button key={id} id={`review-tab-${id}`} role="tab" aria-controls={`review-panel-${id}`} aria-selected={mobileView === id} className={mobileView === id ? 'active' : ''} onClick={() => setMobileView(id)}>{label}</button>
          ))}
        </div>

        <section id="review-panel-source" role="tabpanel" aria-labelledby="review-tab-source" className={`review-source-panel review-view-${mobileView === 'source' ? 'active' : 'inactive'}`}>
          <header className="review-panel-header">
            <div><span>来源页</span><strong>{sourceDocument.publisher}</strong></div>
            <div className="review-mode-control" role="group" aria-label="来源模式">
              <button className={mode === 'question' ? 'active' : ''} aria-pressed={mode === 'question'} onClick={() => setMode('question')}>题目</button>
              <button className={mode === 'answer' ? 'active' : ''} aria-pressed={mode === 'answer'} onClick={() => setMode('answer')}>答案</button>
            </div>
          </header>
          <div className="review-source-meta">
            <span>{sourceDocument.title}</span>
            <a href={sourceDocument.url} target="_blank" rel="noreferrer">资料页<ExternalLink size={13} /></a>
          </div>
          <div className="review-source-scroll" aria-label={`${mode === 'question' ? '原卷' : '解析'}来源图片`}>
            {sourceDocument.pages.map((page) => (
              <figure className="review-source-page" key={`${mode}-${page}`}>
                <SourcePageImage
                  packId={pack.id}
                  document={mode === 'question' ? 'questions' : 'answers'}
                  page={page}
                  alt={`${pack.year} ${mode === 'question' ? '原卷' : '解析'}第 ${page} 页`}
                  data-source-page={page}
                  loading="lazy"
                />
                <figcaption>第 {page} 页 · {sourceDocument.locator}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="review-panel-structured" role="tabpanel" aria-labelledby="review-tab-structured" className={`review-structured-panel review-view-${mobileView === 'structured' ? 'active' : 'inactive'}`}>
          <header className="review-panel-header review-question-heading">
            <div>
              <span>第 {question.number} 题 · {subjectLabels[question.subject]}</span>
              <strong>{question.kind === 'single-choice' ? '单项选择题' : '综合题'}</strong>
            </div>
            <span className="review-status-tag">{question.reviewStatus}</span>
          </header>
          <StructuredQuestion question={question} mode={mode} />
          <footer className="review-question-navigation">
            <button className="secondary-command" disabled={writeBlocked || !previous} onClick={() => previous && void goToQuestion(previous.number)}><ChevronLeft size={16} />上一题</button>
            <span>{question.number} / 47</span>
            <button className="secondary-command" disabled={writeBlocked || !next} onClick={() => next && void goToQuestion(next.number)}>下一题<ChevronRight size={16} /></button>
          </footer>
        </section>

        <aside id="review-panel-checklist" role="tabpanel" aria-labelledby="review-tab-checklist" className={`review-checklist-panel review-view-${mobileView === 'checklist' ? 'active' : 'inactive'}`}>
          {conflict && (
            <div className="review-conflict-banner" role="alert" aria-label="复核记录冲突">
              <strong>另一标签页已更新这道题</strong>
              <p>本页草稿已停止写入，不会覆盖权威复核记录。</p>
              <button type="button" className="secondary-command" disabled={actionBusy} onClick={() => void reloadAuthority()}>
                重新读取最新复核记录
              </button>
            </div>
          )}
          <div className={`review-decision is-${effectiveDecision}`}>
            <DecisionIcon decision={effectiveDecision} />
            <div><span>当前记录</span><strong>{effectiveDecisionLabel}</strong></div>
          </div>

          <fieldset className="review-check-fieldset">
            <legend>逐项核对</legend>
            <p>仅勾选已与来源页逐项确认的内容。</p>
            <div className="review-check-grid">
              {checkLabels.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={draft.checks[item.id]}
                    disabled={writeBlocked}
                    onChange={(event) => updateDraft((current) => ({
                      ...current,
                      checks: { ...current.checks, [item.id]: event.target.checked } as ContentReviewChecks,
                    }))}
                  />
                  <span>{item.label}</span>
                  {draft.checks[item.id] && <Check size={14} aria-hidden="true" />}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="review-form-field">
            <label htmlFor="content-reviewer">复核人</label>
            <input id="content-reviewer" value={draft.reviewer} disabled={writeBlocked} aria-invalid={reviewerMissing} placeholder="填写姓名或标识" onChange={(event) => updateDraft((current) => ({ ...current, reviewer: event.target.value }))} />
            {reviewerMissing && <small>通过或标记问题前必须填写。</small>}
          </div>

          <div className="review-form-field">
            <label htmlFor="content-review-issue">问题记录</label>
            <textarea id="content-review-issue" value={draft.issueNote} disabled={writeBlocked} aria-invalid={issueMissing && effectiveDecision === 'rejected'} aria-describedby="content-review-issue-help" placeholder="记录缺页、答案冲突或结构化错误" onChange={(event) => updateDraft((current) => ({ ...current, issueNote: event.target.value }))} />
            <small id="content-review-issue-help">标记问题时必须填写具体原因。</small>
          </div>

          <div className={`review-save-status is-${saveState}`} role="status" aria-label="复核记录保存状态" aria-live="polite">
            <Save size={14} />
            <span>{statusMessage}</span>
          </div>
          {actionError && <p className="review-action-error" role="alert">{actionError}</p>}

          <div className="review-action-stack">
            <button className="secondary-command" disabled={writeBlocked} onClick={() => void persistDraft()}><Save size={16} />保存草稿</button>
            <button className="review-approve-command" disabled={writeBlocked || !allChecked || reviewerMissing} onClick={() => void decide('approved')}><CheckCircle2 size={16} />通过复核</button>
            <button className="review-reject-command" disabled={writeBlocked || reviewerMissing || issueMissing} aria-describedby="content-review-issue-help" onClick={() => void decide('rejected')}><XCircle size={16} />标记问题</button>
          </div>

          <p className="review-scope-note"><FileText size={14} />记录绑定当前题包 hash 与内容版本；本页不会提升正式题包状态。</p>
        </aside>
      </main>
    </div>
  );
}
