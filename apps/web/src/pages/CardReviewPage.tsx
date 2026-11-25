import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { replayCardSchedule, type CardRating, type ReviewSession } from '@408os/domain';
import { useLearning } from '../app/LearningContext';
import { storage } from '../app/storage';
import { useAction } from '../app/useAction';
import { useActiveTime } from '../app/useActiveTime';
import { LazyContentRenderer } from '../components/LazyContentRenderer';
import { buildConceptNameMap, formatCardLabel, formatCardRoundSummaryLabel } from '../components/card-label';
import { ReadingImageLightbox, type LightboxImage } from '../components/ReadingImageLightbox';
import { isInteractiveTarget, shouldIgnoreReadingShortcut } from '../components/readingKeyboard';

const RATING_KEYS: ReadonlyArray<{ rating: CardRating; label: string; keycap: string; tone: 'again' | 'fuzzy' | 'good' }> = [
  { rating: 0, label: '忘记', keycap: '1', tone: 'again' },
  { rating: 0.5, label: '模糊', keycap: '2', tone: 'fuzzy' },
  { rating: 1, label: '记得', keycap: '3', tone: 'good' },
];

export function CardReviewPage() {
  const { roundId } = useParams();
  return <CardRound key={roundId} id={roundId ?? ''} />;
}

