import type { FlashcardDefinition, LearningConcept } from '@408os/domain';

export function buildConceptNameMap(
  concepts: readonly LearningConcept[] | undefined,
): Map<string, string> {
  return new Map((concepts ?? []).map((concept) => [concept.id, concept.name]));
}

export function formatCardLabel(
  card: Pick<FlashcardDefinition, 'conceptIds'> | undefined,
  conceptNames: ReadonlyMap<string, string>,
): string {
  const name = card?.conceptIds.map((conceptId) => conceptNames.get(conceptId)).find(Boolean);
  return name ? `记忆卡 · ${name}` : '记忆卡';
}

function extractFrontSnippet(card: Pick<FlashcardDefinition, 'front'>): string {
  for (const block of card.front) {
    if (block.type === 'text') {
      const cleaned = block.text
        .replace(/\$([^$]+)\$/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) continue;
      return cleaned.length > 22 ? `${cleaned.slice(0, 22)}…` : cleaned;
    }
  }
  return '';
}

export function formatCardRoundSummaryLabel(
  card: Pick<FlashcardDefinition, 'conceptIds' | 'front'>,
  conceptNames: ReadonlyMap<string, string>,
  disambiguate = false,
): string {
  const base = formatCardLabel(card, conceptNames);
  const snippet = extractFrontSnippet(card);
  if (base !== '记忆卡') {
    return disambiguate && snippet ? `${base}（${snippet}）` : base;
  }
  return snippet ? `记忆卡 · ${snippet}` : '记忆卡';
}
