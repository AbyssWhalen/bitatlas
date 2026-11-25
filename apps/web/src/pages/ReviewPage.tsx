import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_REVIEW_LIMITS, type FlashcardDefinition, type PersonalCard, type ReviewLimits } from '@408os/domain';
import { useLearning, useLearningCards } from '../app/LearningContext';
import { useStudy } from '../app/StudyContext';
import { storage } from '../app/storage';
import { useAction } from '../app/useAction';
import { DailyTasks } from '../components/DailyTasks';
import { LazyContentRenderer } from '../components/LazyContentRenderer';

function cardSummaryLabel(
  card: Pick<FlashcardDefinition, 'conceptIds' | 'front'>,
  conceptsById: Map<string, string>,
): string {
  const conceptName = card.conceptIds.map((id) => conceptsById.get(id)).find(Boolean);
  const firstText = card.front.find((block): block is Extract<FlashcardDefinition['front'][number], { type: 'text' }> => block.type === 'text')?.text.trim() ?? '';
  const excerpt = firstText.length > 26 ? `${firstText.slice(0, 26)}…` : firstText;
  if (conceptName && excerpt) return `${conceptName} · ${excerpt}`;
  if (conceptName) return `${conceptName}记忆卡`;
  if (excerpt) return excerpt;
  return '记忆卡';
}

function LimitsForm({ initial }: { initial: ReviewLimits }) {
  const [limits, setLimits] = useState<ReviewLimits>({ ...initial });
  const [saved, setSaved] = useState(false);
  const action = useAction();
  return (
    <form
      id="limits"
      className="study-panel sec-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void action.run(async () => {
          await storage.reviewRepository.saveReviewLimits(limits, new Date().toISOString());
          setSaved(true);
        });
      }}
    >
      <div className="sec-panel-head">
        <h2>每日额度</h2>
      </div>
      <p className="sec-panel-desc">修改次日生效，今天已经分配的任务不会改变。每轮卡片最多 10 张。</p>
      <div className="sec-limits-grid">
        {([['questions', '题目'], ['cards', '卡片'], ['newCards', '其中新卡']] as const).map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              aria-label={`每日${label}`}
              type="number"
              min={key === 'newCards' ? 0 : 1}
              max={100}
              value={limits[key]}
              onChange={(event) => {
                setSaved(false);
                setLimits({ ...limits, [key]: Number(event.target.value) });
              }}
            />
          </label>
        ))}
      </div>
      <div className="command-row">
        <button type="submit" className="secondary-command" disabled={action.busy}>保存明日额度</button>
      </div>
      {saved && <p className="sec-inline-status" role="status">已保存，将于北京时间明天生效。</p>}
      {action.error && <p className="sec-inline-alert" role="alert">{action.error}</p>}
    </form>
  );
}

