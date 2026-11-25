import { ArrowRight, BookOpenCheck, FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Question } from '@408os/domain';
import type { ConceptStateRow } from '../app/concept-register';
import { questionLabLink } from '../app/lab-links';
import { useLearning } from '../app/LearningContext';
import { useConceptRegister } from '../app/useConceptRegister';
import { STATE_LABELS } from './concept-labels';
import { LazyContentRenderer } from './LazyContentRenderer';
import { SubjectShape } from './SubjectShape';

export interface PracticeConceptBridgeProps {
  question: Question;
  onOpenLab: (destination: string) => void;
}

export function PracticeConceptBridge({ question, onOpenLab }: PracticeConceptBridgeProps) {
  const { pack } = useLearning();
  const register = useConceptRegister();
  const [selectedIdState, setSelectedIdState] = useState<{ questionId: string; conceptId: string } | null>(null);

  const matchedRows = useMemo(() => {
    if (!pack || !register.concepts.length) return [];
    const mapping = pack.mappings.find(
      (entry) => entry.questionId === question.id && entry.questionContentVersion === question.contentVersion,
    );
    if (!mapping) return [];
    const byId = new Map<string, ConceptStateRow>(register.concepts.map((row) => [row.conceptId, row]));
    const orderedIds = [
      ...(mapping.primaryConceptId ? [mapping.primaryConceptId] : []),
      ...mapping.conceptIds,
    ];
    const unique: ConceptStateRow[] = [];
    const seen = new Set<string>();
    for (const id of orderedIds) {
      if (seen.has(id)) continue;
      const row = byId.get(id);
      if (row) {
        seen.add(id);
        unique.push(row);
      }
    }
    return unique;
  }, [pack, question.contentVersion, question.id, register.concepts]);

  if (!pack || !matchedRows.length) return null;

  const activeRow = (
    selectedIdState?.questionId === question.id
      ? matchedRows.find((row) => row.conceptId === selectedIdState.conceptId)
      : undefined
  ) ?? matchedRows[0]!;

  const article = pack.articles?.find((entry) => entry.conceptId === activeRow.conceptId) ?? null;
  const directLab = questionLabLink(question.id);
  const fallbackLabDestination = activeRow.labIds[0] ?? article?.labPath ?? null;
  const resolvedLab = directLab
    ? { destination: directLab.destination, label: `去实验验证：${directLab.label}` }
    : fallbackLabDestination
      ? { destination: fallbackLabDestination, label: '去概念实验验证' }
      : null;

  const knowledgeHref = `/knowledge?subject=${encodeURIComponent(activeRow.subject)}&node=${encodeURIComponent(activeRow.conceptId)}`;
  const cardsHref = `/review?concept=${encodeURIComponent(activeRow.conceptId)}`;

  return (
    <section className="rl-concept-bridge" aria-label="关联概念与巩固">
      {matchedRows.length > 1 && (
        <div className="rl-concept-tabs" role="group" aria-label="本题关联概念切换">
          {matchedRows.map((row) => {
            const active = row.conceptId === activeRow.conceptId;
            return (
              <button
                key={row.conceptId}
                type="button"
                className={active ? 'rl-concept-tab is-active' : 'rl-concept-tab'}
                aria-pressed={active}
                onClick={() => setSelectedIdState({ questionId: question.id, conceptId: row.conceptId })}
              >
                <span>{row.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="rl-concept-bridge-head">
        <div className="rl-concept-title-row">
          <SubjectShape subject={activeRow.subject} />
          <strong className="rl-concept-name">关联概念：{activeRow.name}</strong>
          <span className="rl-concept-state-badge">
            <i className={`rl-concept-bit is-${activeRow.state}`} aria-hidden="true" />
            <span>{STATE_LABELS[activeRow.state]}</span>
          </span>
        </div>
        <span className="rl-concept-metrics">
          已练 {activeRow.attemptedQuestions} / {activeRow.questionCount} 题 · 记忆卡 {activeRow.cardCount} 张
          {activeRow.dueCards > 0 ? `（到期 ${activeRow.dueCards}）` : ''}
        </span>
      </div>

      {article && (
        <details className="rl-concept-article">
          <summary>展开概念短讲解：{activeRow.name}</summary>
          <div className="rl-concept-article-body">
            <LazyContentRenderer blocks={article.explanation} />
            <h4>跟着算一遍</h4>
            <LazyContentRenderer blocks={article.workedExample} />
            <h4>容易弄错的地方</h4>
            <LazyContentRenderer blocks={article.commonMistake} />
            <p className="rl-concept-audit">
              版本 {article.version} · AI 辅助原创讲解 · 待审核
            </p>
          </div>
        </details>
      )}

      <div className="rl-concept-actions">
        {resolvedLab && (
          <button
            type="button"
            className="secondary-command rl-secondary-btn rl-bridge-btn"
            onClick={() => onOpenLab(resolvedLab.destination)}
          >
            <FlaskConical size={15} aria-hidden="true" />
            <span>{resolvedLab.label}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
        {activeRow.cardCount > 0 && (
          <Link className="secondary-command rl-secondary-btn rl-bridge-btn" to={cardsHref}>
            <BookOpenCheck size={15} aria-hidden="true" />
            <span>关联记忆卡（{activeRow.cardCount} 张）</span>
          </Link>
        )}
        <Link className="rl-concept-more-link" to={knowledgeHref}>
          <span>跨年同概念真题（{activeRow.questionCount} 题）</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
