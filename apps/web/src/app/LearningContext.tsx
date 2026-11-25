import { createContext, useContext, useMemo } from 'react';
import { effectiveCards, type DailyPlan, type LearningPack } from '@408os/domain';
import { storage } from './storage';
import { useStudy } from './StudyContext';

type Snapshot = Awaited<ReturnType<typeof storage.reviewRepository.snapshot>>;
export const empty: Snapshot = { events: [], rounds: [], personal: [], evidence: [], practices: [], conflicts: [], contexts: [] };
interface LearningState extends Snapshot {
  pack: LearningPack | null;
  plan: DailyPlan | null;
  loading: boolean;
  error: string;
}
export const LearningContext = createContext<LearningState>({ ...empty, pack: null, plan: null, loading: true, error: '' });

export function useLearning() { return useContext(LearningContext); }
export function useLearningCards() {
  const { pack, personal } = useLearning();
  const { questions } = useStudy();
  return useMemo(() => {
    const versions = new Map(questions.map((question) => [question.id, question.contentVersion]));
    return effectiveCards(pack?.cards ?? [], personal).filter((card) => card.sources.every((source) => versions.get(source.questionId) === source.questionContentVersion));
  }, [pack, personal, questions]);
}

export function useConceptQuestions() {
  const { pack } = useLearning();
  const { questions } = useStudy();
  return useMemo(() => {
    const mappings = new Map(pack?.mappings.map((mapping) => [mapping.questionId, mapping]));
    return questions.flatMap((question) => {
      const mapping = mappings.get(question.id);
      return mapping?.questionContentVersion === question.contentVersion
        ? [{ ...question, subject: mapping.subject, knowledgePointIds: mapping.conceptIds }] : [];
    });
  }, [pack, questions]);
}
