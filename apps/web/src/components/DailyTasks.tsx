import { beijingDate, questionAvailability } from '@408os/domain';
import { Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLearning, useLearningCards } from '../app/LearningContext';
import { useStudy } from '../app/StudyContext';
import { useAction } from '../app/useAction';
import { buildConceptNameMap, formatCardLabel } from './card-label';
import { useDailyCardRound } from './useDailyCardRound';

export function DailyTasks() {
  const { plan, loading, error, contexts, practices, pack } = useLearning();
  const { questions, attempts, currentProgress, createSession, assets } = useStudy();
  const cards = useLearningCards();
  const { cardById, completedCards, remainingCards, cardItems, startCards } = useDailyCardRound(cards);
  const navigate = useNavigate();
  const action = useAction();
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const assignedQuestionVersions = new Map(plan?.items.filter((item) => item.kind === 'question').map((item) => [item.targetId, item.contentVersion]));
  const completedQuestions = new Set(attempts.filter((attempt) => beijingDate(attempt.submittedAt) === plan?.date
    && assignedQuestionVersions.get(attempt.questionId) === attempt.questionContentVersion).map((attempt) => attempt.questionId));
  const remainingQuestions = plan?.items.filter((item) => item.kind === 'question' && !completedQuestions.has(item.targetId)) ?? [];
  const questionIds = remainingQuestions.filter((item) => {
    const question = questionById.get(item.targetId);
    return question?.contentVersion === item.contentVersion && questionAvailability(question, assets).practice;
  }).map((item) => item.targetId);
  const startQuestions = async () => {
    const open = contexts.filter((item) => item.dailyPlanId === plan?.id).map((item) => practices.find((practice) => practice.id === item.sessionId && !practice.completedAt)).find(Boolean);
    const id = open?.id ?? await createSession(questionIds, 'review', false, { dailyPlanId: plan!.id });
    navigate(`/practice/${id}`);
  };
  const conceptNames = buildConceptNameMap(pack?.concepts);
  // Cards carry no title; name them by their first known concept instead of exposing the internal id.
  const cardLabel = (id: string) => formatCardLabel(cardById.get(id), conceptNames);
  const total = plan?.items.length ?? 0;
  const doneCount = plan ? total - remainingQuestions.length - remainingCards.length : 0;
  const allCompleted = Boolean(plan && total > 0 && remainingQuestions.length === 0 && remainingCards.length === 0);

  const todayLatestByQuestion = new Map<string, boolean | null>();
  if (plan) {
    for (const attempt of attempts) {
      if (beijingDate(attempt.submittedAt) === plan.date) {
        todayLatestByQuestion.set(attempt.questionId, attempt.correct);
      }
    }
  }
  const todayWrongCount = [...todayLatestByQuestion.values()].filter((correct) => correct === false).length;
  const unresolvedWrongCount = [...(currentProgress?.values() ?? [])].filter((entry) => entry.lastCorrect === false).length;
  const wrongToReviewCount = Math.max(todayWrongCount, unresolvedWrongCount);

  return <section className="study-panel daily-plan-section task-board" aria-labelledby="daily-plan-title">
    <div className="section-heading"><div><span className="eyebrow">{plan?.date ?? '北京时间'} · DAILY PLAN</span><h2 id="daily-plan-title">今日任务</h2></div><span className="task-count">{doneCount} / {total}</span></div>
    <div className="task-meter" aria-hidden="true"><span style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
    <p className="task-rule">当天清单已固定。到期内容优先，新卡每天最多 {plan?.limits.newCards ?? 3} 张。完成一轮不代表已经掌握。</p>
    {loading ? <p role="status">正在准备学习内容…</p> : !plan && <p>学习包或题包不可用，无法生成今日任务。可前往题库与数据管理查看。</p>}
    {(error || action.error) && <p role="alert">{error || action.error}</p>}
    {allCompleted ? (
      <div className="task-complete-banner">
        <div className="task-complete-copy">
          <strong>
            <Check size={16} aria-hidden="true" />
            <span>今日计划已全部完成</span>
          </strong>
          <p>
            {wrongToReviewCount > 0
              ? `今日尚有 ${wrongToReviewCount} 道错题待巩固；概念“稳定”状态需经跨日间隔（≥ 3 天）复习后才会点亮。`
              : '概念“稳定”状态需经跨日复习间隔（≥ 3 天）验证后才会点亮，今天先把理解落稳即可。'}
          </p>
        </div>
        {wrongToReviewCount > 0 && (
          <Link className="secondary-command" to="/wrong">复盘待处理错题（{wrongToReviewCount}）</Link>
        )}
      </div>
    ) : (
      <div className="command-row">
        <button className="primary-command" disabled={action.busy || !questionIds.length} onClick={() => void action.run(startQuestions)}>开始剩余 {questionIds.length} 题</button>
        <button className="secondary-command" disabled={action.busy || !cardItems.length} onClick={() => void action.run(startCards)}>复习 {cardItems.length} 张卡片</button>
      </div>
    )}
    <ul className="task-list">{plan?.items.map((item, index) => {
      const question = item.kind === 'question' ? questionById.get(item.targetId) : undefined;
      const status = question ? questionAvailability(question, assets) : undefined;
      const available = item.kind === 'question' ? question?.contentVersion === item.contentVersion && status?.practice : cardById.get(item.targetId)?.version === item.contentVersion;
      const done = (item.kind === 'question' ? completedQuestions : completedCards).has(item.targetId);
      const state = done ? 'done' : !available ? 'blocked' : item.reason === 'unseen' ? 'new' : 'due';
      return <li key={`${item.kind}:${item.targetId}`} className={`task-ticket is-${state}`}><i className="task-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>
        <span className="task-name">{question ? `${question.year} · 第 ${question.number} 题` : item.kind === 'question' ? '题目（内容不可用）' : cardLabel(item.targetId)}</span>
        <span className="task-state">{done ? '已完成' : !available ? `不可用：${status?.reasons.length ? status.reasons.join('；') : '内容缺失、暂停或版本变化'}` : item.reason === 'unseen' ? '新内容' : '到期复习'}</span></li>;
    })}</ul>
  </section>;
}
