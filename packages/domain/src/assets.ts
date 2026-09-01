export type SourcePageDocument = 'questions' | 'answers';

export function sourcePageAssetId(packId: string, document: SourcePageDocument, page: number): string {
  return `${packId}-source-${document}-page-${page}`;
}
