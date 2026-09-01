export const SUBJECTS = [
  'data-structures',
  'computer-organization',
  'operating-systems',
  'computer-networks',
] as const;

export type Subject = (typeof SUBJECTS)[number];
export type QuestionKind = 'single-choice' | 'comprehensive';
export type ReviewStatus = 'draft' | 'needs-review' | 'verified';
export type Mastery = 'unseen' | 'learning' | 'familiar' | 'mastered';
export type StudyMode = 'practice' | 'review' | 'mock';

/**
 * Marker used only for records migrated from user schema v1 whose question
 * content version cannot be proven. Such records must never be resumed or
 * projected onto the current question version.
 */
export const LEGACY_CONTENT_VERSION = '__legacy_unversioned__';

export const CONTENT_REVIEW_CHECKS = [
  'stem',
  'options',
  'answer',
  'explanation',
  'rubric',
  'assets',
  'sources',
  'knowledgePoints',
] as const;

export type ContentReviewCheck = (typeof CONTENT_REVIEW_CHECKS)[number];
export type ContentReviewDecision = 'pending' | 'approved' | 'rejected';
export type ContentReviewChecks = Record<ContentReviewCheck, boolean>;

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'math'; expression: string; display?: boolean }
  | { type: 'code'; code: string; language?: string }
  | {
      type: 'image';
      assetId: string;
      alt: string;
      caption?: string;
      crop?: { x: number; y: number; width: number; height: number };
    }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  content: ContentBlock[];
}

export interface RubricItem {
  id: string;
  description: string;
  points: number;
}

export type QuestionAnswer =
  | { type: 'choice'; optionId: QuestionOption['id'] }
  | { type: 'comprehensive'; maxScore: number; rubric: RubricItem[]; reference: ContentBlock[] };

export interface ExplanationSection {
  id: string;
  title: string;
  content: ContentBlock[];
}

export interface SourceDocument {
  publisher: string;
  title: string;
  url: string;
  fileName: string;
  sha256: string;
  pages: number[];
  locator: string;
}

export interface SourceRef {
  question: SourceDocument;
  answer: SourceDocument;
  crosschecks: SourceDocument[];
  redistribution: 'unknown' | 'allowed' | 'restricted';
}

export interface AssetRef {
  id: string;
  path: string;
  mimeType: 'image/png' | 'image/jpeg' | 'application/pdf';
  sha256: string;
  sourcePage: number;
  width?: number;
  height?: number;
}

export interface Question {
  id: string;
  year: number;
  number: number;
  subject: Subject;
  kind: QuestionKind;
  stem: ContentBlock[];
  options?: QuestionOption[];
  answer: QuestionAnswer;
  explanation: ExplanationSection[];
  hints: ContentBlock[][];
  knowledgePointIds: string[];
  assetIds: string[];
  source: SourceRef;
  contentVersion: string;
  reviewStatus: ReviewStatus;
}

export interface KnowledgePoint {
  id: string;
  subject: Subject;
  name: string;
  parentId?: string;
  description?: string;
}

export interface ContentPackManifest {
  id: string;
  schemaVersion: 1;
  contentVersion: string;
  title: string;
  year: number;
  questionCount: number;
  createdAt: string;
  sha256: string;
  reviewStatus: ReviewStatus;
}

export interface ContentPack {
  manifest: ContentPackManifest;
  questions: Question[];
  knowledgePoints: KnowledgePoint[];
  assets: AssetRef[];
}

export interface ContentReviewRecord {
  schemaVersion: 1;
  packId: string;
  packHash: string;
  questionId: string;
  questionContentVersion: string;
  checks: ContentReviewChecks;
  decision: ContentReviewDecision;
  reviewer: string;
  issueNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface ContentReviewSummary {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  stale: number;
}

export interface ContentReviewLedger {
  schemaVersion: 1;
  pack: {
    id: string;
    contentVersion: string;
    sha256: string;
  };
  exportedAt: string;
  summary: ContentReviewSummary;
  records: ContentReviewRecord[];
}

export type UserResponse =
  | { type: 'choice'; optionId: QuestionOption['id'] }
  | { type: 'comprehensive'; text: string; selfScore?: number; checkedRubricIds: string[] };

export interface Attempt {
  id: string;
  questionId: string;
  questionContentVersion: string;
  sessionId: string;
  mode: StudyMode;
  response: UserResponse;
  correct: boolean | null;
  score: number | null;
  startedAt: string;
  submittedAt: string;
  durationMs: number;
}

export interface StudySession {
  id: string;
  mode: StudyMode;
  questionIds: string[];
  questionContentVersions: Record<string, string>;
  currentIndex: number;
  responses: Record<string, UserResponse>;
  submittedQuestionIds: string[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** The unversioned v1 shape retained for migration and backup compatibility. */
export interface LegacyStudySession {
  id: string;
  mode: StudyMode;
  questionIds: string[];
  currentIndex: number;
  responses: Record<string, UserResponse>;
  submittedQuestionIds: string[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface QuestionProgress {
  questionId: string;
  questionContentVersion: string;
  mastery: Mastery;
  attemptCount: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  lastCorrect: boolean | null;
  lastAttemptAt?: string;
  nextReviewAt?: string;
}

/** The unversioned v1 progress shape retained as legacy evidence. */
export interface LegacyQuestionProgress {
  questionId: string;
  mastery: Mastery;
  attemptCount: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  lastCorrect: boolean | null;
  lastAttemptAt?: string;
  nextReviewAt?: string;
}

export interface Note {
  id: string;
  questionId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionEntry {
  questionId: string;
  createdAt: string;
}

export interface ReviewCard {
  id: string;
  questionId: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
}

export interface MockExamQuestionSnapshot {
  id: string;
  number: number;
  kind: QuestionKind;
  contentVersion: string;
  maxScore: number;
}

export interface MockExamBlueprint {
  packId: string;
  packHash: string;
  contentVersion: string;
  year: number;
  durationMinutes: number;
  objectiveMaxScore: number;
  comprehensiveMaxScore: number;
  totalMaxScore: number;
  questions: MockExamQuestionSnapshot[];
}

export interface MockExamScore {
  objectiveScore: number;
  comprehensiveScore: number;
  totalScore: number;
  objectiveAnswered: number;
  comprehensiveSelfScored: number;
  fullySelfScored: boolean;
  pendingSelfScoreQuestionIds: string[];
}

export type MockExamStatus = 'in-progress' | 'submitted' | 'completed';
export type MockExamSubmissionReason = 'manual' | 'timeout';

export interface MockExam {
  id: string;
  sessionId: string;
  blueprint: MockExamBlueprint;
  status: MockExamStatus;
  questionDurationsMs: Record<string, number>;
  startedAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  submissionReason?: MockExamSubmissionReason;
  score?: MockExamScore;
}

export interface QuestionFilter {
  year?: number;
  subjects?: Subject[];
  kinds?: QuestionKind[];
  mastery?: Mastery[];
  search?: string;
  onlyWrong?: boolean;
  onlyCollected?: boolean;
}

export interface StudyStats {
  attempted: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
  durationMs: number;
  bySubject: Record<Subject, { attempted: number; correct: number; accuracy: number | null }>;
}

export interface LocalEntity {
  id: string;
  revision: number;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
