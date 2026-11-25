import type { AssetRef, ContentBlock, Question } from './types';

function hasContent(blocks: readonly ContentBlock[]): boolean {
  return blocks.some((block) => {
    switch (block.type) {
      case 'text': return Boolean(block.text.trim());
      case 'math': return Boolean(block.expression.trim());
      case 'code': return Boolean(block.code.trim());
      case 'image': return Boolean(block.assetId);
      case 'table': return block.rows.some((row) => row.some((cell) => cell.trim()));
    }
  });
}

/** Content availability is independent of review approval and transient network/cache state. */
export function questionAvailability(question: Question, assets?: ReadonlyMap<string, AssetRef>) {
  const reasons = (question.contentIssues ?? []).filter((issue) => issue.kind !== 'missing-explanation')
    .map((issue) => issue.detail);
  if (!hasContent(question.stem)) reasons.push('题干缺失');
  if (question.kind === 'single-choice') {
    const answer = question.answer;
    if (question.options?.length !== 4 || new Set(question.options.map((option) => option.id)).size !== 4
      || question.options.some((option) => !hasContent(option.content))) reasons.push('选项缺失');
    if (answer.type !== 'choice' || !question.options?.some((option) => option.id === answer.optionId)) reasons.push('答案缺失');
  } else if (question.answer.type !== 'comprehensive' || !hasContent(question.answer.reference)) {
    reasons.push('参考答案缺失');
  }
  // Only a missing catalog definition is a permanent defect. An image fetch failure is retryable.
  if (assets) {
    const required = [...question.stem, ...(question.options?.flatMap((option) => option.content) ?? [])]
      .filter((block) => block.type === 'image');
    if (required.some((block) => !assets.has(block.assetId))) reasons.push('必要题图缺少资产定义');
  }
  const explanationMissing = question.contentIssues?.some((issue) => issue.kind === 'missing-explanation') === true
    || !question.explanation.some((section) => hasContent(section.content))
    || question.explanation.some((section) => section.content.some((block) =>
      block.type === 'text' && block.text.trim().startsWith('本题解析暂缺文字版')));
  return { practice: reasons.length === 0, reasons: [...new Set(reasons)], explanationMissing };
}

export function assertQuestionAvailable(question: Question, assets?: ReadonlyMap<string, AssetRef>): void {
  const status = questionAvailability(question, assets);
  if (!status.practice) throw new Error(`${question.year} 第 ${question.number} 题暂不可练习：${status.reasons.join('；')}。原记录仍保留。`);
}
