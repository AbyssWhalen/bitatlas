import {
  aggregateKnowledgePerformance,
  beijingDate,
  buildKnowledgeForest,
  effectiveCards,
  questionAvailability,
  type Subject,
} from '@408os/domain';
import { BookOpenCheck, ChevronRight, FlaskConical, Network, Play, Target, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { firstQuestionLabLink } from '../app/lab-links';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { useConceptQuestions, useLearning } from '../app/LearningContext';
import { useConceptRegister } from '../app/useConceptRegister';
import type { ConceptStateRow } from '../app/concept-register';
import { ConceptRegister } from '../components/ConceptRegister';
import { STATE_LABELS, STATE_ORDER } from '../components/concept-labels';
import { LazyContentRenderer } from '../components/LazyContentRenderer';
import { SubjectShape } from '../components/SubjectShape';

const subjects: Array<{ id: Subject; label: string }> = [
  { id: 'data-structures', label: '数据结构' },
  { id: 'computer-organization', label: '组成原理' },
  { id: 'operating-systems', label: '操作系统' },
  { id: 'computer-networks', label: '计算机网络' },
];

type PracticeQuota = 5 | 10 | 'all';

/** Leaf concepts link to at most a few dozen questions; past that the list stops being scannable. */
const QUESTION_CHIP_LIMIT = 24;

function questionLabel(question: { year: number; number: number } | undefined) {
  return question ? `${question.year} Q${String(question.number).padStart(2, '0')}` : '题目（当前版本不可用）';
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 760px)').matches;
}

