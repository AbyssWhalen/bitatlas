import { Link, useNavigate } from 'react-router-dom';
import { SERVER_MODE } from '../app/server-mode';
import { useStudy } from '../app/StudyContext';
import { useLearning } from '../app/LearningContext';
import { useAction } from '../app/useAction';
import { useConceptRegister } from '../app/useConceptRegister';
import { DailyTasks } from '../components/DailyTasks';
import { STATE_LABELS, STATE_ORDER, SUBJECT_MARKS } from '../components/concept-labels';
import { SubjectShape } from '../components/SubjectShape';
import { questionAvailability } from '@408os/domain';

export function DashboardPage() {
  const { questions, currentProgress, assets } = useStudy();
  const availableQuestions = questions.filter((question) => questionAvailability(question, assets).practice);
  const { plan, loading, practices = [], contexts = [], rounds = [], conflicts = [] } = useLearning();
  const register = useConceptRegister();
  const hasConcepts = register.concepts.length > 0;
  const navigate = useNavigate();
  const action = useAction();
  const practiced = [...currentProgress.values()].filter((entry) => entry.attemptCount > 0).length;
  const wrong = [...currentProgress.values()].filter((entry) => entry.lastCorrect === false).length;
  const openRound = rounds.find((round) => !round.completedAt);
  const planQuestions = plan?.items.filter((item) => item.kind === 'question').length ?? 0;
  const planCards = (plan?.items.length ?? 0) - planQuestions;

  const contextBySession = new Map(contexts.map((ctx) => [ctx.sessionId, ctx]));
  const openStandalonePractice = [...practices]
    .filter((session) => {
      if (session.completedAt || session.mode === 'mock' || !session.questionIds.length) return false;
      const ctx = contextBySession.get(session.id);
      return !ctx?.dailyPlanId || ctx.dailyPlanId !== plan?.id;
    })
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];

  const openStandaloneRound = rounds.find(
    (round) => !round.completedAt && (!round.dailyPlanId || round.dailyPlanId !== plan?.id),
  );
  const hasStandaloneContinuation = Boolean(openStandalonePractice || openStandaloneRound);

  const resumeStandalone = async () => {
    if (openStandalonePractice) {
      navigate(`/practice/${openStandalonePractice.id}`);
      return;
    }
    if (openStandaloneRound) {
      navigate(`/review/cards/${openStandaloneRound.id}`);
    }
  };

  return <div className="page dashboard-page today-page">
    <header className="today-hero">
      <div>
        <h1>今日学习</h1>
        {plan?.items.length
          ? <p className="today-statement">今天 <b>{plan.items.length}</b> 项</p>
          : <p className="today-statement">{loading ? '正在准备今天的计划' : '今天没有排定的任务'}</p>}
        {plan?.items.length
          ? <p className="today-breakdown"><span>题目 {planQuestions}</span><span>记忆卡 {planCards}</span>{register.todayPlan.conceptIds.length > 0 && <span>涉及 {register.todayPlan.conceptIds.length} 个概念</span>}{hasConcepts && <span>本周已学 {register.weeklyStudyDays} 天</span>}</p>
          : !loading && <p className="today-breakdown"><Link to="/questions">去题库选题</Link><Link to="/lab">做一个实验</Link></p>}
        {practiced === 0 && availableQuestions.length > 0 && !loading && (
          <p className="today-newbie-guide">
            首次学习可先从下方今日任务起步；想按科目或年份自选，随时可前往<Link to="/questions">题库</Link>。
          </p>
        )}
      </div>
      {!availableQuestions.length && !loading ? (
        <button className="secondary-command" disabled>继续学习</button>
      ) : hasStandaloneContinuation ? (
        <button
          type="button"
          className="secondary-command"
          disabled={action.busy}
          onClick={() => void action.run(resumeStandalone)}
        >
          继续上次未完练习
        </button>
      ) : null}
    </header>
    {action.error && <p className="sec-inline-alert" role="alert">{action.error}</p>}
    <DailyTasks />
    {hasConcepts && <section className="subject-overview" aria-labelledby="subject-overview-title">
      <div className="subject-overview-head"><h2 id="subject-overview-title">四科概念</h2><Link to="/knowledge">打开概念寄存器 →</Link></div>
      <ul className="subject-overview-list">{register.subjects.map((counts) => {
        const mark = SUBJECT_MARKS[counts.subject];
        const total = STATE_ORDER.reduce((sum, state) => sum + counts[state], 0);
        if (!total) return null;
        return <li key={counts.subject}><Link to={`/knowledge?subject=${counts.subject}`}>
          <span className="subject-overview-name"><SubjectShape subject={counts.subject} />{mark.label}<span>{total} 个概念</span></span>
          <span className="register-meter" aria-hidden="true">{STATE_ORDER.map((state) => counts[state] ? <span key={state} className={`is-${state}`} style={{ flexGrow: counts[state] }} /> : null)}</span>
          <span className="subject-overview-counts">{STATE_ORDER.map((state) => <span key={state}>{STATE_LABELS[state]} {counts[state]}</span>)}</span>
        </Link></li>;
      })}</ul>
    </section>}
    <section className={`metric-grid${hasConcepts ? ' three' : ''}`} aria-label="学习概况">
      <article><span>已练题目</span><strong>{practiced}<small> / {questions.length}</small></strong></article>
      <article><span>待处理错题</span><strong>{wrong}</strong><Link to="/wrong">查看错题 →</Link></article>
      <article><span>继续复习</span><strong>{openRound ? openRound.cards.length - openRound.completedCardIds.length : 0}<small> 张</small></strong><Link to={openRound ? `/review/cards/${openRound.id}` : '/review'}>进入复习 →</Link></article>
      {!hasConcepts && <article><span>跨年知识</span><strong>四科</strong><Link to="/knowledge">查看概念与相关题目 →</Link></article>}
    </section>
    {conflicts.some((conflict) => !conflict.resolvedAt) && <p className="sec-inline-status" role="status">发现历史重复笔记，全部原文已保留。<Link to="/settings">前往合并</Link></p>}
    <section className="study-panel today-explore"><h2>继续探索</h2><p>读懂一个概念，做几道相关真题，再通过实验验证自己的理解。</p>
      <div className="command-row"><Link to="/questions">浏览历年真题</Link><Link to="/documents">{SERVER_MODE ? '共享资料' : '本地资料'}</Link><Link to="/lab">实验室</Link><Link to="/stats">学习统计</Link><Link to="/settings">备份与数据管理</Link></div></section>
  </div>;
}
