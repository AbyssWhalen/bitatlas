import { questionAvailability, type Question } from '@408os/domain';
import { useLearning } from '../app/LearningContext';
import { LazyContentRenderer } from './LazyContentRenderer';

export function QuestionSupplement({ question, includeOriginal = false }: { question: Question; includeOriginal?: boolean }) {
  const { pack } = useLearning();
  const entry = pack?.schemaVersion === 2 && pack.questionSupplements.find((item) =>
    item.questionId === question.id && item.questionContentVersion === question.contentVersion);
  if (!entry) return null;
  const label = entry.kind === 'erratum' ? '勘误' : 'AI 辅助补充';
  return <section className="explanation-section rl-explanation-section rl-reading" aria-label={label}>
    {includeOriginal && (questionAvailability(question).explanationMissing
      ? <p className="rl-explanation-missing">本题文字解析缺失。</p>
      : question.explanation.map((section) => <div key={section.id}><h3>{section.title}</h3><LazyContentRenderer blocks={section.content} /></div>))}
    <h3>{label} {entry.reviewStatus === 'needs-review' && <small className="draft-badge">待审核</small>}</h3>
    {entry.kind === 'erratum' && <blockquote>原解析：“{entry.originalExcerpt}”</blockquote>}
    <LazyContentRenderer blocks={entry.body} />
    <details><summary>查看依据</summary>
      <ul>{entry.sources.map((source) => <li key={source.role}>
        {source.role === 'answer' ? '答案卷' : '题卷'} · 第 {source.pages.join('、')} 页 · {source.locator}
      </li>)}</ul>
    </details>
  </section>;
}
