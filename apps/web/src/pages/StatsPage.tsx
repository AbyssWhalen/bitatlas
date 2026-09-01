import {
  aggregateKnowledgePerformance,
  buildActivityCalendar,
  buildKnowledgeForest,
  filterCurrentAttempts,
} from '@408os/domain';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, Play, Target, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';

const subjects = [
  ['data-structures', '数据结构', '#287a5a'],
  ['computer-organization', '组成原理', '#d04c35'],
  ['operating-systems', '操作系统', '#d29822'],
  ['computer-networks', '计算机网络', '#3d64a6'],
] as const;

export function StatsPage() {
  const { attempts, createSession, knowledgePoints, questions, stats } = useStudy();
  const navigate = useNavigate();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const currentAttempts = useMemo(() => filterCurrentAttempts(attempts, questions), [attempts, questions]);
  const heatmap = useMemo(() => buildActivityCalendar(currentAttempts, {
    today: new Date(),
    timeZone: 'Asia/Shanghai',
    weeks: 12,
  }), [currentAttempts]);
  const knowledge = useMemo(() => {
    const forest = buildKnowledgeForest(knowledgePoints, questions);
    return {
      forest,
      performance: aggregateKnowledgePerformance(attempts, questions, forest),
    };
  }, [attempts, knowledgePoints, questions]);
  const nodeById = useMemo(
    () => new Map(knowledge.forest.nodes.map((node) => [node.point.id, node])),
    [knowledge.forest.nodes],
  );
  const leafIds = useMemo(
    () => new Set(knowledge.forest.nodes.filter((node) => node.childIds.length === 0).map((node) => node.point.id)),
    [knowledge.forest.nodes],
  );
  const weakPoints = knowledge.performance.weakPoints
    .filter((entry) => leafIds.has(entry.knowledgePointId) && (entry.performance ?? 1) < 0.8)
    .slice(0, 5);
  const unassessedCount = knowledge.performance.unassessedPoints.filter((entry) => leafIds.has(entry.knowledgePointId)).length;

  const startWeakPoint = async (knowledgePointId: string) => {
    const node = nodeById.get(knowledgePointId);
    if (!node?.questionIds.length || startingId) return;
    setStartingId(knowledgePointId);
    setStartError(null);
    try {
      const sessionId = await createSession(node.questionIds, 'review');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : '专项练习创建失败');
      setStartingId(null);
    }
  };

  return (
    <div className="page stats-page">
      <header className="page-header">
        <div><span className="eyebrow">LOCAL ANALYTICS</span><h1>学习统计</h1><p>当前题面版本的作答、耗时与知识证据。</p></div>
        <button className="secondary-command" onClick={() => navigate('/knowledge')}>知识证据图<ArrowRight size={17} /></button>
      </header>

      <section className="metric-grid three">
        <article><BarChart3 /><span>有效作答</span><strong>{stats.attempted}</strong></article>
        <article><CheckCircle2 /><span>答对题次</span><strong>{stats.correct}</strong></article>
        <article><Timer /><span>累计用时</span><strong>{Math.round(stats.durationMs / 60_000)}<small> 分钟</small></strong></article>
      </section>

      <div className="stats-layout">
        <section className="subject-accuracy">
          <div className="section-heading"><div><span className="eyebrow">ACCURACY</span><h2>科目正确率</h2></div></div>
          {subjects.map(([key, label, color]) => {
            const value = stats.bySubject[key];
            const percent = value.accuracy === null ? 0 : Math.round(value.accuracy * 100);
            return (
              <div className="accuracy-row" key={key}>
                <div><span>{label}</span><strong>{value.attempted ? `${percent}%` : '--'}</strong></div>
                <div className="accuracy-track"><span style={{ width: `${percent}%`, background: color }} /></div>
                <small>{value.correct} / {value.attempted}</small>
              </div>
            );
          })}
        </section>

        <section className="activity-section">
          <div className="section-heading"><div><span className="eyebrow">LAST 12 WEEKS</span><h2>练习热力图</h2></div><CalendarDays size={20} /></div>
          <div className="heatmap" aria-label="最近十二周练习热力图">
            {heatmap.weeks.flatMap((week) => week.days).map((day) => (
              <span
                key={day.date}
                title={`${day.date}: ${day.future ? '未来日期' : `${day.count} 次`}`}
                data-level={day.level}
                data-future={day.future ? 'true' : undefined}
              />
            ))}
          </div>
          <div className="heatmap-meta">
            <span>{heatmap.startDate}</span><span>{heatmap.today}</span>
          </div>
          <div className="heatmap-legend"><span>少</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}<span>多</span></div>
          {attempts.length > currentAttempts.length && (
            <small className="version-filter-note">{attempts.length - currentAttempts.length} 条旧题面记录未计入当前统计</small>
          )}
        </section>
      </div>

      <section className="weakness-section">
        <div className="section-heading">
          <div><span className="eyebrow">ACTIONABLE EVIDENCE</span><h2>薄弱知识点</h2></div>
          <div className="weakness-summary"><Target size={17} /><span>{unassessedCount} 个知识点尚未检测</span></div>
        </div>
        {startError && <div className="status-message error" role="alert">{startError}</div>}
        {weakPoints.length ? (
          <div className="weakness-list">
            {weakPoints.map((entry) => {
              const node = nodeById.get(entry.knowledgePointId)!;
              const score = Math.round((entry.performance ?? 0) * 100);
              return (
                <article key={entry.knowledgePointId}>
                  <div>
                    <span className={`subject-tag subject-${entry.subject}`}>{subjects.find(([key]) => key === entry.subject)?.[1]}</span>
                    <strong>{node.point.name}</strong>
                    <small>{entry.evidenceAttemptIds.length} 条证据 · {entry.assessedQuestionCount}/{entry.totalQuestionCount} 题已检测</small>
                  </div>
                  <div className="weakness-score"><strong>{score}%</strong><span>当前表现</span></div>
                  <button className="secondary-command compact-command" disabled={startingId !== null} onClick={() => void startWeakPoint(entry.knowledgePointId)}>
                    <Play size={15} />{startingId === entry.knowledgePointId ? '创建中' : '专项练习'}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-result compact-empty"><CheckCircle2 size={22} /><p>当前没有低于 80% 的已检测知识点</p></div>
        )}
      </section>
    </div>
  );
}
