import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MISTAKE_LABELS, MISTAKE_REASONS, type MistakeReason, type PracticeEvidence } from '@408os/domain';
import { useLearning } from '../app/LearningContext';
import { useStudy } from '../app/StudyContext';
import { useAction } from '../app/useAction';
import { storage } from '../app/storage';
import { firstQuestionLabLink } from '../app/lab-links';

function MistakeForm({ evidence }: { evidence: PracticeEvidence }) {
  const [reason, setReason] = useState<MistakeReason | ''>(evidence.mistakeReason ?? '');
  const [note, setNote] = useState(evidence.mistakeNote);
  const [saved, setSaved] = useState(false);
  const action = useAction();

  return (
    <form
      className="mistake-form sec-mistake-form"
      onSubmit={(event) => {
        event.preventDefault();
        void action.run(async () => {
          const { mistakeReason: _old, ...rest } = evidence;
          void _old;
          await storage.reviewRepository.savePracticeEvidence(
            {
              ...rest,
              ...(reason ? { mistakeReason: reason } : {}),
              mistakeNote: note,
              revision: evidence.revision + 1,
              updatedAt: new Date().toISOString(),
            },
            evidence.revision,
          );
          setSaved(true);
        });
      }}
    >
      <div className="sec-mistake-fields">
        <label>
          <span>错因</span>
          <select
            aria-label={`错因 ${evidence.questionId}`}
            value={reason}
            onChange={(event) => { setSaved(false); setReason(event.target.value as MistakeReason | ''); }}
          >
            <option value="">尚未记录</option>
            {MISTAKE_REASONS.map((value) => <option key={value} value={value}>{MISTAKE_LABELS[value]}</option>)}
          </select>
        </label>
        <label>
          <span>补充笔记</span>
          <textarea
            aria-label={`错因笔记 ${evidence.questionId}`}
            value={note}
            placeholder="记录本题失误原因或易混点"
            onChange={(event) => { setSaved(false); setNote(event.target.value); }}
          />
        </label>
      </div>
      <div className="sec-mistake-footer">
        <button type="submit" className="secondary-command" disabled={action.busy}>保存错因</button>
        {saved && <span className="sec-saved-flag" role="status">已保存</span>}
      </div>
      {action.error && <p className="sec-inline-alert" role="alert">{action.error} 草稿仍保留，可复制后重新载入。</p>}
    </form>
  );
}

