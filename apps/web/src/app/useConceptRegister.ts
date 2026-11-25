import { useMemo } from 'react';
import { buildConceptCatalog, selectConceptActivity, selectPlanConcepts, selectSubjectConceptCounts } from './concept-register';
import { useLearning } from './LearningContext';
import { useStudy } from './StudyContext';
import { useBeijingDate } from './useBeijingDate';

export function useConceptRegister() {
  const { pack, personal, plan, events, evidence, loading, error } = useLearning();
  const { questions, attempts, error: studyError } = useStudy();
  const today = useBeijingDate();
  const catalog = useMemo(() => buildConceptCatalog(pack, questions, personal), [pack, questions, personal]);
  const activity = useMemo(() => selectConceptActivity(catalog, attempts, events, evidence, today), [catalog, attempts, events, evidence, today]);
  const subjects = useMemo(() => selectSubjectConceptCounts(activity.concepts), [activity.concepts]);
  const todayPlan = useMemo(() => selectPlanConcepts(catalog, plan, today), [catalog, plan, today]);
  return { ...activity, subjects, todayPlan, loading, error: error || studyError || '' };
}
