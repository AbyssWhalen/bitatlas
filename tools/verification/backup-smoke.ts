import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { seedServer, TEST_PASSWORD } from './server-fixture';
import { createEncryptedBackup, restoreEncryptedBackup } from '../../apps/server/src/backup';
import { createApp } from '../../apps/server/src/app';

const binaries = path.resolve('local-data/tools/age-1.3.2/bin/age');
const root = path.resolve('local-data/server-backup-smoke', randomUUID());
await mkdir(root, { recursive: true });
const identity = path.join(root, 'test-identity.txt');
const child = spawn(path.join(binaries, 'age-keygen.exe'), ['-o', identity], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let output = '';
child.stderr.on('data', (chunk) => { output += String(chunk); });
await new Promise<void>((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => code === 0 ? resolve() : reject(new Error('测试密钥生成失败'))); });
const recipient = /age1[a-z0-9]{58}/.exec(output)?.[0];
if (!recipient) throw new Error('测试公钥生成失败');
output = '';
const server = await seedServer(path.join(root, 'source'), 4324);
try {
  const previousSession = await server.auth.login({ username: 'testadmin', password: TEST_PASSWORD }, 'backup-smoke');
  server.auth.invite({ ...previousSession.result.account, active: 1 }, { role: 'member', days: 7 });
  const receipt = await createEncryptedBackup({ database: server.db, files: path.join(root, 'source', 'files'), output: path.join(root, 'backup'), ageBinary: path.join(binaries, 'age.exe'), recipient });
  const result = await restoreEncryptedBackup({ encryptedFile: receipt.encryptedFile, expectedSha256: receipt.sha256,
    destination: path.join(root, 'restore'), ageBinary: path.join(binaries, 'age.exe'), identityFile: identity });
  const restored = new Database(result.databaseFile, { readonly: true, fileMustExist: true });
  try {
    const accountCount = (restored.prepare('SELECT COUNT(*) AS n FROM accounts').get() as { n: number }).n;
    const contentCount = (restored.prepare('SELECT COUNT(*) AS n FROM content_versions').get() as { n: number }).n;
    if (accountCount !== 21 || contentCount !== 18) throw new Error('恢复后条目数不一致');
    const originalEpoch = (server.db.prepare("SELECT value FROM meta WHERE key='sync_epoch'").get() as { value: string }).value;
    if (originalEpoch === result.epoch) throw new Error('恢复后 epoch 未轮换');
    if ((restored.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get() as { n: number }).n !== 0
      || (restored.prepare('SELECT COUNT(*) AS n FROM invitations WHERE revoked=0').get() as { n: number }).n !== 0) throw new Error('旧会话或邀请未失效');
    const recovered = createApp({ database: result.databaseFile, files: path.join(result.restored, 'files'), origin: 'http://127.0.0.1:4328' });
    try {
      const oldAccess = await recovered.app.inject({ url: '/api/v1/content', headers: { cookie: previousSession.cookie.split(';')[0]! } });
      if (oldAccess.statusCode !== 401) throw new Error('恢复后旧Cookie仍可读取内容');
      const signedIn = await recovered.auth.login({ username: 'testadmin', password: TEST_PASSWORD }, 'restored-smoke');
      const range = await recovered.app.inject({ url: `/api/v1/files/${server.fileId}`,
        headers: { cookie: signedIn.cookie.split(';')[0]!, range: 'bytes=0-31' } });
      if (range.statusCode !== 206 || range.rawPayload.length !== 32 || !range.rawPayload.toString().startsWith('%PDF-1.7')) throw new Error('恢复后资料Range读取失败');
    } finally { await recovered.app.close(); }
    const corrupt = path.join(root, 'broken.tar.age');
    await writeFile(corrupt, Buffer.from('not an encrypted archive'));
    let rejected = false;
    try { await restoreEncryptedBackup({ encryptedFile: corrupt, expectedSha256: receipt.sha256, destination: path.join(root, 'must-not-exist'), ageBinary: path.join(binaries, 'age.exe'), identityFile: identity }); }
    catch { rejected = true; }
    if (!rejected) throw new Error('损坏备份未被拒绝');
    const encryptedSha256 = createHash('sha256').update(await readFile(receipt.encryptedFile)).digest('hex');
    const evidence = { encryptedSha256, objects: receipt.objects, accountCount, contentCount, epochRotated: true, corruptionRejected: true, authSessionsRevoked: true,
      previousCookieRejected: true, restoredApplicationRangeRead: true, invitationsRevoked: true,
      restored: result.restored, scope: 'local disposable fixture; no remote upload or live server restore' };
    await writeFile(process.argv[2] ?? 'output/server-implementation-2026-11-20/backup-smoke.json', JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence));
  } finally { restored.close(); }
} finally { await server.app.close(); }
