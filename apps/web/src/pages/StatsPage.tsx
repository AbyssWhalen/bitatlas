import {
  buildActivityCalendar,
  buildKnowledgeForest,
  filterCurrentAttempts,
  summarizePracticeEvidence,
} from '@408os/domain';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, Play, Target, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { useBeijingDate } from '../app/useBeijingDate';
import { useConceptQuestions, useLearning } from '../app/LearningContext';
import { SubjectShape } from '../components/SubjectShape';
import { useConceptRegister } from '../app/useConceptRegister';

const subjects = [
  { key: 'data-structures', label: '数据结构', barClass: 'sec-bar-ds' },
  { key: 'computer-organization', label: '组成原理', barClass: 'sec-bar-co' },
  { key: 'operating-systems', label: '操作系统', barClass: 'sec-bar-os' },
  { key: 'computer-networks', label: '计算机网络', barClass: 'sec-bar-cn' },
] as const;

export function StatsPage() {
  const { attempts, createSession, questions, stats } = useStudy();
  const { pack, evidence, events } = useLearning();
  const conceptQuestions = useConceptQuestions();
  const register = useConceptRegister();
  const navigate = useNavigate();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const today = useBeijingDate();
  const currentAttempts = useMemo(() => filterCurrentAttempts(attempts, questions), [attempts, questions]);
  const evidenceStats = summarizePracticeEvidence(currentAttempts, evidence);
  const heatmap = useMemo(() => buildActivityCalendar(currentAttempts, {
    today: new Date(`${today}T00:00:00+08:00`),
    timeZone: 'Asia/Shanghai',
    weeks: 12,
  }), [currentAttempts, today]);
  const forest = useMemo(() => buildKnowledgeForest(pack?.concepts ?? [], conceptQuestions), [pack, conceptQuestions]);
  const nodeById = useMemo(
    () => new Map(forest.nodes.map((node) => [node.point.id, node])),
    [forest.nodes],
  );
  const weakPoints = register.concepts
    .filter((entry) => entry.state === 'practicing' && register.objectiveByConcept.get(entry.conceptId) === 'needs-review')
    .slice(0, 5);
  const unassessedCount = register.concepts.filter((entry) => register.objectiveByConcept.get(entry.conceptId) === 'untested').length;

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
    <div className="page stats-page sec-page sec-stats">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>学习统计</h1>
          <p className="sec-statement">
            {stats.attempted > 0 ? (
              <>累计有效作答 <b>{stats.attempted}</b> 次</>
            ) : (
              <>当前版本暂无作答记录</>
            )}
          </p>
          <p className="sec-subtitle">当前题面版本的客观作答、卡片自评、有效停留与薄弱知识证据。</p>
        </div>
        <div className="sec-header-actions">
          <button type="button" className="secondary-command" onClick={() => navigate('/knowledge')}>
            <span>知识证据图</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="metric-grid three sec-metric-grid" aria-label="核心指标">
        <article>
          <div className="sec-metric-label"><BarChart3 size={16} aria-hidden="true" /><span>有效作答</span></div>
          <strong className="sec-mono-num">{stats.attempted}</strong>
        </article>
        <article>
          <div className="sec-metric-label"><CheckCircle2 size={16} aria-hidden="true" /><span>答对题次</span></div>
          <strong className="sec-mono-num">{stats.correct}</strong>
        </article>
        <article>
          <div className="sec-metric-label"><Timer size={16} aria-hidden="true" /><span>记录用时（含旧计时）</span></div>
          <strong><span className="sec-mono-num">{Math.round(stats.durationMs / 60_000)}</span><small> 分钟</small></strong>
        </article>
      </section>

      <section className="study-panel sec-panel sec-evidence-panel">
        <div className="sec-panel-head">
          <h2>区分学习证据</h2>
        </div>
        <dl className="sec-evidence-grid">
          <div>
            <dt>无提示客观首答</dt>
            <dd>
              <strong className="sec-mono-num">{evidenceStats.eligible ? `${Math.round(100 * evidenceStats.correct / evidenceStats.eligible)}%` : '暂无'}</strong>
              <span className="sec-evidence-sub sec-mono-num">（{evidenceStats.correct}/{evidenceStats.eligible}）</span>
            </dd>
          </div>
          <div>
            <dt>提示后答对</dt>
            <dd className="sec-mono-num">{evidenceStats.hintedCorrect}/{evidenceStats.hinted}</dd>
          </div>
          <div>
            <dt>主观自评 / 卡片自评</dt>
            <dd><span className="sec-mono-num">{evidenceStats.subjective}</span> 次 / <span className="sec-mono-num">{events.length}</span> 次</dd>
          </div>
          <div>
            <dt>前台有效停留</dt>
            <dd><span className="sec-mono-num">{Math.round(evidenceStats.activeDurationMs / 60000)}</span> 分钟</dd>
          </div>
        </dl>
        <p className="sec-evidence-note">
          旧记录的过程证据未知 <span className="sec-mono-num">{evidenceStats.unknown}</span> 条；用时仅作参考，不用于推断掌握度。
        </p>
      </section>

      <div className="stats-layout sec-stats-grid">
        <section className="subject-accuracy sec-panel">
          <div className="sec-panel-head">
            <h2>科目客观作答（含辅助）</h2>
          </div>
          {subjects.map(({ key, label, barClass }) => {
            const value = stats.bySubject[key];
            const percent = value.accuracy === null ? 0 : Math.round(value.accuracy * 100);
            return (
              <div className="accuracy-row sec-accuracy-row" key={key}>
                <div className="sec-accuracy-head">
                  <span className="sec-subject-inline"><SubjectShape subject={key} /><span>{label}</span></span>
                  <strong className="sec-mono-num">{value.attempted ? `${percent}%` : '--'}</strong>
                </div>
                <div className="accuracy-track sec-accuracy-track">
                  <span className={barClass} style={{ width: `${percent}%` }} />
                </div>
                <small className="sec-mono-num">{value.correct} / {value.attempted}</small>
              </div>
            );
          })}
        </section>

        <section className="activity-section sec-panel">
          <div className="sec-panel-head">
            <h2>练习热力图</h2>
            <span className="sec-muted-meta"><CalendarDays size={15} aria-hidden="true" />近 12 周</span>
          </div>
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
          <div className="heatmap-meta sec-mono-num">
            <span>{heatmap.startDate}</span>
            <span>{heatmap.today}</span>
          </div>
          <div className="heatmap-legend">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}
            <span>多</span>
          </div>
          {attempts.length > currentAttempts.length && (
            <small className="version-filter-note">
              <span className="sec-mono-num">{attempts.length - currentAttempts.length}</span> 条旧题面记录未计入当前统计
            </small>
          )}
        </section>
      </div>

      <section className="weakness-section sec-panel">
        <div className="sec-panel-head">
          <h2>薄弱知识点</h2>
          <div className="weakness-summary">
            <Target size={16} aria-hidden="true" />
            <span><span className="sec-mono-num">{unassessedCount}</span> 个概念暂无客观首答证据</span>
          </div>
        </div>
        {startError && <div className="sec-inline-alert" role="alert">{startError}</div>}
        {register.error ? <p role="alert">{register.error}</p> : register.loading ? <p role="status">正在读取概念证据…</p> : weakPoints.length ? (
          <div className="weakness-list sec-weakness-list">
            {weakPoints.map((entry) => {
              const subjectInfo = subjects.find((item) => item.key === entry.subject);
              return (
                <article key={entry.conceptId}>
                  <div>
                    <span className={`subject-tag subject-${entry.subject} sec-subject-chip`}>
                      <SubjectShape subject={entry.subject} />
                      <span>{subjectInfo?.label}</span>
                    </span>
                    <strong>{entry.name}</strong>
                    <small>
                      已练 <span className="sec-mono-num">{entry.attemptedQuestions}/{entry.questionCount}</span> 题
                    </small>
                  </div>
                  <div className="diagnostic-concept-state" data-state={entry.state}>
                    <strong>练习中</strong>
                    <span>有客观错答待复习</span>
                  </div>
                  <button type="button" className="secondary-command compact-command" disabled={startingId !== null || !nodeById.get(entry.conceptId)?.questionIds.length} onClick={() => void startWeakPoint(entry.conceptId)}>
                    <Play size={15} aria-hidden="true" />
                    <span>{startingId === entry.conceptId ? '创建中' : '专项练习'}</span>
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-result compact-empty">
            <CheckCircle2 size={22} aria-hidden="true" />
            <p>当前没有需要复习的客观错答概念；未检测不代表已掌握。</p>
          </div>
        )}
      </section>
    </div>
  );
}
