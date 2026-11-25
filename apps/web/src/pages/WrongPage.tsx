import { ArrowRight, BookOpenCheck, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Subject } from '@408os/domain';
import { useStudy } from '../app/StudyContext';
import { LazyContentRenderer } from '../components/LazyContentRenderer';
import { SubjectShape } from '../components/SubjectShape';
import { useAction } from '../app/useAction';

const subjectLabels: Record<Subject, string> = {
  'data-structures': '数据结构',
  'computer-organization': '组成原理',
  'operating-systems': '操作系统',
  'computer-networks': '计算机网络',
};

const masteryLabels = {
  unseen: '未练习',
  learning: '学习中',
  familiar: '熟悉',
  mastered: '已掌握',
} as const;

export function WrongPage() {
  const { questions, currentProgress, createSession } = useStudy();
  const navigate = useNavigate();
  const action = useAction();
  const [year, setYear] = useState('all');

  const allWrongCount = questions.filter((question) => currentProgress.get(question.id)?.lastCorrect === false).length;
  const wrongQuestions = questions.filter(
    (question) => currentProgress.get(question.id)?.lastCorrect === false && (year === 'all' || String(question.year) === year),
  );
  const years = [...new Set(questions.map((question) => question.year))].sort((left, right) => right - left);

  const start = async (ids = wrongQuestions.map((question) => question.id)) => {
    await action.run(async () => {
      const id = await createSession(ids, 'review');
      navigate(`/practice/${id}`);
    });
  };

  return (
    <div className="page wrong-page sec-page sec-wrong">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>错题重练</h1>
          <p className="sec-statement">
            {wrongQuestions.length > 0 ? (
              <>待处理错题 <b>{wrongQuestions.length}</b> 题</>
            ) : (
              <>当前没有待处理错题</>
            )}
          </p>
          <p className="sec-subtitle">按当前题面最近一次客观作答筛选；原始作答完整保留在历史轮次中。</p>
        </div>
        <div className="sec-header-actions">
          <nav className="sec-mode-switch" aria-label="复习与错题切换">
            <Link className="sec-mode-tab" to="/review">复习</Link>
            <span className="sec-mode-tab is-active" aria-current="page">
              <span>错题</span>
              {allWrongCount > 0 && <span className="sec-tab-badge">{allWrongCount}</span>}
            </span>
          </nav>
          {wrongQuestions.length > 0 && (
            <button type="button" className="primary-command" disabled={action.busy} onClick={() => void start()}>
              <RotateCcw size={16} aria-hidden="true" />
              <span>开始重练</span>
            </button>
          )}
        </div>
      </header>

      <div className="sec-wrong-toolbar">
        <label className="select-field sec-inline-select">
          <span>错题年份</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">全部年份</option>
            {years.map((value) => <option key={value} value={String(value)}>{value}</option>)}
          </select>
        </label>
        <span className="sec-wrong-count">
          共 <strong className="sec-mono-num">{wrongQuestions.length}</strong> 题
        </span>
      </div>

      {action.error && <p className="sec-inline-alert" role="alert">{action.error}</p>}

      {wrongQuestions.length ? (
        <section className="question-list wrong-list sec-q-list" aria-label="错题列表">
          {wrongQuestions.map((question) => {
            const entry = currentProgress.get(question.id);
            const mastery = entry?.mastery ?? 'unseen';
            return (
              <article className="question-row sec-wrong-row" key={question.id}>
                <span className="question-number static">{String(question.number).padStart(2, '0')}</span>
                <div className="question-row-content">
                  <div className="question-meta">
                    <span className={`subject-tag subject-${question.subject} sec-subject-chip`}>
                      <SubjectShape subject={question.subject} />
                      <span>{subjectLabels[question.subject]}</span>
                    </span>
                    <span className="sec-q-year">{question.year}</span>
                    <span className="sec-wrong-tally">当前题面错误 <strong className="sec-mono-num">{entry?.wrongCount ?? 0}</strong> 次</span>
                    <span className={`mastery-chip mastery-${mastery}`}>{masteryLabels[mastery]}</span>
                  </div>
                  <LazyContentRenderer blocks={question.stem.filter((block) => block.type !== 'image').slice(0, 1)} compact />
                </div>
                <button type="button" className="secondary-command sec-retry-btn" disabled={action.busy} onClick={() => void start([question.id])}>
                  <span>重练此题</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="large-empty sec-empty-box">
          <BookOpenCheck size={30} aria-hidden="true" />
          <h2>当前没有错题</h2>
          <p>新的错误作答会自动进入这里，方便集中重练。</p>
          <button type="button" className="secondary-command" onClick={() => navigate('/questions')}>进入真题</button>
        </div>
      )}
    </div>
  );
}
