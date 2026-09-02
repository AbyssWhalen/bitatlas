import { Bookmark, Cpu, Database, ListFilter, Play, Search, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { filterQuestions, type Subject } from '@408os/domain';
import { useStudy } from '../app/StudyContext';
import { LazyContentRenderer } from '../components/LazyContentRenderer';

const subjects: Array<{ value: Subject | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'data-structures', label: '数据结构' },
  { value: 'computer-organization', label: '组成原理' },
  { value: 'operating-systems', label: '操作系统' },
  { value: 'computer-networks', label: '计算机网络' },
];

const subjectLabels: Record<Subject, string> = {
  'data-structures': '数据结构',
  'computer-organization': '组成原理',
  'operating-systems': '操作系统',
  'computer-networks': '计算机网络',
};

export function QuestionsPage() {
  const { packs, questions, currentProgress, collections, createSession } = useStudy();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const [state, setState] = useState<'all' | 'unseen' | 'wrong' | 'collected'>('all');
  const years = useMemo(() => [...new Set(packs.map((pack) => pack.year))].sort((left, right) => right - left), [packs]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const effectiveYear = selectedYear ?? (years.includes(2009) ? 2009 : years[0]);
  const packAvailable = packs.length > 0 && questions.length > 0;
  const yearScoped = useMemo(
    () => (effectiveYear === undefined ? questions : questions.filter((question) => question.year === effectiveYear)),
    [effectiveYear, questions],
  );
  const filtered = useMemo(() => filterQuestions(yearScoped, {
    search,
    ...(subject === 'all' ? {} : { subjects: [subject] }),
    ...(state === 'unseen' ? { mastery: ['unseen'] } : {}),
    ...(state === 'wrong' ? { onlyWrong: true } : {}),
    ...(state === 'collected' ? { onlyCollected: true } : {}),
  }, currentProgress, collections), [collections, currentProgress, yearScoped, search, state, subject]);

  const start = async (ids: string[], shuffle = false) => {
    if (!packAvailable || !ids.length) return;
    const id = await createSession(ids, state === 'wrong' ? 'review' : 'practice', shuffle);
    navigate(`/practice/${id}`);
  };

  return (
    <div className="page questions-page">
      <header className="page-header">
        <div><span className="eyebrow">{effectiveYear ?? '—'} / {questions.length} QUESTIONS</span><h1>真题浏览</h1><p>按年份、科目、状态和题干内容定位练习范围。</p></div>
        <div className="header-actions">
          <button className="secondary-command" disabled={!packAvailable || !filtered.length} onClick={() => void start(filtered.map((question) => question.id), true)}><Shuffle size={17} />随机</button>
          <button className="primary-command" disabled={!packAvailable || !filtered.length} onClick={() => void start(filtered.map((question) => question.id))}><Play size={17} />练习 {filtered.length} 题</button>
        </div>
      </header>

      {packAvailable ? <><section className="filter-band">
        <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索题干、公式或题号" /></label>
        {years.length > 1 && <div className="segmented-control" aria-label="年份筛选">{years.map((item) => <button key={item} className={effectiveYear === item ? 'active' : ''} onClick={() => setSelectedYear(item)}>{item}</button>)}</div>}
        <div className="segmented-control" aria-label="科目筛选">{subjects.map((item) => <button key={item.value} className={subject === item.value ? 'active' : ''} onClick={() => setSubject(item.value)}>{item.label}</button>)}</div>
        <label className="select-field"><ListFilter size={17} /><select value={state} onChange={(event) => setState(event.target.value as typeof state)}><option value="all">全部状态</option><option value="unseen">未练习</option><option value="wrong">当前错题</option><option value="collected">已收藏</option></select></label>
      </section>

      <div className="result-summary"><span>筛选结果</span><strong>{filtered.length}</strong></div>
      <section className="question-list">
        {filtered.map((question) => {
          const itemProgress = currentProgress.get(question.id);
          return (
            <article key={question.id} className="question-row">
              <button className="question-number" onClick={() => void start([question.id])} title={`开始第 ${question.number} 题`} aria-label={`开始第 ${question.number} 题`}>{String(question.number).padStart(2, '0')}</button>
              <div className="question-row-content">
                <div className="question-meta"><span className={`subject-tag subject-${question.subject}`}>{subjectLabels[question.subject]}</span><span>{question.year}</span><span>{question.kind === 'single-choice' ? '单项选择' : '综合应用'}</span><span>{itemProgress?.mastery ?? 'unseen'}</span>{collections.has(question.id) && <Bookmark size={14} fill="currentColor" />}</div>
                <LazyContentRenderer blocks={question.stem.filter((block) => block.type !== 'image').slice(0, 1)} compact />
              </div>
              <button className="icon-command row-play" onClick={() => void start([question.id])} title="快速开始" aria-label={`快速开始第 ${question.number} 题`}><Play size={18} /></button>
            </article>
          );
        })}
      </section>
      {!filtered.length && <div className="empty-result"><Search size={24} /><p>当前筛选条件下没有题目</p></div>}</> : (
        <div className="large-empty content-pack-empty">
          <Database size={28} aria-hidden="true" />
          <h2>本地题包未安装</h2>
          <p>题包未安装或尚未部署；安装经过校验的题包后，此页才会启用。</p>
          <div className="command-row">
            <button className="secondary-command" onClick={() => navigate('/settings')}><Database size={16} aria-hidden="true" />打开数据设置</button>
            <button className="primary-command" onClick={() => navigate('/lab')}><Cpu size={16} aria-hidden="true" />进入实验</button>
          </div>
        </div>
      )}
    </div>
  );
}
