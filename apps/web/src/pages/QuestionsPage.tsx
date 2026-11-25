import { Bookmark, Cpu, Database, ListFilter, Play, RotateCcw, Search, Shuffle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { filterQuestions, questionAvailability, type Subject } from '@408os/domain';
import { useStudy } from '../app/StudyContext';
import { LazyContentRenderer } from '../components/LazyContentRenderer';
import { useAction } from '../app/useAction';
import { useConceptQuestions, useLearning } from '../app/LearningContext';
import { storage } from '../app/storage';
import { SERVER_MODE } from '../app/server-mode';
import { DEFAULT_QUESTION_FILTERS, parseQuestionFilters, type QuestionBrowserFilters } from '../app/question-filters';
import { SubjectShape } from '../components/SubjectShape';

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

const masteryLabels = {
  unseen: '未练习',
  learning: '学习中',
  familiar: '熟悉',
  mastered: '已掌握',
} as const;

export function QuestionsPage() {
  const { packs, questions: originalQuestions, currentProgress, collections, createSession, assets } = useStudy();
  const { pack: learningPack } = useLearning();
  const mappedQuestions = useConceptQuestions();
  const mappedById = new Map(mappedQuestions.map((question) => [question.id, question]));
  const questions = originalQuestions.map((question) => mappedById.get(question.id) ?? question);
  const [params] = useSearchParams();
  const requestedQuestion = params.get('question');
  const requestedYear = params.get('year');
  const action = useAction();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_QUESTION_FILTERS);
  const [filterError, setFilterError] = useState('');
  const [filtersReady, setFiltersReady] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const { search, subject, state, year: effectiveYear, chapter, concept } = filters;

  useEffect(() => {
    let active = true;
    void storage.reviewRepository.getSetting('question-browser.filters').then(async (setting) => {
      const saved = parseQuestionFilters(setting?.value);
      const year = requestedYear && /^\d{4}$/.test(requestedYear) ? Number(requestedYear) : null;
      const next = year !== null && year >= 2009 && year <= 2100 ? { ...saved, year } : saved;
      if (active) { setFilters(next); setFiltersReady(true); }
      if (next !== saved) await storage.reviewRepository.saveSetting('question-browser.filters', next);
    }).catch(() => { if (active) { setFilterError('筛选偏好读取或保存失败，请重开页面后重试。'); setFiltersReady(true); } });
    return () => { active = false; };
  }, [requestedYear]);

  const updateFilters = (patch: Partial<QuestionBrowserFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setVisibleCount(60);
    void storage.reviewRepository.saveSetting('question-browser.filters', next).then(
      () => setFilterError(''), () => setFilterError('筛选偏好保存失败；当前筛选仍然有效。'),
    );
  };

  const resetFilters = () => {
    updateFilters({ ...DEFAULT_QUESTION_FILTERS });
  };

  const years = useMemo(() => [...new Set(packs.map((pack) => pack.year))].sort((left, right) => right - left), [packs]);
  const packAvailable = packs.length > 0 && questions.length > 0;
  const yearScoped = useMemo(
    () => requestedQuestion ? questions.filter((question) => question.id === requestedQuestion) : (effectiveYear === null ? questions : questions.filter((question) => question.year === effectiveYear)),
    [effectiveYear, questions, requestedQuestion],
  );
  const chapters = learningPack?.concepts.filter((item) => item.level === 'chapter' && (subject === 'all' || item.subject === subject)) ?? [];
  const concepts = learningPack?.concepts.filter((item) => item.level === 'concept' && (subject === 'all' || item.subject === subject) && (!chapter || item.parentId === chapter)) ?? [];
  const conceptIds = new Set(concepts.map((item) => item.id));
  const filtered = requestedQuestion ? yearScoped : filterQuestions(yearScoped, {
    search,
    ...(subject === 'all' ? {} : { subjects: [subject] }),
    ...(state === 'unseen' ? { mastery: ['unseen'] } : {}),
    ...(state === 'wrong' ? { onlyWrong: true } : {}),
    ...(state === 'collected' ? { onlyCollected: true } : {}),
  }, currentProgress, collections).filter((question) => (!chapter && !concept) || question.knowledgePointIds.some((id) => concept ? id === concept : conceptIds.has(id)));
  const practiceIds = filtered.filter((question) => questionAvailability(question, assets).practice).map((question) => question.id);
  const hasActiveFilter = Boolean(search.trim() || subject !== 'all' || state !== 'all' || effectiveYear !== null || chapter || concept);

  const start = async (ids: string[], shuffle = false) => {
    if (!packAvailable || !ids.length) return;
    await action.run(async () => {
      const id = await createSession(ids, state === 'wrong' ? 'review' : 'practice', shuffle);
      navigate(`/practice/${id}`);
    });
  };

  return (
    <div className="page questions-page sec-page sec-questions">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>真题浏览</h1>
          <p className="sec-statement">
            {requestedQuestion ? (
              <>定位到 <b>{filtered.length}</b> 题</>
            ) : effectiveYear !== null ? (
              <><span className="sec-num">{effectiveYear}</span> 年真题 · <b>{filtered.length}</b> 题</>
            ) : (
              <>当前范围 <b>{filtered.length}</b> 题</>
            )}
          </p>
          <p className="sec-subtitle">
            全库共 <span className="sec-num">{questions.length}</span> 题，按年份、科目、章节和概念定位练习范围，自动记住筛选。
          </p>
        </div>
        <div className="header-actions sec-header-actions">
          <button type="button" className="secondary-command" disabled={!packAvailable || !practiceIds.length || action.busy} onClick={() => void start(practiceIds, true)}>
            <Shuffle size={16} aria-hidden="true" />
            <span>随机</span>
          </button>
          <button type="button" className="primary-command" disabled={!packAvailable || !practiceIds.length || action.busy} onClick={() => void start(practiceIds)}>
            <Play size={16} aria-hidden="true" />
            <span>练习 {practiceIds.length} 题</span>
          </button>
        </div>
      </header>

      {action.error && <p className="sec-inline-alert" role="alert">{action.error}</p>}
      {filterError && <p className="sec-inline-alert" role="alert">{filterError}</p>}
      {action.busy && <p className="sec-inline-status" role="status">正在保存新的练习轮次…</p>}

      {packAvailable ? (
        <>
          <section className="filter-band sec-filter-panel" aria-label="题目筛选">
            <div className="sec-filter-top">
              <label className="search-field">
                <Search size={16} aria-hidden="true" />
                <input
                  disabled={!filtersReady}
                  value={search}
                  onChange={(event) => updateFilters({ search: event.target.value })}
                  placeholder="搜索题干、公式或题号"
                />
              </label>
              <label className="select-field">
                <span>章节</span>
                <select aria-label="章节筛选" disabled={!filtersReady} value={chapter} onChange={(event) => updateFilters({ chapter: event.target.value, concept: '' })}>
                  <option value="">全部章节</option>
                  {chapters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="select-field">
                <span>概念</span>
                <select aria-label="概念筛选" disabled={!filtersReady} value={concept} onChange={(event) => updateFilters({ concept: event.target.value })}>
                  <option value="">全部概念</option>
                  {concepts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="select-field">
                <ListFilter size={15} aria-hidden="true" />
                <select aria-label="状态筛选" disabled={!filtersReady} value={state} onChange={(event) => updateFilters({ state: event.target.value as typeof state })}>
                  <option value="all">全部状态</option>
                  <option value="unseen">未练习</option>
                  <option value="wrong">当前错题</option>
                  <option value="collected">已收藏</option>
                </select>
              </label>
              {hasActiveFilter && (
                <button type="button" className="sec-reset-btn" disabled={!filtersReady} onClick={resetFilters}>
                  <RotateCcw size={14} aria-hidden="true" /> 重置
                </button>
              )}
            </div>

            <div className="sec-filter-row">
              <span className="sec-filter-label">年份</span>
              <div className="segmented-control" aria-label="年份筛选">
                <button type="button" disabled={!filtersReady} className={effectiveYear === null ? 'active' : ''} aria-pressed={effectiveYear === null} onClick={() => updateFilters({ year: null })}>全部年份</button>
                {years.map((item) => (
                  <button key={item} type="button" disabled={!filtersReady} className={effectiveYear === item ? 'active' : ''} aria-pressed={effectiveYear === item} onClick={() => updateFilters({ year: item })}>{item}</button>
                ))}
              </div>
            </div>

            <div className="sec-filter-row">
              <span className="sec-filter-label">科目</span>
              <div className="segmented-control" aria-label="科目筛选">
                {subjects.map((item) => (
                  <button key={item.value} type="button" disabled={!filtersReady} className={subject === item.value ? 'active' : ''} aria-pressed={subject === item.value} onClick={() => updateFilters({ subject: item.value, chapter: '', concept: '' })}>
                    {item.value !== 'all' && <SubjectShape subject={item.value} />}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="result-summary sec-result-bar">
            <div className="sec-result-count">
              <span>筛选结果</span>
              <strong>{filtered.length}</strong>
              <span>题{filtered.length > visibleCount ? ` · 显示前 ${visibleCount} 题` : ''}</span>
            </div>
            {requestedQuestion && (
              <button type="button" className="sec-reset-btn" onClick={() => navigate('/questions')}>
                查看全部题目
              </button>
            )}
          </div>

          {filtered.length > 0 ? (
            <section className="question-list sec-q-list" aria-label="题目列表">
              {filtered.slice(0, visibleCount).map((question) => {
                const itemProgress = currentProgress.get(question.id);
                const availability = questionAvailability(question, assets);
                return (
                  <article key={question.id} className="question-row">
                    <button
                      type="button"
                      className="question-number"
                      disabled={!availability.practice || action.busy}
                      onClick={() => void start([question.id])}
                      title={`开始第 ${question.number} 题`}
                      aria-label={`开始第 ${question.number} 题`}
                    >
                      {String(question.number).padStart(2, '0')}
                    </button>
                    <div className="question-row-content">
                      <div className="question-meta">
                        <span className={`subject-tag subject-${question.subject} sec-subject-chip`}>
                          <SubjectShape subject={question.subject} />
                          <span>{subjectLabels[question.subject]}</span>
                        </span>
                        <span className="sec-q-year">{question.year}</span>
                        <span>{question.kind === 'single-choice' ? '单项选择' : '综合应用'}</span>
                        <span className={`mastery-chip mastery-${itemProgress?.mastery ?? 'unseen'}`}>
                          {masteryLabels[itemProgress?.mastery ?? 'unseen']}
                        </span>
                        {collections.has(question.id) && <Bookmark size={14} fill="currentColor" aria-label="已收藏" />}
                      </div>
                      <LazyContentRenderer blocks={question.stem.filter((block) => block.type !== 'image').slice(0, 1)} compact />
                      {!availability.practice && (
                        <p className="sec-q-paused">
                          暂停练习：{availability.reasons.join('；')}。
                          <a href={question.source.question.url} target="_blank" rel="noreferrer">查看原始来源</a>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="icon-command row-play"
                      disabled={!availability.practice || action.busy}
                      onClick={() => void start([question.id])}
                      title="快速开始"
                      aria-label={`快速开始第 ${question.number} 题`}
                    >
                      <Play size={16} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </section>
          ) : (
            <div className="empty-result">
              <Search size={24} aria-hidden="true" />
              <p>当前筛选条件下没有题目</p>
              {hasActiveFilter && (
                <button type="button" className="secondary-command" onClick={resetFilters}>清除筛选条件</button>
              )}
            </div>
          )}

          {filtered.length > visibleCount && (
            <button type="button" className="secondary-command sec-load-more" onClick={() => setVisibleCount((count) => count + 60)}>
              继续显示（还有 {filtered.length - visibleCount} 题）
            </button>
          )}
        </>
      ) : (
        <div className="large-empty content-pack-empty">
          <Database size={28} aria-hidden="true" />
          <h2>{SERVER_MODE ? '题库尚未就绪' : '本地题包未安装'}</h2>
          <p>{SERVER_MODE ? '当前账号尚未加载可用题库，请检查数据同步状态或稍后重试。' : '题包未安装或尚未部署；安装经过校验的题包后，此页才会启用。'}</p>
          <div className="command-row">
            <button type="button" className="secondary-command" onClick={() => navigate('/settings')}>
              <Database size={16} aria-hidden="true" />
              <span>打开数据设置</span>
            </button>
            <button type="button" className="primary-command" onClick={() => navigate('/lab')}>
              <Cpu size={16} aria-hidden="true" />
              <span>进入实验</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