function CardEditor({ card, close }: { card?: FlashcardDefinition; close: () => void }) {
  const { pack, personal } = useLearning();
  const previous = personal.find((entry) => entry.id === card?.id || entry.baseCardId === card?.id);
  const initial = previous ?? card;
  const text = (blocks: FlashcardDefinition['front'] = []) => blocks.map((block) => block.type === 'text' ? block.text : block.type === 'math' ? `$${block.expression}$` : block.type === 'code' ? block.code : '').join('\n');
  const [front, setFront] = useState(text(initial?.front));
  const [back, setBack] = useState(text(initial?.back));
  const [conceptId, setConceptId] = useState(initial?.conceptIds[0] ?? pack?.concepts.find((concept) => concept.level === 'concept')?.id ?? '');
  const action = useAction();

  const save = async () => {
    const concept = pack?.concepts.find((entry) => entry.id === conceptId);
    if (!concept || !front.trim() || !back.trim()) throw new Error('正面、背面和概念均不能为空。');
    const revision = (previous?.revision ?? 0) + 1;
    const value: PersonalCard = {
      id: previous?.id ?? (card ? `personal:${card.id}` : crypto.randomUUID()),
      version: `personal:${revision}`,
      subject: concept.subject,
      conceptIds: [concept.id],
      front: [{ type: 'text', text: front.trim() }],
      back: [{ type: 'text', text: back.trim() }],
      sources: initial?.sources ?? [],
      reviewStatus: 'needs-review',
      ...(previous ? previous.baseCardId ? { baseCardId: previous.baseCardId } : {} : card ? { baseCardId: card.id } : {}),
      suspended: previous?.suspended ?? false,
      revision,
      updatedAt: new Date().toISOString(),
    };
    await storage.reviewRepository.savePersonalCard(value, previous?.revision ?? 0);
    close();
  };

  return (
    <form className="study-panel card-editor sec-editor" onSubmit={(event) => { event.preventDefault(); void action.run(save); }}>
      <div className="sec-panel-head">
        <h2>{card ? '编辑个人副本' : '自建记忆卡'}</h2>
      </div>
      <p className="sec-panel-desc">个人副本不会被学习包更新覆盖。修改正文会产生新内容版本，今天的旧版任务可能显示不可用，可单独加练。</p>
      <label>
        关联概念
        <select value={conceptId} onChange={(event) => setConceptId(event.target.value)}>
          {pack?.concepts.filter((concept) => concept.level === 'concept').map((concept) => (
            <option key={concept.id} value={concept.id}>{concept.name}</option>
          ))}
        </select>
      </label>
      <label>
        正面问题
        <textarea aria-label="正面问题" value={front} onChange={(event) => setFront(event.target.value)} required />
      </label>
      <label>
        背面解释
        <textarea aria-label="背面解释" value={back} onChange={(event) => setBack(event.target.value)} required />
      </label>
      {action.error && <p className="sec-inline-alert" role="alert">{action.error}</p>}
      <div className="command-row">
        <button type="submit" className="sec-keycap-btn" disabled={action.busy}>保存个人卡片</button>
        <button type="button" className="secondary-command" onClick={close}>取消</button>
      </div>
    </form>
  );
}

