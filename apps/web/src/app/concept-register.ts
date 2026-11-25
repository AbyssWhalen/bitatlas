import {
  attemptQuality, beijingDate, effectiveCards, isUnassistedFirstAnswer, nextCalendarDate,
  replayCardSchedule, replayReviewSchedule, REVIEW_TIME_ZONE, SUBJECTS,
  type Attempt, type CardReviewEvent, type DailyPlan, type DailyPlanItem, type FlashcardDefinition,
  type LearningPack, type PersonalCard, type PracticeEvidence, type Question, type Subject,
} from '@408os/domain';
import { questionLabLink } from './lab-links';

export type ConceptState = 'unstarted' | 'practicing' | 'consolidating' | 'stable';
export type ObjectiveAssessment = 'untested' | 'needs-review' | 'positive';
export interface ConceptStateRow {
  conceptId: string;
  name: string;
  subject: Subject;
  state: ConceptState;
  questionCount: number;
  attemptedQuestions: number;
  cardCount: number;
  dueCards: number;
  labIds: string[];
  lastActivityAt: string | null;
}
export type SubjectStateCounts = { subject: Subject } & Record<ConceptState, number>;
export interface PlanConcepts {
  items: (DailyPlanItem & { conceptIds: string[] })[];
  conceptIds: string[];
}

export function buildConceptCatalog(pack: LearningPack | null, questions: readonly Question[], personal: readonly PersonalCard[]) {
  const leaves = (pack?.concepts ?? []).filter((concept) => concept.level === 'concept');
  const members = new Map(leaves.map(({ id }) => [id, {
    questionIds: new Set<string>(), cardIds: new Set<string>(), labIds: new Set<string>(),
  }]));
  const leafIds = (ids: readonly string[]) => [...new Set(ids.filter((id) => members.has(id)))];
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const questionConcepts = new Map<string, string[]>();
  for (const mapping of pack?.mappings ?? []) {
    if (questionById.get(mapping.questionId)?.contentVersion !== mapping.questionContentVersion) continue;
    const ids = leafIds(mapping.conceptIds);
    questionConcepts.set(mapping.questionId, ids);
    const link = questionLabLink(mapping.questionId);
    for (const id of ids) {
      const member = members.get(id)!;
      member.questionIds.add(mapping.questionId);
      if (link) member.labIds.add(link.destination);
    }
  }

  // Keep a suspended card's same-version activity, but never schedule or assign it.
  const cardById = new Map<string, { card: FlashcardDefinition; active: boolean; conceptIds: string[] }>();
  function addCard(card: FlashcardDefinition, active: boolean) {
    if (!card.sources.every((s) => questionById.get(s.questionId)?.contentVersion === s.questionContentVersion)) return;
    const ids = leafIds(card.conceptIds);
    cardById.set(card.id, { card, active, conceptIds: ids });
    if (active) for (const id of ids) members.get(id)!.cardIds.add(card.id);
  }
  for (const card of effectiveCards(pack?.cards ?? [], personal)) addCard(card, true);
  for (const card of personal) if (card.suspended) addCard(card, false);
  return { leaves, members, questions, questionById, questionConcepts, cardById };
}
type Catalog = ReturnType<typeof buildConceptCatalog>;

export function selectPlanConcepts(catalog: Catalog, plan: DailyPlan | null, today: string): PlanConcepts {
  const involved = new Set<string>();
  const items = (plan?.date === today ? plan.items : []).map((item) => {
    const card = item.kind === 'card' ? catalog.cardById.get(item.targetId) : undefined;
    const ids = item.kind === 'question' && catalog.questionById.get(item.targetId)?.contentVersion === item.contentVersion
      ? catalog.questionConcepts.get(item.targetId) : card?.active && card.card.version === item.contentVersion ? card.conceptIds : undefined;
    const conceptIds = ids ?? [];
    for (const id of conceptIds) involved.add(id);
    return { ...item, conceptIds };
  });
  return { items, conceptIds: [...involved] };
}

export function selectSubjectConceptCounts(rows: readonly ConceptStateRow[]): SubjectStateCounts[] {
  const counts = new Map(SUBJECTS.map((subject) => [subject, { subject, unstarted: 0, practicing: 0, consolidating: 0, stable: 0 }]));
  for (const row of rows) counts.get(row.subject)![row.state]++;
  return [...counts.values()];
}

// Three days is the first multi-day interval in the existing daily-minimum scheduler.
const spacedAndCurrent = (schedule: { intervalDays: number; dueOn: string }, today: string) =>
  schedule.intervalDays >= 3 && schedule.dueOn > today;

