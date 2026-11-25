import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { effectiveCards, type DailyPlanItem, type FlashcardDefinition } from '@408os/domain';
import { useLearning } from '../app/LearningContext';
import { useStudy } from '../app/StudyContext';
import { storage } from '../app/storage';

export interface DailyCardRoundState {
  cardById: Map<string, FlashcardDefinition>;
  completedCards: Set<string>;
  remainingCards: DailyPlanItem[];
  cardItems: FlashcardDefinition[];
  startCards: () => Promise<void>;
}

export function useDailyCardRound(cardsInput?: FlashcardDefinition[]): DailyCardRoundState {
  const { plan, rounds, pack, personal } = useLearning();
  const { questions } = useStudy();
  const navigate = useNavigate();

  const resolvedCards = useMemo(() => {
    if (cardsInput) return cardsInput;
    const versions = new Map((questions ?? []).map((question) => [question.id, question.contentVersion]));
    return effectiveCards(pack?.cards ?? [], personal ?? []).filter((card) =>
      card.sources.every((source) => versions.get(source.questionId) === source.questionContentVersion),
    );
  }, [cardsInput, pack?.cards, personal, questions]);

  const cardById = useMemo(
    () => new Map(resolvedCards.map((card) => [card.id, card])),
    [resolvedCards],
  );

  const completedCards = useMemo(() => {
    const assignedCardVersions = new Map(
      plan?.items.filter((item) => item.kind === 'card').map((item) => [item.targetId, item.contentVersion]),
    );
    const safeRounds = rounds ?? [];
    return new Set(
      safeRounds
        .filter((round) => round.dailyPlanId === plan?.id)
        .flatMap((round) =>
          round.completedCardIds.filter((id) =>
            round.cards.some((card) => card.id === id && card.version === assignedCardVersions.get(id)),
          ),
        ),
    );
  }, [plan, rounds]);

  const remainingCards = useMemo(
    () => plan?.items.filter((item) => item.kind === 'card' && !completedCards.has(item.targetId)) ?? [],
    [completedCards, plan],
  );

  const cardItems = useMemo(
    () =>
      remainingCards
        .flatMap((item) => {
          const card = cardById.get(item.targetId);
          return card?.version === item.contentVersion ? [card] : [];
        })
        .slice(0, 10),
    [cardById, remainingCards],
  );

  const startCards = useCallback(async () => {
    if (!plan) return;
    const safeRounds = rounds ?? [];
    const open = safeRounds.find((round) => round.dailyPlanId === plan.id && !round.completedAt);
    const round = open ?? await storage.reviewRepository.createSession(cardItems, new Date().toISOString(), plan.id);
    navigate(`/review/cards/${round.id}`);
  }, [cardItems, navigate, plan, rounds]);

  return {
    cardById,
    completedCards,
    remainingCards,
    cardItems,
    startCards,
  };
}