export function PracticeSummaryPage() {
  const { sessionId } = useParams();
  const { practices, evidence, contexts, pack, loading, error } = useLearning();
  const { attempts, questions, createSession } = useStudy();
  const action = useAction();
  const navigate = useNavigate();

  const session = practices.find((entry) => entry.id === sessionId);
  const items = attempts.filter((attempt) => attempt.sessionId === sessionId);
  const byQuestion = new Map(questions.map((question) => [question.id, question]));
  const byEvidence = new Map(evidence.filter((entry) => entry.sessionId === sessionId).map((entry) => [entry.questionId, entry]));

  const eligible = items.filter((attempt) => {
    const proof = byEvidence.get(attempt.questionId);
    return attempt.response.type === 'choice' && attempt.correct !== null && proof?.evidenceFromStart === true
      && proof.firstResponse?.type === 'choice' && proof.hintsUsed === 0 && !proof.answerRevealedAt;
  });
  const hinted = items.filter((attempt) => (byEvidence.get(attempt.questionId)?.hintsUsed ?? 0) > 0);
  const subjective = items.filter((attempt) => attempt.response.type === 'comprehensive');
  const unknown = items.filter((attempt) => !byEvidence.get(attempt.questionId)?.evidenceFromStart);
  const retryIds = items.filter((attempt) => attempt.correct === false
    || (attempt.response.type === 'comprehensive' && attempt.score !== null && byQuestion.get(attempt.questionId)?.answer.type === 'comprehensive'
      && attempt.score < (byQuestion.get(attempt.questionId)!.answer as { maxScore: number }).maxScore))
    .map((attempt) => attempt.questionId);
  const weak = pack?.mappings.filter((mapping) => retryIds.includes(mapping.questionId)
    && mapping.questionContentVersion === byQuestion.get(mapping.questionId)?.contentVersion) ?? [];
  const weakConcepts = [...new Set(weak.flatMap((mapping) => mapping.conceptIds))];
  const lab = firstQuestionLabLink(retryIds);
  const context = contexts.find((entry) => entry.sessionId === sessionId);

  const retry = async () => {
    const id = await createSession(retryIds, 'review', false, { parentSessionId: sessionId! });
    navigate(`/practice/${id}`);
  };

  if (!session) {
    return (
      <div className="page summary-page sec-page sec-summary">
        <header className="sec-header">
          <div className="sec-header-main">
            <h1>{loading ? '读取本轮总结…' : '本轮记录不可用'}</h1>
            <p className="sec-subtitle" role="status">{error || '请从复习历史选择已保存的练习。'}</p>
          </div>
          <Link className="sec-header-link" to="/review">返回复习中心</Link>
        </header>
      </div>
    );
  }

  const totalSeconds = Math.round(items.reduce((sum, attempt) => sum + (byEvidence.get(attempt.questionId)?.activeDurationMs ?? 0), 0) / 1000);

  return (
    <div className="page summary-page sec-page sec-summary">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>本轮总结</h1>
          <p className="sec-statement">
            已提交 <b>{items.length}</b> / <span className="sec-mono-num">{session.questionIds.length}</span> 题
          </p>
          <p className="sec-subtitle">
            未提交的题目不计入正确率；原始首答与过程证据保留在本轮记录中。
          </p>
        </div>
        <div className="sec-header-actions">
          <Link className="sec-header-link" to="/review">复习中心 →</Link>
        </div>
      </header>

      {context?.parentSessionId && (
        <p className="sec-inline-status">
          这是一次关联重练。<Link to={`/practice/${context.parentSessionId}/summary`}>查看原始轮次</Link>
        </p>
      )}

      <section className="metric-grid sec-metric-grid" aria-label="本轮证据">
        <article>
          <span>无提示首答正确率</span>
          <strong className="sec-mono-num">{eligible.length ? `${Math.round(100 * eligible.filter((attempt) => attempt.correct).length / eligible.length)}%` : '—'}</strong>
          <small>{eligible.length} 次有效客观首答</small>
        </article>
        <article>
          <span>使用提示</span>
          <strong className="sec-mono-num">{hinted.length}</strong>
          <small>其中答对 {hinted.filter((attempt) => attempt.correct === true).length} 题，单独展示</small>
        </article>
        <article>
          <span>主观自评</span>
          <strong className="sec-mono-num">{subjective.length}</strong>
          <small>不计入客观首答正确率</small>
        </article>
        <article>
          <span>有效停留</span>
          <strong><span className="sec-mono-num">{totalSeconds}</span><small> 秒</small></strong>
          <small>旧记录证据未知 {unknown.length} 条</small>
        </article>
      </section>

      <section className="study-panel sec-panel">
        <div className="sec-panel-head">
          <h2>接下来</h2>
        </div>
        <div className="command-row sec-next-actions">
          <button type="button" className="primary-command" disabled={!retryIds.length || action.busy} onClick={() => void action.run(retry)}>
            <RotateCcw size={16} aria-hidden="true" />
            <span>重练本轮错题（{retryIds.length}）</span>
          </button>
          <Link className="sec-action-link" to="/review#cards">复习记忆卡<ArrowRight size={15} aria-hidden="true" /></Link>
          {lab && <Link className="sec-action-link" to={lab.destination}>进入相关实验<ArrowRight size={15} aria-hidden="true" /></Link>}
        </div>
        {action.error && <p className="sec-inline-alert" role="alert">{action.error}</p>}

        <div className="sec-weak-concepts">
          <h3>薄弱概念</h3>
          {weakConcepts.length ? (
            <ul className="sec-concept-links">
              {weakConcepts.map((id) => {
                const concept = pack?.concepts.find((entry) => entry.id === id);
                return (
                  <li key={id}>
                    <Link to={`/knowledge?subject=${concept?.subject ?? 'data-structures'}&node=${id}`}>{concept?.name ?? '关联概念'}</Link>
                    <span aria-hidden="true">·</span>
                    <Link to={`/review?concept=${id}`}>相关卡片</Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="sec-panel-desc">本轮尚无可定位的薄弱概念。缺包或题面版本不匹配时不推断概念表现。</p>
          )}
        </div>
      </section>

      <section className="sec-summary-list" aria-label="逐题过程记录">
        {session.questionIds.map((id, index) => {
          const question = byQuestion.get(id);
          const proof = byEvidence.get(id);
          const attempt = items.find((entry) => entry.questionId === id);
          const isCorrect = attempt?.response.type === 'choice' && attempt.correct === true;
          const isWrong = attempt?.response.type === 'choice' && attempt.correct === false;
          const title = question ? `${question.year} · 第 ${question.number} 题` : `第 ${index + 1} 题`;
          return (
            <article key={id} className="study-panel sec-panel sec-summary-card">
              <div className="sec-summary-card-head">
                <h2>{title}</h2>
                <span className={`sec-outcome-tag ${isCorrect ? 'is-ok' : isWrong ? 'is-wrong' : 'is-neutral'}`}>
                  {isCorrect && <Check size={14} aria-hidden="true" />}
                  {isWrong && <X size={14} aria-hidden="true" />}
                  <span>
                    {!attempt
                      ? '未提交'
                      : attempt.response.type === 'choice'
                        ? attempt.correct ? '客观作答正确' : '客观作答错误'
                        : `主观自评：${attempt.score ?? '未评分'}`}
                  </span>
                </span>
              </div>
              <p className="sec-summary-proof">
                提示：{proof?.evidenceFromStart ? proof.hintsUsed : '未知'} · 答案揭示：{proof?.answerRevealedAt ? '已记录' : proof?.evidenceFromStart ? '未提前揭示' : '未知'}
              </p>
              {proof ? (
                <MistakeForm key={id} evidence={proof} />
              ) : (
                <p className="sec-panel-desc">旧记录未保存过程证据，保留原始作答，不补造首次回答或用时。</p>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
