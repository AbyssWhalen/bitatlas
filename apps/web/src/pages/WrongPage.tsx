import { ArrowRight, BookOpenCheck, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LazyContentRenderer } from '../components/LazyContentRenderer';

export function WrongPage() {
  const { questions, currentProgress, createSession } = useStudy();
  const navigate = useNavigate();
  const masteryLabels = { unseen: '未练习', learning: '学习中', familiar: '熟悉', mastered: '已掌握' } as const;
  const wrongQuestions = questions.filter((question) => currentProgress.get(question.id)?.lastCorrect === false);
  const start = async () => {
    const id = await createSession(wrongQuestions.map((question) => question.id), 'review');
    navigate(`/practice/${id}`);
  };
  return (
    <div className="page wrong-page">
      <header className="page-header"><div><span className="eyebrow">REVIEW QUEUE</span><h1>错题重练</h1><p>只保留最近一次作答错误的题目。</p></div>{wrongQuestions.length > 0 && <button className="primary-command" onClick={() => void start()}><RotateCcw size={17} />开始重练</button>}</header>
      {wrongQuestions.length ? (
        <section className="question-list wrong-list">{wrongQuestions.map((question) => {
          const mastery = currentProgress.get(question.id)?.mastery ?? 'unseen';
          return (
            <article className="question-row" key={question.id}>
              <span className="question-number static">{String(question.number).padStart(2, '0')}</span>
              <div className="question-row-content">
                <div className="question-meta"><span>当前题面错误 {currentProgress.get(question.id)?.wrongCount ?? 0} 次</span><span className={`mastery-chip mastery-${mastery}`}>{masteryLabels[mastery]}</span></div>
                <LazyContentRenderer blocks={question.stem.filter((block) => block.type !== 'image').slice(0, 1)} compact />
              </div>
              <ArrowRight size={18} />
            </article>
          );
        })}</section>
      ) : <div className="large-empty"><BookOpenCheck size={34} /><h2>当前没有错题</h2><p>新的错误作答会自动进入这里。</p><button className="secondary-command" onClick={() => navigate('/questions')}>进入真题</button></div>}
    </div>
  );
}
