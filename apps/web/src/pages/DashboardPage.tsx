import { buildDailyReviewPlan } from '@408os/domain';
import { ArrowRight, BookOpen, CalendarCheck2, Check, CircleCheck, Clock3, Flame, Play, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';

const subjectMeta = {
  'data-structures': { label: '数据结构', color: '#287a5a' },
  'computer-organization': { label: '计算机组成原理', color: '#d04c35' },
  'operating-systems': { label: '操作系统', color: '#d29822' },
  'computer-networks': { label: '计算机网络', color: '#3d64a6' },
} as const;

export function DashboardPage() {
  const { attempts, packs, questions, stats, currentProgress, reviewSummary, createSession, getLatestSession } = useStudy();
  const navigate = useNavigate();
  const [startingPlan, setStartingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const attempted = currentProgress.size;
  const mastered = [...currentProgress.values()].filter((entry) => entry.mastery === 'mastered').length;
  const wrong = [...currentProgress.values()].filter((entry) => entry.lastCorrect === false).length;
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  // 2009 是旗舰年份：总览页的复习卡片、科目分布与顺序练习都限定 2009；
  // 其他年份通过 /questions 的年份筛选练习，日计划保持跨年份。
  const questions2009 = useMemo(() => questions.filter((question) => question.year === 2009), [questions]);
  const dailyPlan = useMemo(() => buildDailyReviewPlan(attempts, questions, {
    today: new Date(),
    timeZone: 'Asia/Shanghai',
    dailyLimit: 8,
  }), [attempts, questions]);
  const subjectCounts = useMemo(() => Object.entries(subjectMeta).map(([subject, meta]) => {
    const subjectQuestions = questions2009.filter((question) => question.subject === subject);
    const done = subjectQuestions.filter((question) => currentProgress.has(question.id)).length;
    return { subject, ...meta, total: subjectQuestions.length, done };
  }), [currentProgress, questions2009]);
  const remainingPlanIds = dailyPlan.items.filter((item) => !item.completedToday).map((item) => item.questionId);
  const manifest = packs.find((pack) => pack.year === 2009);
  const packVerified = manifest?.reviewStatus === 'verified';
  const hasQuestions = questions.length > 0;
  const has2009Questions = questions2009.length > 0;
  const choiceCount = questions2009.filter((question) => question.kind === 'single-choice').length;
  const comprehensiveCount = questions2009.filter((question) => question.kind === 'comprehensive').length;

  const startAll = async () => {
    if (!has2009Questions) return;
    const id = await createSession(questions2009.map((question) => question.id), 'practice');
    navigate(`/practice/${id}`);
  };

  const resume = async () => {
    if (!hasQuestions) return;
    const session = await getLatestSession();
    if (session) navigate(`/practice/${session.id}`);
    else await startAll();
  };

  const startDailyPlan = async () => {
    if (!remainingPlanIds.length || startingPlan) return;
    setStartingPlan(true);
    setPlanError(null);
    try {
      const id = await createSession(remainingPlanIds, 'review');
      navigate(`/practice/${id}`);
    } catch (reason) {
      setPlanError(reason instanceof Error ? reason.message : '今日计划创建失败');
      setStartingPlan(false);
    }
  };

  return (
    <div className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <span className="eyebrow">2028 备考工作台</span>
          <h1>学习总览</h1>
          <p>{!hasQuestions ? '本地题包未安装，当前可直接使用实验模块。' : attempted === 0 ? '从 2009 年真题建立第一条学习记录。' : `已完成 ${attempted} 道，继续处理当前薄弱项。`}</p>
        </div>
        <button className="primary-command" disabled={!hasQuestions} onClick={() => void resume()}><Play size={18} fill="currentColor" />继续学习</button>
      </header>

      <div className={`review-warning ${packVerified ? 'verified' : ''}`}>
        {packVerified ? <CircleCheck size={17} /> : <Flame size={17} />}
        <span>{!manifest ? '本地 2009 题包未安装。' : packVerified ? '2009 Verified 题包已激活。' : '2009 题包等待逐题人工复核。'}</span>
        <strong>{!manifest ? 'unavailable' : packVerified ? 'verified' : `${reviewSummary.approved}/${reviewSummary.total}`}</strong>
        {!manifest
          ? <button className="secondary-command" onClick={() => navigate('/lab')}>进入实验<ArrowRight size={16} /></button>
          : !packVerified && <button className="secondary-command" onClick={() => navigate('/review/2009')}>进入复核<ArrowRight size={16} /></button>}
      </div>

      <section className="metric-grid" aria-label="学习指标">
        <article><BookOpen /><span>已练题目</span><strong>{attempted}<small> / {questions.length}</small></strong></article>
        <article><CircleCheck /><span>客观正确率</span><strong>{stats.accuracy === null ? '--' : `${Math.round(stats.accuracy * 100)}%`}</strong></article>
        <article><Clock3 /><span>累计用时</span><strong>{Math.round(stats.durationMs / 60_000)}<small> 分钟</small></strong></article>
        <article><RotateCcw /><span>当前错题</span><strong>{wrong}</strong></article>
      </section>

      <section className="daily-plan-section" aria-labelledby="daily-plan-title">
        <div className="section-heading daily-plan-heading">
          <div><span className="eyebrow">DAILY REVIEW / {dailyPlan.date}</span><h2 id="daily-plan-title">今日复习计划</h2></div>
          <div className="daily-plan-actions">
            <span><CalendarCheck2 size={16} />{dailyPlan.completedCount} / {dailyPlan.items.length}</span>
            <button className="primary-command" disabled={!remainingPlanIds.length || startingPlan} onClick={() => void startDailyPlan()}>
              {remainingPlanIds.length ? <Play size={16} /> : <Check size={16} />}
              {startingPlan ? '创建中' : remainingPlanIds.length ? `开始剩余 ${remainingPlanIds.length} 题` : '今日已完成'}
            </button>
          </div>
        </div>
        {planError && <div className="status-message error" role="alert">{planError}</div>}
        {dailyPlan.items.length ? <div className="daily-plan-list">
          {dailyPlan.items.map((item) => {
            const question = questionById.get(item.questionId)!;
            const reason = item.reason === 'overdue' ? '逾期复习' : item.reason === 'due' ? '今日到期' : '新题补充';
            return (
              <article key={item.questionId} className={item.completedToday ? 'completed' : ''}>
                <span className="daily-plan-number">Q{String(question.number).padStart(2, '0')}</span>
                <div><strong>{subjectMeta[question.subject].label}</strong><small>{item.dueOn ? `到期 ${item.dueOn}` : '按记忆间隔排入'}</small></div>
                <span className={`daily-plan-state reason-${item.reason}`}>{item.completedToday ? '已完成' : reason}</span>
              </article>
            );
          })}
        </div> : <div className="empty-result compact-empty"><CalendarCheck2 size={22} /><p>安装题包后生成每日复习计划</p></div>}
      </section>

      <div className="dashboard-columns">
        <section className="year-band">
          <div className="section-heading"><div><span className="eyebrow">历年真题</span><h2>2009 全国统考</h2></div><span className="pack-status">{has2009Questions ? `${questions2009.length} 题` : '未安装'}</span></div>
          <div className="year-progress"><span style={{ width: `${questions2009.length ? (questions2009.filter((question) => currentProgress.has(question.id)).length / questions2009.length) * 100 : 0}%` }} /></div>
          <div className="year-facts">
            <span><strong>{choiceCount}</strong> 单项选择</span><span><strong>{comprehensiveCount}</strong> 综合应用</span><span><strong>{mastered}</strong> 已掌握</span>
          </div>
          <div className="command-row">
            <button className="primary-command" disabled={!has2009Questions} onClick={() => void startAll()}><Play size={17} />顺序练习</button>
            <button className="secondary-command" onClick={() => navigate('/questions')}>筛选题目<ArrowRight size={17} /></button>
          </div>
        </section>

        <section className="subject-progress-section">
          <div className="section-heading"><div><span className="eyebrow">科目分布</span><h2>完成进度</h2></div></div>
          <div className="subject-progress-list">
            {subjectCounts.map((item) => (
              <div key={item.subject} className="subject-progress-row">
                <div><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.done}/{item.total}</strong></div>
                <div className="thin-progress"><span style={{ width: `${item.total ? (item.done / item.total) * 100 : 0}%`, background: item.color }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
