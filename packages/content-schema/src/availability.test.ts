import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type ContentPack, questionAvailability, buildPersistentDailyPlan, evaluateResponse } from '@408os/domain';

const pack = JSON.parse(readFileSync(path.resolve('apps/web/public/content/2009.json'), 'utf8')) as ContentPack;
const base = pack.questions[0]!;
describe('question availability', () => {
  it('does not confuse pending review or missing explanations with an unusable question', () => {
    expect(questionAvailability({ ...base, reviewStatus: 'needs-review', explanation: [] })).toMatchObject({ practice: true, explanationMissing: true });
    expect(questionAvailability({ ...base, explanation: [{ id: 'x', title: '解析', content: [{ type: 'text', text: '本题解析暂缺文字版，请查看原始来源。' }] }] }).explanationMissing).toBe(true);
    expect(questionAvailability({ ...base, explanation: [{ id: 'x', title: '解析', content: [{ type: 'text', text: '缺页中断不等于缺少解析。' }] }] }).explanationMissing).toBe(false);
  });
  it('blocks confirmed answer conflicts even when a structurally valid answer exists', () => {
    const question = { ...base, contentIssues: [{ kind: 'answer-conflict' as const, detail: '两份来源答案不一致', locator: '人工核对记录' }] };
    expect(questionAvailability(question).practice).toBe(false);
    expect(() => evaluateResponse(question, { type: 'choice', optionId: 'A' })).toThrow('两份来源');
    expect(buildPersistentDailyPlan([question], [], [], [], '2026-11-20T00:00:00Z').items).toEqual([]);
  });
  it('distinguishes missing asset definitions from an empty network cache', () => {
    const question = { ...base, stem: [{ type: 'image' as const, assetId: 'required', alt: '题图' }] };
    expect(questionAvailability(question).practice).toBe(true);
    expect(questionAvailability(question, new Map()).practice).toBe(false);
  });
  it('never mutates archived content or reorders the remaining candidates', () => {
    for (let index = 0; index < pack.questions.length; index++) {
      const questions = structuredClone(pack.questions);
      questions[index]!.contentIssues = [{ kind: 'missing-stem', detail: '题干缺页', locator: '原卷' }];
      const before = JSON.stringify(questions);
      const plan = buildPersistentDailyPlan(questions, [], [], [], '2026-11-20T00:00:00Z', { questions: 100, cards: 10, newCards: 3 });
      expect(plan.items.map((item) => item.targetId)).not.toContain(questions[index]!.id);
      expect(plan.items).toHaveLength(46);
      expect(JSON.stringify(questions)).toBe(before);
    }
  });
});
