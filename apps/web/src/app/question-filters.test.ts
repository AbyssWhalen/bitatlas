import { describe, expect, it } from 'vitest';
import { DEFAULT_QUESTION_FILTERS, parseQuestionFilters } from './question-filters';
describe('question browser preferences', () => {
  it('defaults to all years and rejects corrupted saved filter values', () => {
    expect(parseQuestionFilters(null)).toEqual(DEFAULT_QUESTION_FILTERS);
    expect(parseQuestionFilters({ year: '2009', subject: '__proto__', state: 'invalid' })).toEqual(DEFAULT_QUESTION_FILTERS);
  });
  it('preserves valid cross-year, chapter, concept and state preferences', () => {
    const value = { ...DEFAULT_QUESTION_FILTERS, year: 2025, subject: 'operating-systems' as const, chapter: 'os.memory', concept: 'os.memory.paging', state: 'wrong' as const };
    expect(parseQuestionFilters(JSON.parse(JSON.stringify(value)))).toEqual(value);
  });
});
