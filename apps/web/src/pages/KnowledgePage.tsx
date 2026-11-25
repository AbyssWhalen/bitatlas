import {
  aggregateKnowledgePerformance,
  beijingDate,
  buildKnowledgeForest,
  questionAvailability,
  type Subject,
} from '@408os/domain';
import { BookOpenCheck, ChevronRight, FlaskConical, Network, Play, Target } from 'lucide-react';
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

/** Leaf concepts link to at most a few dozen questions; past that the list stops being scannable. */
const QUESTION_CHIP_LIMIT = 24;

function questionLabel(question: { year: number; number: number } | undefined) {
  return question ? `${question.year} Q${String(question.number).padStart(2, '0')}` : '题目（当前版本不可用）';
}

export function KnowledgePage() {
  const { attempts, createSession, questions, assets } = useStudy();
  const { pack, error: learningError } = useLearning();
  const conceptQuestions = useConceptQuestions();
  const register = useConceptRegister();
  const detailRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
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
  const selectedNode = activeSelectedId ? nodeById.get(activeSelectedId) : undefined;
  const selectedPerformance = activeSelectedId ? performanceById.get(activeSelectedId) : undefined;
  const article = pack?.articles?.find((entry) => entry.conceptId === activeSelectedId);
  const availableIds = selectedNode?.questionIds.filter((id) => {
    const question = questions.find((entry) => entry.id === id);
    return question && questionAvailability(question, assets).practice;
  }) ?? [];
  const selectedLabLink = firstQuestionLabLink(selectedNode?.questionIds ?? []);
  const assessedLeaves = subjectNodes.filter((node) => (
    node.childIds.length === 0 && performanceById.get(node.point.id)?.performance !== null
  )).length;
  const leafCount = subjectNodes.filter((node) => node.childIds.length === 0).length;
  const selectedCards = pack?.cards.filter((card) => card.conceptIds.some((id) => id === activeSelectedId
    || card.sources.some((source) => selectedNode?.questionIds.includes(source.questionId)))) ?? [];

  useEffect(() => {
    if (pack && searchParams.toString() !== canonicalSearch) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearch, canonicalSearchParams, searchParams, setSearchParams, pack]);

  useLayoutEffect(() => {
    activeSelectedIdRef.current = activeSelectedId;
  }, [activeSelectedId]);

  const selectSubject = useCallback((nextSubject: Subject) => {
    if (nextSubject === subject) return;
    setSearchParams(new URLSearchParams({ subject: nextSubject }));
  }, [setSearchParams, subject]);

  const selectNode = useCallback((knowledgePointId: string) => {
    const nextNode = nodeById.get(knowledgePointId);
    if (!nextNode || nextNode.point.subject !== subject) return;
    if (knowledgePointId === activeSelectedIdRef.current) return;

    const next = new URLSearchParams({ subject });
    if (nextNode.childIds.length === 0 || pack?.concepts.find((concept) => concept.id === knowledgePointId)?.level === 'chapter') next.set('node', knowledgePointId);
    activeSelectedIdRef.current = knowledgePointId;
    navigate({ search: `?${next.toString()}` });
  }, [navigate, nodeById, subject, pack]);

  const selectConcept = useCallback((row: ConceptStateRow) => {
    if (row.conceptId !== activeSelectedIdRef.current) {
      activeSelectedIdRef.current = row.conceptId;
      navigate({ search: `?${new URLSearchParams({ subject: row.subject, node: row.conceptId }).toString()}` });
    }
    // The register sits above the detail panel; bring the answer to the click into view.
    detailRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [navigate]);
  const stateById = useMemo(() => new Map(register.concepts.map((row) => [row.conceptId, row.state])), [register.concepts]);
  const selectedState = register.concepts.find((row) => row.conceptId === activeSelectedId);
  // A chapter or subject root has no state of its own; summarise the leaves underneath it instead.
  // At most a few dozen nodes per subject: cheap enough to walk on every render.
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
    if (!availableIds.length || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession(availableIds, 'review');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : '专项练习创建失败');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page knowledge-page">
      <header className="today-hero">
        <div>
          <h1>知识证据图</h1>
          {register.concepts.length > 0 && <p className="today-statement"><b>{register.concepts.length}</b> 个概念 · 稳定 <span className="today-figure">{stableCount}</span></p>}
          <p className="today-breakdown">按科目、章节和概念跨年学习，每条关联均绑定题目版本和来源。</p>
        </div>
        <button type="button" className="secondary-command" disabled={!availableIds.length || starting} onClick={() => void startPractice()}>
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

        <aside className="knowledge-detail-panel" aria-live="polite" ref={detailRef}>
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
              <button className="primary-command knowledge-start" disabled={!availableIds.length || starting} onClick={() => void startPractice()}>
                <BookOpenCheck size={17} />专项练习 {availableIds.length} 题
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
              <button key={node.point.id} aria-pressed={activeSelectedId === node.point.id} className={activeSelectedId === node.point.id ? 'selected' : ''} onClick={() => selectNode(node.point.id)}>
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
