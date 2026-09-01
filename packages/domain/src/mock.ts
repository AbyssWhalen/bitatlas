import { evaluateResponse } from './study';
import type {
  ContentPackManifest,
  MockExamBlueprint,
  MockExamScore,
  Question,
  UserResponse,
} from './types';

export const FIXED_MOCK_EXAM_RULES = {
  durationMinutes: 180,
  questionCount: 47,
  objectiveCount: 40,
  comprehensiveCount: 7,
  objectivePointsPerQuestion: 2,
  objectiveMaxScore: 80,
  comprehensiveMaxScore: 70,
  totalMaxScore: 150,
} as const;

function assertFixedPaperShape(manifest: ContentPackManifest, questions: readonly Question[]): Question[] {
  const rules = FIXED_MOCK_EXAM_RULES;
  if (manifest.reviewStatus !== 'verified') {
    throw new Error('Mock exams require a verified content pack.');
  }
  if (manifest.questionCount !== rules.questionCount || questions.length !== rules.questionCount) {
    throw new Error(`固定整卷必须包含 ${rules.questionCount} 道题。`);
  }

  const ordered = [...questions].sort((left, right) => left.number - right.number);
  const ids = new Set<string>();
  let comprehensiveScore = 0;

  for (let index = 0; index < ordered.length; index += 1) {
    const entry = ordered[index]!;
    const expectedNumber = index + 1;
    if (entry.number !== expectedNumber) {
      throw new Error(`固定整卷题号必须连续为 1-${rules.questionCount}。`);
    }
    if (ids.has(entry.id)) throw new Error(`固定整卷存在重复题目：${entry.id}。`);
    ids.add(entry.id);
    if (entry.year !== manifest.year) throw new Error(`题目 ${entry.id} 的年份与题包不一致。`);
    if (entry.contentVersion !== manifest.contentVersion) {
      throw new Error(`题目 ${entry.id} 的内容版本与题包不一致。`);
    }
    if (entry.reviewStatus !== 'verified') {
      throw new Error(`题目 ${entry.id} 尚未 verified。`);
    }

    if (expectedNumber <= rules.objectiveCount) {
      if (entry.kind !== 'single-choice' || entry.answer.type !== 'choice') {
        throw new Error(`第 ${expectedNumber} 题必须是单项选择题。`);
      }
      continue;
    }

    if (entry.kind !== 'comprehensive' || entry.answer.type !== 'comprehensive') {
      throw new Error(`第 ${expectedNumber} 题必须是综合题。`);
    }
    comprehensiveScore += entry.answer.maxScore;
  }

  if (comprehensiveScore !== rules.comprehensiveMaxScore) {
    throw new Error(`综合题总分必须为 ${rules.comprehensiveMaxScore} 分。`);
  }
  return ordered;
}

export function createFixedMockExamBlueprint(
  manifest: ContentPackManifest,
  questions: readonly Question[],
): MockExamBlueprint {
  const ordered = assertFixedPaperShape(manifest, questions);
  const rules = FIXED_MOCK_EXAM_RULES;
  return {
    packId: manifest.id,
    packHash: manifest.sha256,
    contentVersion: manifest.contentVersion,
    year: manifest.year,
    durationMinutes: rules.durationMinutes,
    objectiveMaxScore: rules.objectiveMaxScore,
    comprehensiveMaxScore: rules.comprehensiveMaxScore,
    totalMaxScore: rules.totalMaxScore,
    questions: ordered.map((entry) => ({
      id: entry.id,
      number: entry.number,
      kind: entry.kind,
      contentVersion: entry.contentVersion,
      maxScore: entry.answer.type === 'comprehensive'
        ? entry.answer.maxScore
        : rules.objectivePointsPerQuestion,
    })),
  };
}

export function scoreMockExam(
  blueprint: MockExamBlueprint,
  questionsById: ReadonlyMap<string, Question>,
  responses: Readonly<Record<string, UserResponse>>,
): MockExamScore {
  let objectiveScore = 0;
  let comprehensiveScore = 0;
  let objectiveAnswered = 0;
  let comprehensiveSelfScored = 0;
  const pendingSelfScoreQuestionIds: string[] = [];

  for (const snapshot of blueprint.questions) {
    const question = questionsById.get(snapshot.id);
    if (!question) throw new Error(`模考试题不存在：${snapshot.id}。`);
    if (
      question.contentVersion !== snapshot.contentVersion ||
      question.number !== snapshot.number ||
      question.kind !== snapshot.kind
    ) {
      throw new Error(`模考试题版本已变化：${snapshot.id}。`);
    }

    const response = responses[snapshot.id];
    if (snapshot.kind === 'single-choice') {
      if (response?.type === 'choice') objectiveAnswered += 1;
      const evaluation = response ? evaluateResponse(question, response) : null;
      if (evaluation?.correct) objectiveScore += FIXED_MOCK_EXAM_RULES.objectivePointsPerQuestion;
      continue;
    }

    if (response?.type !== 'comprehensive' || response.selfScore === undefined) {
      pendingSelfScoreQuestionIds.push(snapshot.id);
      continue;
    }
    if (question.answer.type !== 'comprehensive') throw new Error(`模考试题类型已变化：${snapshot.id}。`);
    if (!Number.isFinite(response.selfScore)) throw new Error('模考综合题自评分必须为有限数。');
    comprehensiveScore += Math.min(question.answer.maxScore, Math.max(0, response.selfScore));
    comprehensiveSelfScored += 1;
  }

  return {
    objectiveScore,
    comprehensiveScore,
    totalScore: objectiveScore + comprehensiveScore,
    objectiveAnswered,
    comprehensiveSelfScored,
    fullySelfScored: pendingSelfScoreQuestionIds.length === 0,
    pendingSelfScoreQuestionIds,
  };
}

export function getMockExamRemainingMs(
  startedAt: string,
  now: string,
  durationMinutes: number = FIXED_MOCK_EXAM_RULES.durationMinutes,
): number {
  const startedAtMs = Date.parse(startedAt);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) {
    throw new Error('模考时间格式无效。');
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error('模考时长必须为正数。');
  }
  const durationMs = durationMinutes * 60_000;
  return Math.min(durationMs, Math.max(0, durationMs - (nowMs - startedAtMs)));
}
