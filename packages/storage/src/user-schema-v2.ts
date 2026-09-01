import {
  applyAttemptToProgress,
  LEGACY_CONTENT_VERSION,
  type Attempt,
  type LegacyStudySession,
  type Question,
  type QuestionProgress,
  type StudySession,
} from '@408os/domain';

export { LEGACY_CONTENT_VERSION };

type SessionLike = Pick<StudySession, 'questionIds' | 'questionContentVersions'>;
type QuestionVersionLookup = ReadonlyMap<string, Pick<Question, 'contentVersion'>>;

function versionsForQuestion(
  sessionId: string,
  questionId: string,
  attempts: readonly Attempt[],
): string {
  const versions = new Set(
    attempts
      .filter((attempt) => attempt.sessionId === sessionId && attempt.questionId === questionId)
      .map((attempt) => attempt.questionContentVersion),
  );
  return versions.size === 1 ? [...versions][0]! : LEGACY_CONTENT_VERSION;
}

/**
 * Add only versions that can be proven from attempts. An unsubmitted draft has
 * no trustworthy version evidence in schema v1 and is deliberately marked
 * legacy instead of guessing from the current content pack.
 */
export function migrateLegacySession(
  session: LegacyStudySession,
  attempts: readonly Attempt[],
): StudySession {
  return {
    ...session,
    questionContentVersions: Object.fromEntries(
      session.questionIds.map((questionId) => [questionId, versionsForQuestion(session.id, questionId, attempts)]),
    ),
  };
}

/**
 * Rebuild derived progress independently for every question/content-version
 * pair. Sorting makes the migration deterministic even if IndexedDB returns
 * attempts in a different order.
 */
export function rebuildVersionedProgress(attempts: readonly Attempt[]): QuestionProgress[] {
  const groups = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const key = `${attempt.questionId}\u0000${attempt.questionContentVersion}`;
    const group = groups.get(key) ?? [];
    group.push(attempt);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      const ordered = [...group].sort(
        (left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.id.localeCompare(right.id),
      );
      let progress: QuestionProgress | undefined;
      for (const attempt of ordered) progress = applyAttemptToProgress(progress, attempt);
      return progress!;
    })
    .sort((left, right) => (
      left.questionId.localeCompare(right.questionId)
      || left.questionContentVersion.localeCompare(right.questionContentVersion)
    ));
}

function keySet(values: Record<string, string>): Set<string> {
  return new Set(Object.keys(values));
}

function runtimeVersions(session: SessionLike): Record<string, string> | null {
  const versions = session.questionContentVersions as Record<string, string> | null | undefined;
  return versions && !Array.isArray(versions) ? versions : null;
}

/** Return a user-facing reason when a session must not be resumed. */
export function studySessionVersionIssue(
  session: SessionLike,
  questions: QuestionVersionLookup,
): string | null {
  const ids = new Set(session.questionIds);
  const versions = runtimeVersions(session);
  if (!versions) return '会话缺少题面版本映射（missing versions）。';
  const versionIds = keySet(versions);
  const missing = session.questionIds.find((questionId) => !versionIds.has(questionId));
  if (missing) return `会话缺少题目 ${missing} 的题面版本（missing version）。`;
  const extra = [...versionIds].find((questionId) => !ids.has(questionId));
  if (extra) return `会话包含多余题目 ${extra} 的题面版本（extra version）。`;

  for (const questionId of session.questionIds) {
    const question = questions.get(questionId);
    if (!question) return `会话引用的题目 ${questionId} 不存在。`;
    const version = versions[questionId];
    if (typeof version !== 'string' || !version.trim()) {
      return `题目 ${questionId} 的题面版本为空，旧会话不能安全恢复（blank version）。`;
    }
    if (version === LEGACY_CONTENT_VERSION) {
      return `题目 ${questionId} 的题面版本未知，旧会话不能安全恢复（legacy version）。`;
    }
    if (version !== question.contentVersion) {
      return `题目 ${questionId} 的题面版本不一致：会话 ${version}，当前 ${question.contentVersion}（mismatch）。`;
    }
  }
  return null;
}

/** Guard writes so a legacy/unresolved session cannot be mutated as current. */
export function assertWritableStudySession(session: SessionLike): void {
  const ids = new Set(session.questionIds);
  const versions = runtimeVersions(session);
  if (!versions) throw new Error('Study session is missing its content version map.');
  const versionIds = keySet(versions);
  const missing = session.questionIds.find((questionId) => !versionIds.has(questionId));
  if (missing) throw new Error(`Study session is missing a content version for ${missing}.`);
  const extra = [...versionIds].find((questionId) => !ids.has(questionId));
  if (extra) throw new Error(`Study session has an extra content version for ${extra}.`);
  const blank = session.questionIds.find((questionId) => !versions[questionId]?.trim());
  if (blank) throw new Error(`Study session is missing a valid content version for ${blank}.`);
  const legacy = session.questionIds.find((questionId) => versions[questionId] === LEGACY_CONTENT_VERSION);
  if (legacy) throw new Error(`Study session ${session.questionIds.join(', ')} contains unresolved legacy version ${legacy}.`);
}