export function selectConceptActivity(catalog: Catalog, attempts: readonly Attempt[], events: readonly CardReviewEvent[],
  evidence: readonly PracticeEvidence[], today: string) {
  const tomorrow = nextCalendarDate(today);
  const end = Date.parse(`${tomorrow}T00:00:00+08:00`);
  const monday = nextCalendarDate(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const weekStart = Date.parse(`${monday}T00:00:00+08:00`);
  const studyDates = new Set<string>();
  const latest = new Map<string, number>();
  function recordActivity(time: number, ids: readonly string[]) {
    if (time >= weekStart) studyDates.add(beijingDate(new Date(time)));
    for (const id of ids) latest.set(id, Math.max(time, latest.get(id) ?? -Infinity));
  }
  const seenAttempts = new Set<string>(), attemptedQuestions = new Set<string>();
  const proofs = new Map(evidence.flatMap((p) => p.attemptId ? [[p.attemptId, p] as const] : []));
  const objective: Attempt[] = [], scoredChoices: Attempt[] = [], boundProofs: PracticeEvidence[] = [];
  for (const attempt of attempts) {
    const q = catalog.questionById.get(attempt.questionId), time = Date.parse(attempt.submittedAt);
    if (!q || q.contentVersion !== attempt.questionContentVersion || !(time < end) || seenAttempts.has(attempt.id)
      || (q.kind === 'single-choice' ? attempt.response.type !== 'choice' : attempt.response.type !== 'comprehensive')
      || attemptQuality(attempt, q) === null) continue;
    seenAttempts.add(attempt.id);
    attemptedQuestions.add(q.id);
    recordActivity(time, catalog.questionConcepts.get(q.id) ?? []);
    if (q.kind !== 'single-choice') continue;
    scoredChoices.push(attempt);
    const proof = proofs.get(attempt.id);
    if (!proof || proof.sessionId !== attempt.sessionId || proof.questionId !== q.id || proof.questionContentVersion !== q.contentVersion) continue;
    boundProofs.push(proof);
    if (isUnassistedFirstAnswer(attempt, proof)
      && proof.firstResponse?.type === 'choice' && attempt.response.type === 'choice'
      && proof.firstResponse.optionId === attempt.response.optionId) objective.push(attempt);
  }
  const options = { timeZone: REVIEW_TIME_ZONE, beforeDate: tomorrow };
  // Assisted/unknown work cannot advance independent evidence. Its low daily score
  // still applies to the real review schedule, even alongside a correct first answer.
  const objectiveSchedules = new Map(replayReviewSchedule(objective, catalog.questions, options).map((s) => [s.questionId, s]));
  const reviewSchedules = new Map(replayReviewSchedule(scoredChoices, catalog.questions, { ...options, evidence: boundProofs }).map((s) => [s.questionId, s]));
  const seenEvents = new Set<string>();
  const activeEvents: CardReviewEvent[] = [];
  for (const event of events) {
    const entry = catalog.cardById.get(event.cardId), time = Date.parse(event.reviewedAt);
    if (!entry || entry.card.version !== event.cardVersion || !(time < end) || seenEvents.has(event.id)
      || ![0, 0.5, 1].includes(event.rating)) continue;
    seenEvents.add(event.id);
    recordActivity(time, entry.conceptIds);
    if (entry.active) activeEvents.push(event);
  }
  const cardSchedules = new Map(replayCardSchedule(activeEvents).map((s) => [s.cardId, s]));
  const objectiveByConcept = new Map<string, ObjectiveAssessment>();
  const concepts = catalog.leaves.map(({ id: conceptId, name, subject }): ConceptStateRow => {
    const member = catalog.members.get(conceptId)!;
    const qIds = [...member.questionIds], cardIds = [...member.cardIds];
    const choices = qIds.filter((id) => catalog.questionById.get(id)!.kind === 'single-choice');
    const measured = choices.flatMap((id) => objectiveSchedules.get(id) ?? []);
    const reviews = choices.flatMap((id) => reviewSchedules.get(id) ?? []);
    const cards = cardIds.flatMap((id) => cardSchedules.get(id) ?? []);
    const assessment = !measured.length ? 'untested' : measured.some((s) => s.lastQuality === 0) ? 'needs-review' : 'positive';
    objectiveByConcept.set(conceptId, assessment);
    const time = latest.get(conceptId);
    const questionReady = assessment === 'positive' && measured.length >= Math.min(2, choices.length)
      && measured.every((s) => spacedAndCurrent(s, today)) && reviews.every((s) => spacedAndCurrent(s, today));
    const cardReady = cardIds.length > 0 && cards.length === cardIds.length && cards.every((s) => spacedAndCurrent(s, today));
    const state = time === undefined ? 'unstarted' : assessment !== 'positive' ? 'practicing'
      : questionReady && cardReady ? 'stable' : 'consolidating';
    return {
      conceptId, name, subject, state, questionCount: qIds.length, attemptedQuestions: qIds.filter((id) => attemptedQuestions.has(id)).length,
      cardCount: cardIds.length, dueCards: cards.filter((s) => s.dueOn <= today).length, labIds: [...member.labIds],
      lastActivityAt: time === undefined ? null : new Date(time).toISOString(),
    };
  });
  return { concepts, objectiveByConcept, weeklyStudyDays: studyDates.size };
}
