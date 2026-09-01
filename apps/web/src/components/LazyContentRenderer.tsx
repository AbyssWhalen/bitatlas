import type { ContentBlock } from '@408os/domain';
import { lazy, Suspense } from 'react';

const DeferredContentRenderer = lazy(() => import('./ContentRenderer').then((module) => ({
  default: module.ContentRenderer,
})));

function fallbackText(blocks: ContentBlock[]): string {
  return blocks.map((block) => {
    if (block.type === 'text') return block.text;
    if (block.type === 'math') return block.expression;
    if (block.type === 'code') return block.code;
    if (block.type === 'image') return block.alt;
    return [block.headers, ...block.rows].flat().join(' ');
  }).join(' ').trim();
}

export function LazyContentRenderer({ blocks, compact = false }: { blocks: ContentBlock[]; compact?: boolean }) {
  const preview = fallbackText(blocks);
  return (
    <Suspense fallback={(
      <div className={compact ? 'content-blocks compact' : 'content-blocks'} aria-busy="true">
        {preview && <p>{preview}</p>}
      </div>
    )}
    >
      <DeferredContentRenderer blocks={blocks} compact={compact} />
    </Suspense>
  );
}