export function KnowledgePage() {
  const { attempts, createSession, currentProgress, questions, assets } = useStudy();
  const { pack, personal, error: learningError } = useLearning();
  const pageRootRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const conceptQuestions = useConceptQuestions();
  const register = useConceptRegister();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [practiceQuota, setPracticeQuota] = useState<PracticeQuota>('all');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const forest = useMemo(() => buildKnowledgeForest(pack?.concepts ?? [], conceptQuestions), [pack, conceptQuestions]);
  const analytics = useMemo(
    () => aggregateKnowledgePerformance(attempts, conceptQuestions, forest),
    [attempts, forest, conceptQuestions],
  );
  const nodeById = useMemo(() => new Map(forest.nodes.map((node) => [node.point.id, node])), [forest]);
  const performanceById = useMemo(
    () => new Map(analytics.points.map((entry) => [entry.knowledgePointId, entry])),
    [analytics],
  );
  const requestedSubject = searchParams.get('subject');
  const legacyNode = searchParams.get('node');
  const legacyMapping = pack?.mappings.find((mapping) => mapping.legacyNodeIds.includes(legacyNode ?? ''));
  const subject = legacyMapping?.subject ?? (subjects.some((item) => item.id === requestedSubject)
    ? requestedSubject as Subject
    : 'data-structures');
  const subjectNodes = useMemo(
    () => forest.nodes.filter((node) => node.point.subject === subject),
    [forest, subject],
  );
  const subjectLabel = subjects.find((item) => item.id === subject)?.label ?? subject;

  const subjectRootId = forest.rootIds.find((id) => nodeById.get(id)?.point.subject === subject) ?? null;
  const defaultSelectedId = subjectRootId
    ?? subjectNodes[0]?.point.id
    ?? null;
  const requestedNodeId = legacyMapping?.primaryConceptId ?? legacyNode;
  const requestedNode = requestedNodeId ? nodeById.get(requestedNodeId) : undefined;
  const validRequestedNodeId = requestedNode?.point.subject === subject
    ? requestedNodeId
    : null;
  const activeSelectedId = validRequestedNodeId ?? defaultSelectedId;
  const canonicalSearchParams = useMemo(() => {
    const next = new URLSearchParams({ subject });
    if (validRequestedNodeId) next.set('node', validRequestedNodeId);
    return next;
  }, [subject, validRequestedNodeId]);
  const canonicalSearch = canonicalSearchParams.toString();
  const activeSelectedIdRef = useRef(activeSelectedId);
  const subjectRootIdRef = useRef(subjectRootId);
  const selectedNode = activeSelectedId ? nodeById.get(activeSelectedId) : undefined;
  const selectedPerformance = activeSelectedId ? performanceById.get(activeSelectedId) : undefined;
  const article = pack?.articles?.find((entry) => entry.conceptId === activeSelectedId);

  const availableIds = useMemo(() => (
    selectedNode?.questionIds.filter((id) => {
      const question = questions.find((entry) => entry.id === id);
      return question && questionAvailability(question, assets).practice;
    }) ?? []
  ), [assets, questions, selectedNode]);

  // Default wrong-first then unattempted-first ordering for focused practice sessions.
  const prioritizedIds = useMemo(() => {
    const progressMap = currentProgress ?? new Map();
    const bucketOf = (id: string): number => {
      const entry = progressMap.get(id);
      if (entry?.lastCorrect === false) return 0;
      if (!entry || entry.attemptCount === 0) return 1;
      return 2;
    };
    return [...availableIds].sort((left, right) => bucketOf(left) - bucketOf(right));
  }, [availableIds, currentProgress]);

  const effectiveQuota: PracticeQuota = practiceQuota !== 'all' && prioritizedIds.length >= practiceQuota
    ? practiceQuota
    : 'all';
  const targetPracticeIds = useMemo(
    () => (effectiveQuota === 'all' ? prioritizedIds : prioritizedIds.slice(0, effectiveQuota)),
    [effectiveQuota, prioritizedIds],
  );

  const selectedLabLink = firstQuestionLabLink(selectedNode?.questionIds ?? []);
  const assessedLeaves = subjectNodes.filter((node) => (
    node.childIds.length === 0 && performanceById.get(node.point.id)?.performance !== null
  )).length;
  const leafCount = subjectNodes.filter((node) => node.childIds.length === 0).length;

  // Align card count strictly with useConceptRegister & /review?concept= (effectiveCards + valid source contentVersion + conceptIds subtree).
  const activeCards = useMemo(() => {
    const versionByQuestionId = new Map(questions.map((question) => [question.id, question.contentVersion]));
    return effectiveCards(pack?.cards ?? [], personal ?? []).filter((card) =>
      card.sources.every((source) => versionByQuestionId.get(source.questionId) === source.questionContentVersion),
    );
  }, [pack?.cards, personal, questions]);

  const selectedSubtreeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedNode) return ids;
    const stack = [selectedNode.point.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (ids.has(id)) continue;
      ids.add(id);
      const current = nodeById.get(id);
      if (current?.childIds.length) stack.push(...current.childIds);
    }
    return ids;
  }, [nodeById, selectedNode]);

  const selectedCards = useMemo(
    () => activeCards.filter((card) => card.conceptIds.some((id) => selectedSubtreeIds.has(id))),
    [activeCards, selectedSubtreeIds],
  );

  useEffect(() => {
    if (pack && searchParams.toString() !== canonicalSearch) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearch, canonicalSearchParams, searchParams, setSearchParams, pack]);

  useLayoutEffect(() => {
    activeSelectedIdRef.current = activeSelectedId;
    subjectRootIdRef.current = subjectRootId;
  }, [activeSelectedId, subjectRootId]);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
    const trigger = drawerTriggerRef.current;
    if (trigger && trigger.isConnected) {
      requestAnimationFrame(() => {
        if (trigger.isConnected) trigger.focus({ preventScroll: true });
      });
    }
  }, []);

  const openMobileDrawerFromTrigger = useCallback((trigger?: HTMLElement | null) => {
    if (!isMobileViewport()) return false;
    drawerTriggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setMobileDrawerOpen(true);
    return true;
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(max-width: 760px)');
    const onMediaChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileDrawerOpen(false);
    };
    media.addEventListener?.('change', onMediaChange);
    return () => media.removeEventListener?.('change', onMediaChange);
  }, [mobileDrawerOpen]);

  const isMobileSheetOpen = mobileDrawerOpen && activeSelectedId !== subjectRootId;

  useEffect(() => {
    if (!isMobileSheetOpen) return undefined;
    const dialog = detailRef.current;
    if (!dialog) return undefined;

    drawerCloseRef.current?.focus({ preventScroll: true });

    const focusableSelector = 'button:not([disabled]), a[href], summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeMobileDrawer();
        return;
      }
      if (event.key !== 'Tab' || !dialog.contains(document.activeElement)) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
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

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [closeMobileDrawer, isMobileSheetOpen]);

  const selectSubject = useCallback((nextSubject: Subject) => {
    setMobileDrawerOpen(false);
    if (nextSubject === subject) return;
    setSearchParams(new URLSearchParams({ subject: nextSubject }));
  }, [setSearchParams, subject]);

  const selectNode = useCallback((knowledgePointId: string, explicitTrigger?: HTMLElement | null) => {
    const nextNode = nodeById.get(knowledgePointId);
    if (!nextNode || nextNode.point.subject !== subject) return;
    if (knowledgePointId === subjectRootIdRef.current) {
      setMobileDrawerOpen(false);
    } else {
      openMobileDrawerFromTrigger(explicitTrigger);
    }
    if (knowledgePointId === activeSelectedIdRef.current) return;

    const next = new URLSearchParams({ subject });
    if (nextNode.childIds.length === 0 || pack?.concepts.find((concept) => concept.id === knowledgePointId)?.level === 'chapter') next.set('node', knowledgePointId);
    activeSelectedIdRef.current = knowledgePointId;
    navigate({ search: `?${next.toString()}` });
  }, [navigate, nodeById, openMobileDrawerFromTrigger, subject, pack]);

  const selectConcept = useCallback((row: ConceptStateRow) => {
    const cellTrigger = pageRootRef.current?.querySelector<HTMLElement>(`[data-concept="${CSS.escape(row.conceptId)}"]`);
    const openedDrawer = openMobileDrawerFromTrigger(cellTrigger);
    if (row.conceptId !== activeSelectedIdRef.current) {
      activeSelectedIdRef.current = row.conceptId;
      navigate({ search: `?${new URLSearchParams({ subject: row.subject, node: row.conceptId }).toString()}` });
    }
    if (!openedDrawer) {
      // On desktop, the register sits above the detail panel; bring the answer to the click into view.
      detailRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [navigate, openMobileDrawerFromTrigger]);

  const stateById = useMemo(() => new Map(register.concepts.map((row) => [row.conceptId, row.state])), [register.concepts]);
  const selectedState = register.concepts.find((row) => row.conceptId === activeSelectedId);
  // A chapter or subject root has no state of its own; summarise the leaves underneath it instead.
  const selectedLeafStates = (() => {
    if (!selectedNode || !selectedNode.childIds.length || !stateById.size) return null;
    const counts = { unstarted: 0, practicing: 0, consolidating: 0, stable: 0 };
    const stack = [...selectedNode.childIds];
    while (stack.length) {
      const node = nodeById.get(stack.pop()!);
      if (!node) continue;
      if (node.childIds.length) stack.push(...node.childIds);
      else counts[stateById.get(node.point.id) ?? 'unstarted']++;
    }
    return counts;
  })();
  const selectedToday = Boolean(activeSelectedId && register.todayPlan.conceptIds.includes(activeSelectedId));
  const stableCount = register.concepts.filter((row) => row.state === 'stable').length;

  const startPractice = async () => {
    if (!targetPracticeIds.length || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession(targetPracticeIds, 'review');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : '专项练习创建失败');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page knowledge-page" ref={pageRootRef}>
      <header className="today-hero">
        <div>
          <h1>知识证据图</h1>
          {register.concepts.length > 0 && <p className="today-statement"><b>{register.concepts.length}</b> 个概念 · 稳定 <span className="today-figure">{stableCount}</span></p>}
          <p className="today-breakdown">按科目、章节和概念跨年学习，每条关联均绑定题目版本和来源。</p>
        </div>
        <button type="button" className="secondary-command" disabled={!targetPracticeIds.length || starting} onClick={() => void startPractice()}>
          <Play size={17} aria-hidden="true" />{starting ? '创建中' : '练当前节点'}
        </button>
      </header>

      <p className="knowledge-status">{pack ? `概念关联 ${conceptQuestions.length} / ${questions.length} 题 · ${pack.cards.length} 张记忆卡 · ${pack.articles?.length ?? 0} 篇短讲解` : '学习包不可用，概念关联暂停。'}</p>
      {learningError && <p className="sec-inline-alert" role="alert">{learningError}</p>}
      {pack && conceptQuestions.length !== questions.length && <p className="sec-inline-alert" role="alert">部分题目缺少匹配版本的映射，已排除这些题目的概念统计。</p>}

      <ConceptRegister concepts={register.concepts} todayConceptIds={register.todayPlan.conceptIds} selectedId={activeSelectedId} onSelect={selectConcept} />

      <section className="knowledge-toolbar" aria-label="科目选择">
        <div className="segmented-control">
          {subjects.map((item) => (
            <button key={item.id} type="button" aria-pressed={subject === item.id} className={subject === item.id ? 'active' : ''} onClick={() => selectSubject(item.id)}>
              <SubjectShape subject={item.id} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="knowledge-coverage"><Target size={16} /><span>已检测 {assessedLeaves} / {leafCount}</span></div>
      </section>

      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="knowledge-workspace">
        <section className="knowledge-graph-panel" aria-labelledby="knowledge-graph-heading">
          <div className="section-heading">
            <h2 id="knowledge-graph-heading">题目证据关系</h2>
            {subjectRootId ? (
              <button
                type="button"
                className="secondary-command compact-command knowledge-root-command"
                aria-label={`${subjectLabel}科目总览`}
                aria-pressed={activeSelectedId === subjectRootId}
                onClick={() => selectNode(subjectRootId)}
              >
                <Network size={15} aria-hidden="true" />
                科目总览
              </button>
            ) : <Network size={20} aria-hidden="true" />}
          </div>
          <KnowledgeGraph
            forest={forest}
            states={stateById}
            subject={subject}
            selectedId={activeSelectedId}
            onSelect={selectNode}
          />
          <ul className="register-legend knowledge-graph-legend" aria-label="图例">
            {[...STATE_ORDER].reverse().map((state) => <li key={state}><i className={`bit is-${state}`} aria-hidden="true" />{STATE_LABELS[state]}</li>)}
            <li><i className="graph-legend-group" aria-hidden="true" />章节</li>
          </ul>
        </section>

        {isMobileSheetOpen && (
          <div className="knowledge-drawer-backdrop" aria-hidden="true" onClick={closeMobileDrawer} />
        )}

        <aside
          className={isMobileSheetOpen ? 'knowledge-detail-panel is-drawer-open' : 'knowledge-detail-panel'}
          role={isMobileSheetOpen ? 'dialog' : undefined}
          aria-label={isMobileSheetOpen ? `${selectedNode?.point.name ?? '知识点'}详情` : undefined}
          aria-live={isMobileSheetOpen ? undefined : 'polite'}
          ref={detailRef}
        >
          {isMobileSheetOpen && (
            <div className="knowledge-drawer-bar">
              <span className="knowledge-drawer-grab" aria-hidden="true" />
              <button
                ref={drawerCloseRef}
                type="button"
                className="icon-command knowledge-drawer-close"
                aria-label="关闭概念详情"
                onClick={closeMobileDrawer}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          )}
          {selectedNode && selectedPerformance ? (
            <>
              <span className={`subject-tag subject-${selectedNode.point.subject} sec-subject-chip`}>
                <SubjectShape subject={selectedNode.point.subject} />
                <span>{subjectLabel}</span>
              </span>
              <h2>{selectedNode.point.name}</h2>
              {selectedState && <>
                <p className="concept-state"><i className={`bit is-${selectedState.state}`} aria-hidden="true" />{STATE_LABELS[selectedState.state]}{selectedToday && <small>今日任务涉及</small>}</p>
                <dl className="concept-evidence" aria-label="学习记录">
                  <div><dt>已练题目</dt><dd>{selectedState.attemptedQuestions} / {selectedState.questionCount}</dd></div>
                  <div><dt>记忆卡</dt><dd>{selectedState.cardCount} 张{selectedState.dueCards > 0 && ` · 到期 ${selectedState.dueCards}`}</dd></div>
                  <div><dt>最近学习</dt><dd>{selectedState.lastActivityAt ? beijingDate(new Date(selectedState.lastActivityAt)) : '还没有记录'}</dd></div>
                  <div><dt>作答证据</dt><dd>{selectedPerformance.evidenceAttemptIds.length} 条</dd></div>
                </dl>
              </>}
              {!selectedState && <>
                {selectedLeafStates && <p className="concept-group-states">{STATE_ORDER.map((state) => <span key={state}><i className={`bit is-${state}`} aria-hidden="true" />{STATE_LABELS[state]} {selectedLeafStates[state]}</span>)}</p>}
                <dl className="concept-evidence" aria-label="学习记录">
                  <div><dt>已检测题目</dt><dd>{selectedPerformance.assessedQuestionCount} / {selectedPerformance.totalQuestionCount}</dd></div>
                  <div><dt>作答证据</dt><dd>{selectedPerformance.evidenceAttemptIds.length} 条</dd></div>
                </dl>
              </>}
              {selectedNode.childIds.length === 0 ? <div className="evidence-question-list" aria-label="关联题目">
                {selectedNode.questionIds.slice(0, QUESTION_CHIP_LIMIT).map((questionId) => {
                  const question = questions.find((entry) => entry.id === questionId);
                  return <Link key={questionId} to={`/questions?question=${questionId}`}>{questionLabel(question)}</Link>;
                })}
                {selectedNode.questionIds.length > QUESTION_CHIP_LIMIT && <span className="evidence-question-more">另有 {selectedNode.questionIds.length - QUESTION_CHIP_LIMIT} 题</span>}
              </div> : <p className="evidence-question-summary">共关联 {selectedNode.questionIds.length} 道跨年题目。选择下方的知识点查看具体题目。</p>}

              {prioritizedIds.length > 0 && (
                <div className="knowledge-quota-bar">
                  <span className="knowledge-quota-label">题量（默认错题与未做优先）</span>
                  <div className="segmented-control knowledge-quota-control" role="group" aria-label="专项练习题量">
                    {([5, 10, 'all'] as const).map((quota) => {
                      const disabled = quota !== 'all' && prioritizedIds.length < quota;
                      const active = !disabled && effectiveQuota === quota;
                      const text = quota === 'all' ? `全部 (${prioritizedIds.length})` : `${quota} 题`;
                      return (
                        <button
                          key={String(quota)}
                          type="button"
                          aria-pressed={active}
                          className={active ? 'active' : ''}
                          disabled={disabled}
                          onClick={() => setPracticeQuota(quota)}
                        >
                          {text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button className="primary-command knowledge-start" disabled={!targetPracticeIds.length || starting} onClick={() => void startPractice()}>
                <BookOpenCheck size={17} />专项练习 {targetPracticeIds.length} 题
              </button>
              {selectedLabLink && (
                <button className="secondary-command knowledge-start knowledge-lab-link" onClick={() => navigate(selectedLabLink.destination)} title={selectedLabLink.label}>
                  <FlaskConical size={17} />打开对应实验
                </button>
              )}
              <h3>相关记忆卡（{selectedCards.length}）</h3>
              <Link to={`/review?concept=${activeSelectedId}`}>查看概念卡片</Link>
              <details><summary>映射与内容信息</summary><p>学习包 {pack?.version} · 映射与公共卡片待审核，原始来源保留在题目详情。</p></details>
            </>
          ) : <div className="empty-result"><Network size={24} /><p>选择一个知识节点查看证据</p></div>}
        </aside>
      </div>

      {article && <article className="study-panel concept-article" aria-labelledby="concept-article-title">
        <h2 id="concept-article-title">{selectedNode?.point.name} · 短讲解</h2>
        <LazyContentRenderer blocks={article.explanation} />
        <h3>跟着算一遍</h3><LazyContentRenderer blocks={article.workedExample} />
        <h3>容易弄错的地方</h3><LazyContentRenderer blocks={article.commonMistake} />
        <div className="command-row">
          <Link to={`/review?concept=${article.conceptId}`}>复习相关卡片</Link>
          {article.labPath && <Link to={article.labPath}>进入相关实验</Link>}
        </div>
        <details><summary>讲解来源与版本</summary>
          <p>版本 {article.version} · AI 辅助原创讲解 · 待审核。例题为自编，原卷用于概念定位。</p>
          <ul>{article.sources.map((source) => <li key={source.questionId}><Link to={`/questions?question=${source.questionId}`}>{questionLabel(questions.find((entry) => entry.id === source.questionId))}</Link> · {source.locator} · 题面 {source.questionContentVersion}</li>)}</ul>
        </details>
      </article>}
      <section className="knowledge-topic-section">
        <div className="section-heading"><h2>知识点列表</h2></div>
        <div className="knowledge-topic-list">
          {subjectNodes.filter((node) => node.childIds.length === 0).map((node) => {
            const state = stateById.get(node.point.id);
            return (
              <button
                key={node.point.id}
                aria-pressed={activeSelectedId === node.point.id}
                className={activeSelectedId === node.point.id ? 'selected' : ''}
                onClick={(event) => {
                  selectNode(node.point.id, event.currentTarget);
                }}
              >
                <span><strong>{node.point.name}</strong><small>{node.questionIds.length} 道跨年题目 · {pack?.concepts.find((concept) => concept.id === node.point.parentId)?.name}</small></span>
                <span className="topic-performance">{state && <><i className={`bit is-${state}`} aria-hidden="true" />{STATE_LABELS[state]}</>}</span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
