import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as tar from 'tar';

const receiptPath = path.resolve(process.argv[2] ?? '');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
const archive = path.resolve(receipt.archive);
assert.equal(createHash('sha256').update(await readFile(archive)).digest('hex'), receipt.sha256);
const entries = [];
await tar.list({ file: archive, onReadEntry: (entry) => {
  assert.ok(['Directory', 'File'].includes(entry.type), `不接受链接或特殊文件：${entry.path}`);
  assert.ok(entry.path.startsWith('bitatlas/') && !entry.path.includes('\\') && !entry.path.split('/').includes('..'));
  if (entry.type === 'File') entries.push(entry.path.slice('bitatlas/'.length));
} });
assert.equal(new Set(entries).size, entries.length);
const destination = path.join(path.dirname(archive), 'extracted');
await mkdir(destination, { recursive: false });
await tar.extract({ cwd: destination, file: archive, strict: true, preservePaths: false });
const staged = path.join(destination, 'bitatlas');
const manifest = JSON.parse(await readFile(path.join(staged, 'release-manifest.json'), 'utf8'));
assert.deepEqual(entries.sort(), [...manifest.entries.map((entry) => entry.path), 'release-manifest.json'].sort());
for (const entry of manifest.entries) {
  const bytes = await readFile(path.join(staged, entry.path));
  assert.equal(bytes.length, entry.bytes, entry.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.path);
}
const evidence = { passed: true, archive, archiveSha256: receipt.sha256, extracted: staged,
  files: manifest.entries.length, exactArchiveMembers: true, fileDigestsVerified: true };
await writeFile(path.join(path.dirname(archive), 'archive-verification.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
