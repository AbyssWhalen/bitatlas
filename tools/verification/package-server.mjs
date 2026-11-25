import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, readFile, copyFile, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as tar from 'tar';

const root = fileURLToPath(new URL('../../', import.meta.url));
const destination = path.join(root, 'output', 'server-implementation-2026-11-20', `release-${new Date().toISOString().replaceAll(':', '-')}`);
await mkdir(destination, { recursive: false });
const staged = path.join(destination, 'bitatlas');
await mkdir(staged);
const entries = [];
async function include(relative) {
  const filename = path.join(root, relative);
  const stat = await lstat(filename);
  if (stat.isSymbolicLink()) throw new Error(`发布白名单不接受链接：${relative}`);
  if (stat.isDirectory()) {
    for (const item of (await readdir(filename)).sort()) await include(path.join(relative, item));
    return;
  }
  if (/\.(?:test|spec)\./.test(relative)) return;
  if (relative.replaceAll('\\', '/').split('/').some((part) => ['content', '.env', 'local-data', '.git', '.workbuddy', 'node_modules'].includes(part))) throw new Error(`禁止夹带私人内容：${relative}`);
  const target = path.join(staged, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(filename, target);
  const buffer = await readFile(target);
  entries.push({ path: relative.replaceAll('\\', '/'), bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
}
for (const item of ['package.json', 'package-lock.json', 'apps/server', 'apps/web/package.json', 'apps/web/dist-server',
  'docs/server/deployment.md', 'docs/server/migration-v5.md', 'docs/server/content-review.md', 'docs/server/dependency-assessment.md']) {
  if (item === 'apps/server') {
    await include('apps/server/package.json'); await include('apps/server/src');
  } else await include(item);
}
for (const name of ['content-schema', 'domain', 'storage', 'cpu-core', 'lab-core']) {
  await include(`packages/${name}/package.json`);
  if (['content-schema', 'domain', 'storage'].includes(name)) await include(`packages/${name}/src`);
}
await include('tools/content-importer/package.json');
await include('tools/verification/install-server.mjs');
await include('tools/verification/verify-server-release.mjs');
const manifest = { format: 'bitatlas-release-v1', createdAt: new Date().toISOString(), node: '24', entries,
  files: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), privateContentIncluded: false };
await writeFile(path.join(staged, 'release-manifest.json'), JSON.stringify(manifest, null, 2));
const archive = path.join(destination, 'bitatlas-server.tar.gz');
await tar.create({ file: archive, cwd: destination, gzip: true, portable: true }, ['bitatlas']);
const receipt = { archive, sha256: createHash('sha256').update(await readFile(archive)).digest('hex'), files: manifest.files,
  unpackedBytes: manifest.bytes, packedBytes: (await lstat(archive)).size, remoteUploaded: false };
await writeFile(path.join(destination, 'release-receipt.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