function CardRound({ id }: { id: string }) {
  const { rounds, events, pack, error, loading } = useLearning();
  const persisted = rounds.find((round) => round.id === id);
  const [latest, setLatest] = useState<ReviewSession | null>(null);
  const round = latest && latest.id === id && latest.revision > (persisted?.revision ?? -1) ? latest : persisted;
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const action = useAction();
  const activeTime = useActiveTime(`${id}:${round?.cursor ?? 0}`, !round?.completedAt);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  const handleImageClickDelegation = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    const src = target.currentSrc || target.getAttribute('src');
    if (!src) return;
    lightboxTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLightboxImage({ src, alt: target.alt || '卡片配图' });
  }, []);

  const getLightboxRestoreTarget = useCallback(() => lightboxTriggerRef.current, []);

  const card = round ? round.cards.find((item) => item.id === round.queue[round.cursor]) : undefined;
  const isRevealed = Boolean(round && !round.completedAt && card && revealedIndex === round.cursor);

  const rate = async (rating: CardRating) => {
    if (!round) return;
    const updated = await storage.reviewRepository.rateCard(id, round.revision, rating, activeTime(), new Date().toISOString());
    setLatest(updated);
    setRevealedIndex(-1);
  };

  interface CardShortcutHandlers {
    active: boolean;
    revealed: boolean;
    busy: boolean;
    lightboxOpen: boolean;
    onReveal: () => void;
    onRate: (rating: CardRating) => void;
  }

  const shortcutRef = useRef<CardShortcutHandlers | null>(null);

  useEffect(() => {
    shortcutRef.current = {
      active: Boolean(round && !round.completedAt && card),
      revealed: isRevealed,
      busy: action.busy,
      lightboxOpen: Boolean(lightboxImage),
      onReveal: () => {
        if (round) setRevealedIndex(round.cursor);
      },
      onRate: (rating) => {
        void action.run(() => rate(rating));
      },
    };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = shortcutRef.current;
      if (!current || !current.active || current.lightboxOpen) return;
      if (shouldIgnoreReadingShortcut(event)) return;
      if (event.repeat) return;

      if (!current.revealed) {
        if ((event.key === ' ' || event.key === 'Enter') && !isInteractiveTarget(event.target)) {
          event.preventDefault();
          current.onReveal();
        }
        return;
      }

      if (current.busy) return;
      if (event.key === '1') {
        event.preventDefault();
        current.onRate(0);
      } else if (event.key === '2') {
        event.preventDefault();
        current.onRate(0.5);
      } else if (event.key === '3') {
        event.preventDefault();
        current.onRate(1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!round) {
    return (
      <div className="page card-review-page rl-card-page">
        <div className="rl-card-col">
          <h1>{loading ? '读取复习轮次…' : '复习轮次不可用'}</h1>
          {error && <p className="rl-banner" role="alert">{error}</p>}
          <Link className="rl-back-link" to="/review">返回复习中心</Link>
        </div>
      </div>
    );
  }

  const roundEvents = events.filter((event) => event.sessionId === id);
  const retryTomorrow = new Set(roundEvents.filter((event) => event.rating < 1).map((event) => event.cardId));
  const schedules = replayCardSchedule(events);
  const progressPercent = round.cards.length ? Math.round((round.completedCardIds.length / round.cards.length) * 100) : 0;
  const conceptNames = buildConceptNameMap(pack?.concepts);
  const baseLabelCounts = new Map<string, number>();
  for (const item of round.cards) {
    const base = formatCardLabel(item, conceptNames);
    baseLabelCounts.set(base, (baseLabelCounts.get(base) ?? 0) + 1);
  }

  return (
    <div className="page card-review-page rl-card-page">
      <div className="rl-card-col" onClick={handleImageClickDelegation}>
        <header className="page-header rl-card-header">
          <div className="rl-card-header-copy">
            <span className="eyebrow rl-eyebrow">主动回忆</span>
            <h1>{round.completedAt ? '本轮复习总结' : '先想一想，再翻面'}</h1>
            <p>完成 {round.completedCardIds.length} / {round.cards.length} 张 · 每张最多额外重试两次</p>
          </div>
          <Link className="rl-back-link" to="/review">返回复习中心</Link>
        </header>

        <div className="rl-card-progress" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        {action.error && <p className="rl-banner" role="alert">{action.error}</p>}

        {round.completedAt ? (
          <section className="study-panel rl-card-summary rl-reading">
            <h2>本轮已结束</h2>
            <p>{round.cards.length} 张已完成本轮，其中 {retryTomorrow.size} 张出现过“忘记”或“模糊”，将于次日再练。完成不等于掌握。</p>
            <ul className="rl-summary-list">
              {round.cards.map((item) => {
                const ratings = roundEvents.filter((event) => event.cardId === item.id);
                const firstRating = ratings[0]?.rating;
                const firstLabel = firstRating === 1 ? '记得' : firstRating === 0.5 ? '模糊' : '忘记';
                const firstClass = firstRating === 1 ? 'rl-status-ok' : firstRating === 0.5 ? 'rl-status-warn' : 'rl-status-wrong';
                const due = schedules.find((state) => state.cardId === item.id && state.cardVersion === item.version)?.dueOn;
                const baseLabel = formatCardLabel(item, conceptNames);
                const cardTitle = formatCardRoundSummaryLabel(
                  item,
                  conceptNames,
                  (baseLabelCounts.get(baseLabel) ?? 0) > 1,
                );
                return (
                  <li key={item.id}>
                    <span className="rl-summary-card-title">{cardTitle}</span>
                    <span>
                      ：首次 <strong className={firstClass}>{firstLabel}</strong>；共 {ratings.length} 次；下次 {due ?? '等待保存记录'}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link className="rl-primary-link" to="/">回到今日任务 →</Link>
          </section>
        ) : card && (
          <article className="study-panel flashcard rl-flashcard" aria-live="polite">
            <div className="rl-card-meta">
              <span className="eyebrow rl-eyebrow">回忆练习 · {round.cursor + 1} 次呈现</span>
              <span className="rl-card-phase">{isRevealed ? '核对背面' : '主动回忆'}</span>
            </div>

            <div className="rl-card-front rl-reading">
              <LazyContentRenderer blocks={card.front} />
            </div>

            {isRevealed ? (
              <div className="rl-card-back-wrap">
                <div className="rl-card-divider" role="separator">
                  <span>参考解释</span>
                </div>
                <div className="rl-card-back rl-reading">
                  <LazyContentRenderer blocks={card.back} />
                </div>

                <div className="command-row rating-actions rl-rating-keys" role="group" aria-label="回忆评分">
                  {RATING_KEYS.map(({ rating, label, keycap, tone }) => (
                    <button
                      key={rating}
                      type="button"
                      className={`rl-keycap rl-rating-${tone}`}
                      aria-label={label}
                      aria-keyshortcuts={keycap}
                      disabled={action.busy}
                      onClick={() => void action.run(() => rate(rating))}
                    >
                      <kbd className="rl-kbd" aria-hidden="true">{keycap}</kbd>
                      <span className="rl-keycap-label">{label}</span>
                    </button>
                  ))}
                </div>

                <p className="rl-shortcut-hint rl-card-shortcut-hint">快捷键：按 1 忘记 · 2 模糊 · 3 记得</p>
                <p className="rl-card-rule">“忘记”和“模糊”均安排次日。同版本同日取最低评分，重复加练不会不断延长间隔。</p>

                <details className="rl-card-sources">
                  <summary>原题来源</summary>
                  <ul>
                    {card.sources.map((source) => (
                      <li key={source.questionId}>
                        <Link to={`/questions?question=${source.questionId}`}>{source.questionId} · {source.locator}</Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : (
              <div className="rl-reveal-bar">
                <button
                  type="button"
                  className="primary-command rl-primary-btn rl-reveal-btn"
                  aria-label="查看解释"
                  aria-keyshortcuts="Space Enter"
                  onClick={() => setRevealedIndex(round.cursor)}
                >
                  <span>查看解释</span>
                </button>
                <p className="rl-shortcut-hint">按 Space 或 Enter 显示背面，显示后可用 1 / 2 / 3 评分</p>
              </div>
            )}
          </article>
        )}
      </div>

      <ReadingImageLightbox
        image={lightboxImage}
        onClose={closeLightbox}
        getRestoreFocusTarget={getLightboxRestoreTarget}
      />
    </div>
  );
}
