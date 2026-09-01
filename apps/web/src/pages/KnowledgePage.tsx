import {
  aggregateKnowledgePerformance,
  buildKnowledgeForest,
  type Subject,
} from '@408os/domain';
import { AlertTriangle, BookOpenCheck, ChevronRight, CircleCheck, FlaskConical, Network, Play, Target } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { firstQuestionLabLink } from '../app/lab-links';
import { KnowledgeGraph } from '../components/KnowledgeGraph';

const subjects: Array<{ id: Subject; label: string }> = [
  { id: 'data-structures', label: '数据结构' },
  { id: 'computer-organization', label: '组成原理' },
  { id: 'operating-systems', label: '操作系统' },
  { id: 'computer-networks', label: '计算机网络' },
];

function percent(value: number | null): string {
  return value === null ? '未检测' : `${Math.round(value * 100)}%`;
}

export function KnowledgePage() {
  const { attempts, createSession, knowledgePoints, packs, questions, reviewSummary } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const forest = useMemo(() => buildKnowledgeForest(knowledgePoints, questions), [knowledgePoints, questions]);
  const analytics = useMemo(
    () => aggregateKnowledgePerformance(attempts, questions, forest),
    [attempts, forest, questions],
  );
  const nodeById = useMemo(() => new Map(forest.nodes.map((node) => [node.point.id, node])), [forest]);
  const performanceById = useMemo(
    () => new Map(analytics.points.map((entry) => [entry.knowledgePointId, entry])),
    [analytics],
  );
  const requestedSubject = searchParams.get('subject');
  const subject = subjects.some((item) => item.id === requestedSubject)
    ? requestedSubject as Subject
    : 'data-structures';
  const subjectNodes = useMemo(
    () => forest.nodes.filter((node) => node.point.subject === subject),
    [forest, subject],
  );
  const subjectLabel = subjects.find((item) => item.id === subject)?.label ?? subject;

  const subjectRootId = forest.rootIds.find((id) => nodeById.get(id)?.point.subject === subject) ?? null;
  const defaultSelectedId = subjectRootId
    ?? subjectNodes[0]?.point.id
    ?? null;
  const requestedNodeId = searchParams.get('node');
  const requestedNode = requestedNodeId ? nodeById.get(requestedNodeId) : undefined;
  const validRequestedNodeId = requestedNode?.point.subject === subject && requestedNode.childIds.length === 0
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
  const selectedLabLink = firstQuestionLabLink(selectedNode?.questionIds ?? []);
  const assessedLeaves = subjectNodes.filter((node) => (
    node.childIds.length === 0 && performanceById.get(node.point.id)?.performance !== null
  )).length;
  const leafCount = subjectNodes.filter((node) => node.childIds.length === 0).length;
  const packStatus = packs.find((pack) => pack.year === 2009)?.reviewStatus ?? 'unavailable';
  const packVerified = packStatus === 'verified';

  useEffect(() => {
    if (searchParams.toString() !== canonicalSearch) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearch, canonicalSearchParams, searchParams, setSearchParams]);

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
    if (nextNode.childIds.length === 0) next.set('node', knowledgePointId);
    activeSelectedIdRef.current = knowledgePointId;
    navigate({ search: `?${next.toString()}` });
  }, [navigate, nodeById, subject]);

  const startPractice = async () => {
    if (!selectedNode?.questionIds.length || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession(selectedNode.questionIds, 'review');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : '专项练习创建失败');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page knowledge-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">2009 EVIDENCE MAP</span>
          <h1>知识证据图</h1>
          <p>从当前题面和可评估作答实时聚合，节点均可追溯到原题。</p>
        </div>
        <button className="primary-command" disabled={!selectedNode?.questionIds.length || starting} onClick={() => void startPractice()}>
          <Play size={17} />{starting ? '创建中' : '练当前节点'}
        </button>
      </header>

      <div className={`review-warning knowledge-status ${packVerified ? 'verified' : ''}`}>
        {packVerified ? <CircleCheck size={17} /> : <AlertTriangle size={17} />}
        <span>当前内容层级为 4 个科目与 47 个题目级知识点，题包状态为 {packStatus}。</span>
        <strong>{packVerified ? 'verified' : `${reviewSummary.approved}/${reviewSummary.total}`}</strong>
      </div>

      <section className="knowledge-toolbar" aria-label="科目选择">
        <div className="segmented-control">
          {subjects.map((item) => (
            <button key={item.id} aria-pressed={subject === item.id} className={subject === item.id ? 'active' : ''} onClick={() => selectSubject(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="knowledge-coverage"><Target size={16} /><span>已检测 {assessedLeaves} / {leafCount}</span></div>
      </section>

      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="knowledge-workspace">
        <section className="knowledge-graph-panel" aria-labelledby="knowledge-graph-heading">
          <div className="section-heading">
            <div><span className="eyebrow">RELATIONSHIP</span><h2 id="knowledge-graph-heading">题目证据关系</h2></div>
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
            performance={analytics.points}
            subject={subject}
            selectedId={activeSelectedId}
            onSelect={selectNode}
          />
          <div className="knowledge-legend" aria-label="图例">
            <span><i className="evidence-unassessed" />未检测</span>
            <span><i className="evidence-weak" />低于 50%</span>
            <span><i className="evidence-learning" />50% - 79%</span>
            <span><i className="evidence-strong" />80% 以上</span>
          </div>
        </section>

        <aside className="knowledge-detail-panel" aria-live="polite">
          {selectedNode && selectedPerformance ? (
            <>
              <span className={`subject-tag subject-${selectedNode.point.subject}`}>{subjectLabel}</span>
              <h2>{selectedNode.point.name}</h2>
              <div className="knowledge-score">
                <strong>{percent(selectedPerformance.performance)}</strong>
                <span>最近三次有效证据加权</span>
              </div>
              <dl className="knowledge-facts">
                <div><dt>关联题目</dt><dd>{selectedPerformance.totalQuestionCount}</dd></div>
                <div><dt>已检测题目</dt><dd>{selectedPerformance.assessedQuestionCount}</dd></div>
                <div><dt>证据记录</dt><dd>{selectedPerformance.evidenceAttemptIds.length}</dd></div>
                <div><dt>覆盖率</dt><dd>{Math.round(selectedPerformance.coverage * 100)}%</dd></div>
              </dl>
              <div className="evidence-question-list" aria-label="关联题目">
                {selectedNode.questionIds.map((questionId) => {
                  const question = questions.find((entry) => entry.id === questionId);
                  return <span key={questionId}>Q{String(question?.number ?? questionId.slice(-2)).padStart(2, '0')}</span>;
                })}
              </div>
              <button className="primary-command knowledge-start" disabled={!selectedNode.questionIds.length || starting} onClick={() => void startPractice()}>
                <BookOpenCheck size={17} />专项练习 {selectedNode.questionIds.length} 题
              </button>
              {selectedLabLink && (
                <button className="secondary-command knowledge-start knowledge-lab-link" onClick={() => navigate(selectedLabLink.destination)} title={selectedLabLink.label}>
                  <FlaskConical size={17} />打开对应实验
                </button>
              )}
            </>
          ) : <div className="empty-result"><Network size={24} /><p>选择一个知识节点查看证据</p></div>}
        </aside>
      </div>

      <section className="knowledge-topic-section">
        <div className="section-heading"><div><span className="eyebrow">ACCESSIBLE INDEX</span><h2>知识点列表</h2></div></div>
        <div className="knowledge-topic-list">
          {subjectNodes.filter((node) => node.childIds.length === 0).map((node) => {
            const metric = performanceById.get(node.point.id);
            return (
              <button key={node.point.id} aria-pressed={activeSelectedId === node.point.id} className={activeSelectedId === node.point.id ? 'selected' : ''} onClick={() => selectNode(node.point.id)}>
                <span><strong>{node.point.name}</strong><small>{node.questionIds.map((id) => `Q${id.slice(-2)}`).join(' / ')}</small></span>
                <span className="topic-performance">{percent(metric?.performance ?? null)}</span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
