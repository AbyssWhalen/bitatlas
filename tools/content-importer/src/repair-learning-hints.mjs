import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeContentPackHash, validateContentPack } from '@408os/content-schema';
import { learningHints } from './hint-policy.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const changes = [];
for (let year = 2009; year <= 2025; year++) {
  const destination = path.join(root, 'apps', 'web', 'public', 'content', `${year}.json`);
  const pack = JSON.parse(await readFile(destination, 'utf8'));
  const before = pack.manifest.sha256;
  let removed = 0;
  for (const question of pack.questions) {
    const next = learningHints(year, question.number, question.hints);
    removed += question.hints.length - next.length;
    question.hints = next;
  }
  pack.manifest.sha256 = computeContentPackHash(pack);
  const result = validateContentPack(pack, { requireVerified: false, enforceExamShape: true });
  if (!result.success) throw new Error(JSON.stringify(result.issues));
  const json = JSON.stringify(pack);
  await writeFile(destination, json);
  await writeFile(path.join(root, 'local-data', 'generated', `${year}.pack.json`), json);
  changes.push({ year, questionContentVersion: pack.manifest.contentVersion, previousHash: before, currentHash: pack.manifest.sha256, removedHints: removed });
}
console.log(JSON.stringify(changes, null, 2));
