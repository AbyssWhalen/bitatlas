import { describe, expect, it } from 'vitest';
import { sourcePageAssetId } from './index';

describe('sourcePageAssetId', () => {
  it('builds the canonical registry id for question and answer pages', () => {
    expect(sourcePageAssetId('cn408-2009', 'questions', 6)).toBe('cn408-2009-source-questions-page-6');
    expect(sourcePageAssetId('cn408-2010', 'answers', 12)).toBe('cn408-2010-source-answers-page-12');
  });
});
