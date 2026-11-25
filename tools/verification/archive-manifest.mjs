import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';

const root = path.resolve('.');
const output = path.join(root, 'output/server-implementation-2026-11-20');
const folders = [
  'output/code-review-2026-09-16', 'output/code-review-2026-10-04', 'output/content-inventory-2026-11-20',
  'output/content-review-2009-2026-10-04', 'output/history-cleanup-2026-10-11', 'output/playwright',
  'output/pre-push-2026-10-05', 'output/review-2026-11-19', 'output/review-fixes-2026-10-04',
  'output/storage-plan-2026-11-20', 'output/upgrade-2026-11-20', 'local-data/sources', 'local-data/generated',
];
const entries = []; const skippedLinks = [];
async function walk(relative) {
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Outside project');
  const stat = await lstat(absolute);
  if (stat.isSymbolicLink()) { skippedLinks.push(relative); return; }
  if (stat.isDirectory()) {
    for (const name of (await readdir(absolute)).sort()) await walk(path.join(relative, name));
  } else {
    const hash = createHash('sha256');
    for await (const bytes of createReadStream(absolute)) hash.update(bytes);
    entries.push({ path: relative.replaceAll('\\', '/'), bytes: stat.size, sha256: hash.digest('hex') });
  }
}
for (const folder of folders) await walk(folder);
const body = { format: 'bitatlas-private-archive-manifest-v1', createdAt: new Date().toISOString(), folders, entries, skippedLinks,
  files: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
  remoteDestination: null, remoteUploaded: false, remoteRestoreVerified: false, localRemovalAuthorizedByThisManifest: false };
const manifest = path.join(output, `archive-manifest-${Date.now()}.json`);
await writeFile(manifest, JSON.stringify(body, null, 2));
console.log(JSON.stringify({ manifest, files: body.files, bytes: body.bytes, sha256: createHash('sha256').update(await readFile(manifest)).digest('hex'), skippedLinks }));
