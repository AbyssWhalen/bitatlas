import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';
import { z } from 'zod';
import { privatePath } from './files';

const manifestSchema = z.object({
  format: z.literal('bitatlas-server-backup-v1'), createdAt: z.iso.datetime(), schemaVersion: z.literal(1),
  database: z.object({ path: z.literal('server.sqlite'), sha256: z.string().length(64), bytes: z.int().positive() }).strict(),
  objects: z.array(z.object({ path: z.string().regex(/^files\/objects\/[a-f0-9]{64}$/), sha256: z.string().length(64), bytes: z.int().positive() }).strict()),
}).strict();
async function digestFile(filename: string) {
  const hash = createHash('sha256'); for await (const bytes of createReadStream(filename)) hash.update(bytes);
  return { sha256: hash.digest('hex'), bytes: (await stat(filename)).size };
}
async function newDirectory(folder: string) { await mkdir(folder, { recursive: false, mode: 0o700 }); }
async function ageRun(binary: string, args: string[]) {
  const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostic = '';
  child.stderr.on('data', (chunk) => { if (diagnostic.length < 4000) diagnostic += String(chunk); });
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`age 失败（${code}）：${diagnostic}`)));
  });
}
export function finalizeRestoredDatabase(database: Database.Database, objects: Array<{ path: string; sha256: string; bytes: number }>) {
  if (database.pragma('integrity_check', { simple: true }) !== 'ok' || database.pragma('user_version', { simple: true }) !== 1) throw new Error('恢复数据库结构检查失败。');
  const byHash = new Map(objects.map((object) => [object.sha256, object]));
  if (byHash.size !== objects.length || objects.some((object) => object.path !== `files/objects/${object.sha256}`)) throw new Error('恢复资料清单含重复摘要或不匹配的对象路径。');
  const records = database.prepare('SELECT id,sha256,bytes FROM files').all() as Array<{ id: string; sha256: string; bytes: number }>;
  if (records.some((record) => byHash.get(record.sha256)?.bytes !== record.bytes)
    || [...byHash.keys()].some((hash) => !records.some((record) => record.sha256 === hash))) throw new Error('恢复数据库与资料清单不一致。');
  const epoch = randomUUID();
  database.transaction(() => {
    database.prepare("UPDATE meta SET value=? WHERE key='sync_epoch'").run(epoch);
    database.prepare('DELETE FROM auth_sessions').run();
    database.prepare('UPDATE invitations SET revoked=1').run();
    // Interrupted uploads are not published objects. Resume from zero chunks on the new host.
    database.prepare("DELETE FROM upload_chunks WHERE upload_id IN (SELECT id FROM uploads WHERE state='open')").run();
    for (const record of records) database.prepare('UPDATE files SET relative_path=? WHERE id=?').run(path.join('objects', record.sha256), record.id);
  })();
  return epoch;
}
export async function createEncryptedBackup(input: { database: Database.Database; files: string; output: string; ageBinary: string; recipient: string }) {
  if (!/^age1[a-z0-9]{58}$/.test(input.recipient)) throw new Error('需要有效的 age X25519 接收者公钥。');
  await newDirectory(input.output);
  const stage = path.join(input.output, 'snapshot'); await newDirectory(stage);
  const snapshotPath = path.join(stage, 'server.sqlite');
  await input.database.backup(snapshotPath);
  const snapshot = new Database(snapshotPath, { readonly: true });
  let objects: Array<{ sha256: string; bytes: number; relative_path: string }>;
  try {
    if (snapshot.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('数据库快照完整性检查失败。');
    objects = snapshot.prepare('SELECT DISTINCT sha256,bytes,relative_path FROM files ORDER BY sha256').all() as typeof objects;
  } finally { snapshot.close(); }
  const entries = [];
  for (const object of objects) {
    const destination = `files/objects/${object.sha256}`;
    const source = privatePath(input.files, object.relative_path);
    const hash = await digestFile(source);
    if (hash.sha256 !== object.sha256 || hash.bytes !== object.bytes) throw new Error(`资料摘要或长度错误：${object.sha256}`);
    const target = privatePath(stage, destination);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await copyFile(source, target);
    entries.push({ path: destination, sha256: hash.sha256, bytes: hash.bytes });
  }
  const manifest = manifestSchema.parse({
    format: 'bitatlas-server-backup-v1', createdAt: new Date().toISOString(), schemaVersion: 1,
    database: { path: 'server.sqlite', ...await digestFile(snapshotPath) }, objects: entries,
  });
  await writeFile(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
  const archive = path.join(input.output, 'snapshot.tar');
  await tar.create({ cwd: stage, file: archive, portable: true }, ['server.sqlite', 'manifest.json', ...entries.map((entry) => entry.path)]);
  const encrypted = path.join(input.output, 'snapshot.tar.age');
  await ageRun(input.ageBinary, ['--encrypt', '--recipient', input.recipient, '--output', `${encrypted}.pending`, archive]);
  await rename(`${encrypted}.pending`, encrypted);
  const receipt = { createdAt: manifest.createdAt, encryptedFile: encrypted, ...await digestFile(encrypted), objects: entries.length,
    plaintextStaging: [stage, archive], note: 'Staging retained; cleanup requires an explicit retention decision.' };
  await writeFile(path.join(input.output, 'receipt.json'), JSON.stringify(receipt, null, 2));
  return receipt;
}
export async function restoreEncryptedBackup(input: { encryptedFile: string; expectedSha256: string; destination: string; ageBinary: string; identityFile: string }) {
  if ((await digestFile(input.encryptedFile)).sha256 !== input.expectedSha256) throw new Error('加密备份摘要不匹配。');
  await newDirectory(input.destination);
  const archive = path.join(input.destination, 'restore.tar');
  await ageRun(input.ageBinary, ['--decrypt', '--identity', input.identityFile, '--output', archive, input.encryptedFile]);
  const seen = new Set<string>();
  let invalid = false;
  await tar.list({ file: archive, onReadEntry: (entry) => {
    const valid = entry.type === 'File' && /^(?:server\.sqlite|manifest\.json|files\/objects\/[a-f0-9]{64})$/.test(entry.path);
    if (!valid || seen.has(entry.path) || entry.size > 1024 ** 3) invalid = true;
    seen.add(entry.path);
  } });
  if (invalid || !seen.has('manifest.json') || !seen.has('server.sqlite')) throw new Error('备份归档含无效路径、链接或重复条目，停止恢复。');
  const restored = path.join(input.destination, 'restored'); await newDirectory(restored);
  await tar.extract({ cwd: restored, file: archive, strict: true, preservePaths: false, noChmod: true });
  const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(restored, 'manifest.json'), 'utf8')));
  const declared = new Set(['manifest.json', manifest.database.path, ...manifest.objects.map((entry) => entry.path)]);
  if (seen.size !== declared.size || [...seen].some((entry) => !declared.has(entry))) throw new Error('备份清单与文件集合不一致。');
  for (const entry of [manifest.database, ...manifest.objects]) {
    const actual = await digestFile(privatePath(restored, entry.path));
    if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) throw new Error(`恢复文件校验失败：${entry.path}`);
  }
  const database = new Database(path.join(restored, 'server.sqlite'));
  let epoch: string;
  try {
    epoch = finalizeRestoredDatabase(database, manifest.objects);
  } finally { database.close(); }
  const databaseFile = path.join(restored, 'bitatlas.sqlite');
  await rename(path.join(restored, 'server.sqlite'), databaseFile);
  const receipt = { restored, databaseFile, epoch, objectCount: manifest.objects.length, verified: true, authSessionsRevoked: true };
  await writeFile(path.join(input.destination, 'restore-receipt.json'), JSON.stringify(receipt, null, 2));
  return receipt;
}
export function retentionCandidates(snapshots: Array<{ id: string; createdAt: string }>) {
  const sorted = [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const keep = new Set<string>(); const days = new Set<string>(); const weeks = new Set<string>();
  for (const item of sorted) {
    const date = new Date(item.createdAt);
    if (!Number.isFinite(date.getTime())) throw new Error('快照日期无效。');
    const day = item.createdAt.slice(0, 10);
    const monday = new Date(date); monday.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const week = monday.toISOString().slice(0, 10);
    if (days.size < 7 && !days.has(day)) { keep.add(item.id); days.add(day); }
    if (weeks.size < 4 && !weeks.has(week)) { keep.add(item.id); weeks.add(week); }
  }
  return { keep: sorted.filter((item) => keep.has(item.id)), candidates: sorted.filter((item) => !keep.has(item.id)), deletesFiles: false };
}
export async function uploadEncryptedBackup(input: { encryptedFile: string; host: string; remoteDirectory: string }) {
  if (!/^[A-Za-z0-9_.-]+@[A-Za-z0-9.-]+$/.test(input.host) || !/^\/[A-Za-z0-9_./-]+$/.test(input.remoteDirectory)
    || input.remoteDirectory.split('/').includes('..')) throw new Error('SSH 目标无效。');
  if (!input.encryptedFile.endsWith('.age')) throw new Error('只能上传加密归档。');
  const { sha256: hash } = await digestFile(input.encryptedFile);
  const destination = `${input.remoteDirectory}/${hash}.tar.age`;
  // Exact validated paths only; remote command has no user-controlled shell metacharacters.
  const command = `umask 077; mkdir -p ${input.remoteDirectory} && cat > ${destination}.pending && test "$(sha256sum ${destination}.pending | cut -d ' ' -f 1)" = ${hash} && mv ${destination}.pending ${destination}`;
  const ssh = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', input.host, command], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  const completion = new Promise<void>((resolve, reject) => { ssh.once('error', reject); ssh.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`SSH 上传失败：${code}`))); });
  await Promise.all([pipeline(createReadStream(input.encryptedFile), ssh.stdin), completion]);
  return { destination, sha256: hash };
}

// Retained for streaming archive consumers; no plaintext is ever sent to SSH.
export async function copyEncryptedStream(source: string, destination: string) {
  if (!source.endsWith('.age') || !destination.endsWith('.age')) throw new Error('仅处理加密文件。');
  await pipeline(createReadStream(source), createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
}