export function ReviewPage() {
  const learning = useLearning();
  const { questions, currentProgress } = useStudy();
  const cards = useLearningCards();
  const [params] = useSearchParams();
  const concept = params.get('concept');
  const [editor, setEditor] = useState<FlashcardDefinition | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [visibleCards, setVisibleCards] = useState(12);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const action = useAction();
  const navigate = useNavigate();

  const conceptsById = useMemo(
    () => new Map((learning.pack?.concepts ?? []).map((entry) => [entry.id, entry.name])),
    [learning.pack?.concepts],
  );
  const questionsById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const wrongCount = useMemo(
    () => [...currentProgress.values()].filter((entry) => entry.lastCorrect === false).length,
    [currentProgress],
  );

  const conceptIds = new Set<string>(concept ? [concept] : []);
  for (let size = -1; size !== conceptIds.size;) {
    size = conceptIds.size;
    learning.pack?.concepts.forEach((entry) => {
      if (entry.parentId && conceptIds.has(entry.parentId)) conceptIds.add(entry.id);
    });
  }
  const activeConceptName = concept ? conceptsById.get(concept) ?? null : null;

  const filtered = cards.filter((card) => (!concept || card.conceptIds.some((id) => conceptIds.has(id)))
    && (!search || JSON.stringify(card.front).toLowerCase().includes(search.toLowerCase())));
  const displayedCards = concept || search.trim() ? filtered : filtered.slice(0, visibleCards);
  const suspendedCards = learning.personal.filter((card) => card.suspended);

  const historyItems = useMemo(() => {
    const roundEntries = learning.rounds.map((round) => ({
      key: `round:${round.id}`,
      date: round.startedAt,
      to: `/review/cards/${round.id}`,
      title: `${round.dailyPlanId ? '每日任务' : '自主加练'} · ${round.startedAt.slice(0, 10)} · ${round.completedCardIds.length}/${round.cards.length} 张`,
      status: round.completedAt ? '轮次结束' : '继续复习',
      open: !round.completedAt,
    }));
    const practiceEntries = learning.practices
      .filter((session) => session.mode !== 'mock')
      .map((session) => ({
        key: `practice:${session.id}`,
        date: session.startedAt,
        to: session.completedAt ? `/practice/${session.id}/summary` : `/practice/${session.id}`,
        title: `练习 · ${session.startedAt.slice(0, 10)} · ${session.submittedQuestionIds.length}/${session.questionIds.length} 题`,
        status: session.completedAt ? '查看总结' : '继续练习',
        open: !session.completedAt,
      }));
    return [...roundEntries, ...practiceEntries].sort((left, right) => right.date.localeCompare(left.date));
  }, [learning.practices, learning.rounds]);

  const visibleHistory = showAllHistory ? historyItems : historyItems.slice(0, 8);

  const extra = async () => {
    const round = await storage.reviewRepository.createSession(filtered.slice(0, 10), new Date().toISOString());
    navigate(`/review/cards/${round.id}`);
  };

  const suspend = async (card: FlashcardDefinition, paused: boolean) => {
    const previous = learning.personal.find((entry) => entry.id === card.id || entry.baseCardId === card.id);
    const value: PersonalCard = {
      ...card,
      id: previous?.id ?? card.id,
      ...(previous?.baseCardId || !previous ? { baseCardId: previous?.baseCardId ?? card.id } : {}),
      suspended: paused,
      revision: (previous?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await storage.reviewRepository.savePersonalCard(value, previous?.revision ?? 0);
  };

  return (
    <div className="page review-page sec-page sec-review">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>复习中心</h1>
          <p className="sec-statement">
            {concept ? (
              <>{activeConceptName ?? '概念筛选'} · <b>{filtered.length}</b> 张记忆卡</>
            ) : (
              <>记忆卡 <b>{cards.length}</b> 张</>
            )}
          </p>
          <p className="sec-subtitle">先回忆，再看解释；忘记或模糊的内容会安排到明天。</p>
        </div>
        <nav className="sec-mode-switch" aria-label="复习与错题切换">
          <span className="sec-mode-tab is-active" aria-current="page">复习</span>
          <Link className="sec-mode-tab" to="/wrong">
            <span>错题</span>
            {wrongCount > 0 && <span className="sec-tab-badge">{wrongCount}</span>}
          </Link>
        </nav>
      </header>

      <nav className="section-links sec-jump-nav" aria-label="复习分区">
        <a href="#today">今日任务</a>
        <a href="#cards">记忆卡（<span className="sec-num">{filtered.length}</span>）</a>
        <a href="#limits">每日额度</a>
        <a href="#history">历史记录（<span className="sec-num">{historyItems.length}</span>）</a>
      </nav>

      <div id="today">
        <DailyTasks />
      </div>

      <section id="cards" className="study-panel sec-panel">
        <div className="section-heading sec-panel-head">
          <h2>记忆卡 · <span className="sec-num">{filtered.length}</span></h2>
          <div className="command-row">
            <button type="button" className="secondary-command" disabled={!learning.pack} onClick={() => setEditor('new')}>
              <Plus size={15} aria-hidden="true" />
              <span>自建卡片</span>
            </button>
            <button type="button" className="sec-keycap-btn" disabled={action.busy || !filtered.length} onClick={() => void action.run(extra)}>
              加练本组 {Math.min(10, filtered.length)} 张
            </button>
          </div>
        </div>
        <p className="sec-panel-desc">加练单独记录，不改变今日计划。编辑卡片会保存为个人副本，保留你的修改。</p>

        <div className="sec-card-toolbar">
          <label className="search-field">
            <Search size={15} aria-hidden="true" />
            <span>搜索卡片</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="输入问题关键词" />
          </label>
        </div>

        {concept && (
          <p className="sec-concept-pill">
            <span>已按概念筛选{activeConceptName ? `：${activeConceptName}` : ''}。</span>
            <Link to="/review">显示全部</Link>
          </p>
        )}
        {(action.error || learning.error) && <p className="sec-inline-alert" role="alert">{action.error || learning.error}</p>}
        {!learning.loading && !cards.length && <p className="sec-panel-desc">没有可用卡片：请检查学习包、关联题目版本和暂停状态。</p>}
        {editor && <CardEditor key={typeof editor === 'string' ? editor : editor.id} {...(editor === 'new' ? {} : { card: editor })} close={() => setEditor(null)} />}

        <div className="card-grid sec-card-grid">
          {displayedCards.map((card) => {
            const isPersonal = learning.personal.some((entry) => entry.id === card.id);
            const conceptLabel = card.conceptIds.map((id) => conceptsById.get(id)).find(Boolean) ?? '概念记忆卡';
            return (
              <article className="memory-preview sec-card-item" key={card.id}>
                <div className="sec-card-item-head">
                  <span className="sec-card-concept">{conceptLabel}</span>
                  {isPersonal && <span className="sec-card-personal-badge">个人副本</span>}
                </div>
                <LazyContentRenderer blocks={card.front} />
                <div className="command-row sec-card-actions">
                  <button type="button" className="secondary-command" onClick={() => setEditor(card)}>编辑副本</button>
                  <button type="button" className="secondary-command" disabled={action.busy} onClick={() => void action.run(() => suspend(card, true))}>暂停复习</button>
                </div>
                <details className="sec-card-details">
                  <summary>来源与解释</summary>
                  <p className="sec-card-details-meta">内容版本：{card.version} · 审核状态：{card.reviewStatus}</p>
                  <LazyContentRenderer blocks={card.back} />
                  {card.sources.length > 0 ? (
                    <ul>
                      {card.sources.map((source) => {
                        const sourceQuestion = questionsById.get(source.questionId);
                        const sourceLabel = sourceQuestion
                          ? `${sourceQuestion.year} 年第 ${sourceQuestion.number} 题 · ${source.locator}`
                          : `关联真题 · ${source.locator}`;
                        return (
                          <li key={source.questionId}>
                            <Link to={`/questions?question=${source.questionId}`}>{sourceLabel}</Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="sec-card-details-meta">个人自建内容，未提供原题来源。</p>
                  )}
                </details>
              </article>
            );
          })}
        </div>

        {filtered.length > displayedCards.length && (
          <button type="button" className="secondary-command sec-load-more" onClick={() => setVisibleCards((count) => count + 12)}>
            显示更多记忆卡（还有 {filtered.length - displayedCards.length} 张）
          </button>
        )}

        {suspendedCards.length > 0 && (
          <div className="sec-suspended-block">
            <h3>已暂停复习（<span className="sec-num">{suspendedCards.length}</span>）</h3>
            <ul className="sec-suspended-list">
              {suspendedCards.map((card) => (
                <li key={card.id}>
                  <span>已暂停：<strong>{cardSummaryLabel(card, conceptsById)}</strong></span>
                  <button type="button" className="secondary-command" disabled={action.busy} onClick={() => void action.run(() => suspend(card, false))}>恢复复习</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="sec-review-ops">
        <LimitsForm key={learning.plan?.id ?? 'unready'} initial={learning.plan?.limits ?? DEFAULT_REVIEW_LIMITS} />

        <section className="study-panel sec-panel" id="history">
          <div className="sec-panel-head">
            <h2>历史记录</h2>
          </div>
          {historyItems.length > 0 ? (
            <>
              <ul className="task-list sec-history-list">
                {visibleHistory.map((item) => (
                  <li key={item.key}>
                    <Link to={item.to}>{item.title}</Link>
                    <span className={`sec-history-state ${item.open ? 'is-open' : 'is-done'}`}>{item.status}</span>
                  </li>
                ))}
              </ul>
              {historyItems.length > 8 && (
                <button
                  type="button"
                  className="secondary-command sec-history-more"
                  onClick={() => setShowAllHistory((open) => !open)}
                >
                  {showAllHistory ? '收起历史记录' : `展开全部记录（共 ${historyItems.length} 条）`}
                </button>
              )}
            </>
          ) : (
            <p className="sec-panel-desc">完成第一轮后，这里会保留你的过程记录。</p>
          )}
        </section>
      </div>
    </div>
  );
}
