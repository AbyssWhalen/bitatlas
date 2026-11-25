import { SUBJECTS, type Subject } from '@408os/domain';

export interface QuestionBrowserFilters {
  search: string;
  subject: Subject | 'all';
  state: 'all' | 'unseen' | 'wrong' | 'collected';
  year: number | null;
  chapter: string;
  concept: string;
}
export const DEFAULT_QUESTION_FILTERS: QuestionBrowserFilters = {
  search: '', subject: 'all', state: 'all', year: null, chapter: '', concept: '',
};
export function parseQuestionFilters(input: unknown): QuestionBrowserFilters {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return {
    search: typeof value.search === 'string' ? value.search.slice(0, 200) : '',
    subject: SUBJECTS.includes(value.subject as Subject) ? value.subject as Subject : 'all',
    state: ['unseen', 'wrong', 'collected'].includes(String(value.state)) ? value.state as QuestionBrowserFilters['state'] : 'all',
    year: Number.isInteger(value.year) && Number(value.year) >= 2009 && Number(value.year) <= 2100 ? Number(value.year) : null,
    chapter: typeof value.chapter === 'string' ? value.chapter : '',
    concept: typeof value.concept === 'string' ? value.concept : '',
  };
}
