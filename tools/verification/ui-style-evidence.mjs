// Lossless encoding for this task's large computed-style JSON evidence.
// The same paths remain readable by readEvidence(); all original bytes are recoverable.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const format = 'bitatlas-style-evidence-gzip-v1';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function decodeEvidence(bytes) {
  const envelope = JSON.parse(bytes.toString());
  if (envelope?.format !== format) return envelope;
  const original = gunzipSync(Buffer.from(envelope.gzipBase64, 'base64'));
  assert.equal(original.length, envelope.uncompressedBytes);
  assert.equal(hash(original), envelope.sha256);
  return JSON.parse(original.toString());
}

export async function readEvidence(file) {
  return decodeEvidence(await readFile(file));
}

async function compact() {
  const root = path.resolve('output', 'playwright', 'opus-ui-2026-11-22', 'stage-1');
  const receipt = { format, files: [], originalBytes: 0, encodedBytes: 0, verified: true };
  for (const directory of await readdir(root, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    const folder = path.join(root, directory.name);
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const file = path.join(folder, entry.name);
      const raw = await readFile(file);
      const value = JSON.parse(raw.toString());
      if (value?.format === format) { decodeEvidence(raw); continue; }
      // Only generated DOM snapshots and computed-style diffs. Receipts, databases,
      // original source, PNGs, migration manifests and unrelated evidence stay as-is.
      if (!(Array.isArray(value?.records) || (Array.isArray(value) && value.length && value.every((record) => record.key)))) continue;
      if (raw.length < 32_768) continue;
      const gzip = gzipSync(raw, { level: 9, mtime: 0 });
      const encoded = Buffer.from(JSON.stringify({
        format, uncompressedBytes: raw.length, sha256: hash(raw), gzipBase64: gzip.toString('base64'),
      }) + '\n');
      if (encoded.length >= raw.length) continue;
      assert.deepEqual(decodeEvidence(encoded), value);
      assert.equal((await stat(file)).size, raw.length);
      assert.equal(hash(await readFile(file)), hash(raw), 'Evidence changed during encoding.');
      await writeFile(file, encoded);
      assert.deepEqual(await readEvidence(file), value);
      receipt.files.push({ file: path.relative(root, file), originalBytes: raw.length, encodedBytes: encoded.length,
        originalSha256: hash(raw), encodedSha256: hash(encoded), decodedVerified: true });
      receipt.originalBytes += raw.length;
      receipt.encodedBytes += encoded.length;
    }
  }
  await writeFile(path.join(root, 'evidence-encoding-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ files: receipt.files.length, originalBytes: receipt.originalBytes, encodedBytes: receipt.encodedBytes, verified: receipt.verified }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], 'compact', 'Usage: node tools/verification/ui-style-evidence.mjs compact');
  await compact();
}
