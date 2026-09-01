import { describe, expect, it } from 'vitest';
import {
  createFixedMockExamBlueprint,
  getMockExamRemainingMs,
  scoreMockExam,
} from './mock';
import type { ContentPackManifest, Question, UserResponse } from './types';

const source = {
  question: {
    publisher: 'source',
    title: 'questions',
    url: 'https://example.com/questions.pdf',
    fileName: 'questions.pdf',
    sha256: 'a'.repeat(64),
    pages: [1],
    locator: 'page 1',
  },
  answer: {
    publisher: 'source',
    title: 'answers',
    url: 'https://example.com/answers.pdf',
    fileName: 'answers.pdf',
    sha256: 'b'.repeat(64),
    pages: [1],
    locator: 'page 1',
  },
  crosschecks: [],
  redistribution: 'unknown' as const,
};

function question(number: number): Question {
  const base = {
    id: `cn408-2009-q${String(number).padStart(2, '0')}`,
    year: 2009,
    number,
    subject: 'computer-organization' as const,
    stem: [{ type: 'text' as const, text: `Question ${number}` }],
    explanation: [],
    hints: [],
    knowledgePointIds: [],
    assetIds: [],
    source,
    contentVersion: '2009.1',
    reviewStatus: 'verified' as const,
  };

  if (number <= 40) {
    return {
      ...base,
      kind: 'single-choice',
      options: ['A', 'B', 'C', 'D'].map((id) => ({
        id: id as 'A' | 'B' | 'C' | 'D',
        content: [{ type: 'text' as const, text: id }],
      })),
      answer: { type: 'choice', optionId: 'A' },
    };
  }

  return {
    ...base,
    kind: 'comprehensive',
    answer: {
      type: 'comprehensive',
      maxScore: 10,
      rubric: [{ id: `r-${number}`, description: '评分点', points: 10 }],
      reference: [],
    },
  };
}

const questions = Array.from({ length: 47 }, (_, index) => question(index + 1));
const manifest: ContentPackManifest = {
  id: 'cn408-2009',
  schemaVersion: 1,
  contentVersion: '2009.1',
  title: '2009',
  year: 2009,
  questionCount: 47,
  createdAt: '2026-08-07T00:00:00.000Z',
  sha256: 'c'.repeat(64),
  reviewStatus: 'verified',
};

describe('mock exam domain', () => {
  it('builds the fixed 2009 paper with authoritative scoring rules', () => {
    const blueprint = createFixedMockExamBlueprint(manifest, [...questions].reverse());

    expect(blueprint).toMatchObject({
      packId: manifest.id,
      packHash: manifest.sha256,
      contentVersion: manifest.contentVersion,
      year: 2009,
      durationMinutes: 180,
      objectiveMaxScore: 80,
      comprehensiveMaxScore: 70,
      totalMaxScore: 150,
    });
    expect(blueprint.questions.map((entry) => entry.number)).toEqual(
      Array.from({ length: 47 }, (_, index) => index + 1),
    );
  });

  it('rejects incomplete, malformed, and unverified papers', () => {
    expect(() => createFixedMockExamBlueprint(manifest, questions.slice(0, 46))).toThrow(/47/);
    expect(() => createFixedMockExamBlueprint(manifest, [questions[0]!, ...questions.slice(0, 46)])).toThrow(/题号/);
    expect(() => createFixedMockExamBlueprint({ ...manifest, reviewStatus: 'needs-review' }, questions)).toThrow(/verified/);
  });

  it('scores objective answers at two points and clamps comprehensive self scores', () => {
    const blueprint = createFixedMockExamBlueprint(manifest, questions);
    const responses: Record<string, UserResponse> = {
      [questions[0]!.id]: { type: 'choice', optionId: 'A' },
      [questions[1]!.id]: { type: 'choice', optionId: 'B' },
      [questions[40]!.id]: { type: 'comprehensive', text: 'answer', selfScore: 99, checkedRubricIds: [] },
      [questions[41]!.id]: { type: 'comprehensive', text: 'answer', checkedRubricIds: [] },
    };

    const result = scoreMockExam(blueprint, new Map(questions.map((entry) => [entry.id, entry])), responses);

    expect(result).toMatchObject({
      objectiveScore: 2,
      comprehensiveScore: 10,
      totalScore: 12,
      objectiveAnswered: 2,
      comprehensiveSelfScored: 1,
      fullySelfScored: false,
    });
    expect(result.pendingSelfScoreQuestionIds).toContain(questions[41]!.id);
  });

  it('rejects question drift after an exam is created', () => {
    const blueprint = createFixedMockExamBlueprint(manifest, questions);
    const drifted = new Map(questions.map((entry) => [entry.id, entry]));
    drifted.set(questions[0]!.id, { ...questions[0]!, contentVersion: '2009.2' });

    expect(() => scoreMockExam(blueprint, drifted, {})).toThrow(/版本/);
  });

  it('derives a refresh-safe countdown from persisted start time', () => {
    expect(getMockExamRemainingMs('2026-08-07T00:00:00.000Z', '2026-08-07T01:00:00.000Z', 180)).toBe(7_200_000);
    expect(getMockExamRemainingMs('2026-08-07T00:00:00.000Z', '2026-08-07T04:00:00.000Z', 180)).toBe(0);
    expect(getMockExamRemainingMs('2026-08-07T01:00:00.000Z', '2026-08-07T00:00:00.000Z', 180)).toBe(10_800_000);
    expect(() => getMockExamRemainingMs('invalid', '2026-08-07T00:00:00.000Z', 180)).toThrow(/时间/);
  });
});
