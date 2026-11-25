import type { Subject } from '@408os/domain';
import type { ConceptState, ConceptStateRow } from '../app/concept-register';

export const SUBJECT_MARKS: Record<Subject, { label: string }> = {
  'data-structures': { label: '数据结构' },
  'computer-organization': { label: '组成原理' },
  'operating-systems': { label: '操作系统' },
  'computer-networks': { label: '计算机网络' },
};

export const STATE_LABELS: Record<ConceptState, string> = {
  unstarted: '未开始',
  practicing: '练习中',
  consolidating: '待巩固',
  stable: '稳定',
};

/** Most settled first, so every meter reads left to right the same way. */
export const STATE_ORDER: ConceptState[] = ['stable', 'consolidating', 'practicing', 'unstarted'];

export function describeConcept(row: ConceptStateRow, today: boolean) {
  return [
    row.name,
    STATE_LABELS[row.state],
    `已练题目 ${row.attemptedQuestions}/${row.questionCount}`,
    `记忆卡 ${row.cardCount} 张${row.dueCards ? `，到期 ${row.dueCards} 张` : ''}`,
    ...(today ? ['今日任务涉及'] : []),
  ].join(' · ');
}
