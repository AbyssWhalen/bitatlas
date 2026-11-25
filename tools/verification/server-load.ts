import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { seedServer, TEST_PASSWORD } from './server-fixture';

const port = Number(process.env.BITATLAS_LOAD_PORT ?? 4322);
const folder = path.resolve('output/server-implementation-2026-11-20/load', new Date().toISOString().replaceAll(':', '-'));
if (process.argv.includes('--child')) {
  const result = await seedServer(process.env.BITATLAS_LOAD_FOLDER!, port);
  const timer = setInterval(() => process.send?.({ rss: process.memoryUsage().rss }), 1000);
  process.send?.({ ready: true, fileId: result.fileId, pid: process.pid });
  process.on('message', () => { clearInterval(timer); void result.app.close().then(() => process.exit(0)); });
} else {
  await mkdir(folder, { recursive: true });
  const sourceFiles = await readdir(path.resolve('apps/server/src'));
  const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.filter((name) => name.endsWith('.ts')).map(async (name) =>
    [name, createHash('sha256').update(await readFile(path.resolve('apps/server/src', name))).digest('hex')])));
  const child = fork(fileURLToPath(import.meta.url), ['--child'], {
    execArgv: ['--import', 'tsx'], env: { ...process.env, BITATLAS_LOAD_FOLDER: folder },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const rss: number[] = [];
  const childErrors: string[] = [];
  child.stderr?.on('data', (chunk) => childErrors.push(String(chunk)));
  const ready = await new Promise<{ fileId: string; pid: number }>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => { if (code) reject(new Error(`Server child exited ${code}`)); });
    child.on('message', (message) => {
      const value = message as { ready?: boolean; fileId: string; pid: number; rss?: number };
      if (value.rss) rss.push(value.rss);
      if (value.ready) resolve(value);
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  const cookies: string[] = [];
  const accountIds: string[] = [];
  for (let index = 0; index < 20; index++) {
    const response = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: `member${index}`, password: TEST_PASSWORD }) });
    if (!response.ok) throw new Error(`Login ${response.status}`);
    cookies.push(response.headers.get('set-cookie')!.split(';')[0]!);
    accountIds.push((await response.json()).account.id as string);
  }
  const seconds = Number(process.env.BITATLAS_LOAD_SECONDS ?? 1800);
  const started = performance.now();
  const latencies: number[] = []; const pdfLatencies: number[] = [];
  const failures: Array<{ user: number; route: string; status: number }> = [];
  let bytes = 0;
  const tasks = cookies.map(async (cookie, user) => {
    let turn = 0; let revision = 0;
    while ((performance.now() - started) / 1000 < seconds) {
      const isPdf = user < 5 && turn % 2 === 0;
      const now = new Date().toISOString();
      const url = isPdf ? `/files/${ready.fileId}` : turn % 10 === 1 ? '/sync/push' : turn % 10 === 2 ? '/plans/today' : turn % 3 === 0 ? '/sync/pull' : '/content';
      const body = url === '/sync/push' ? {
        operationId: randomUUID(), deviceId: randomUUID(), createdAt: now,
        changes: [{ kind: 'notes', entityId: `load-note:${user}`, baseRevision: revision,
          value: { id: `load-note:${user}`, questionId: 'cn408-2009-q01', body: `持续学习记录 ${turn}`, createdAt: now, updatedAt: now } }],
      } : url === '/plans/today' ? {} : undefined;
      const begin = performance.now();
      try {
        const response = await fetch(`${origin}/api/v1${url}`, { method: body ? 'POST' : 'GET',
          headers: { Origin: origin, Cookie: cookie, 'X-BitAtlas-Account': accountIds[user]!, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(isPdf ? { Range: 'bytes=0-262143' } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const buffer = await response.arrayBuffer(); bytes += buffer.byteLength;
        if (!response.ok) failures.push({ user, route: url, status: response.status });
        else if (url === '/sync/push') {
          const result = JSON.parse(Buffer.from(buffer).toString());
          if (result.status !== 'accepted') failures.push({ user, route: url, status: 409 });
          else revision++;
        }
        (isPdf ? pdfLatencies : latencies).push(performance.now() - begin);
      } catch { failures.push({ user, route: url, status: 0 }); }
      turn++;
      await delay(Math.max(0, 1000 - (performance.now() - begin)));
    }
  });
  const progress = setInterval(() => console.log(`load: ${Math.floor((performance.now() - started) / 1000)}s, ${latencies.length + pdfLatencies.length} requests, ${failures.length} failures`), 60_000);
  await Promise.all(tasks); clearInterval(progress);
  child.send({ stop: true });
  const sorted = latencies.sort((a, b) => a - b); const sortedPdf = pdfLatencies.sort((a, b) => a - b);
  const report = { users: 20, pdfReaders: 5, durationSeconds: (performance.now() - started) / 1000, serverPid: ready.pid,
    apiRequests: latencies.length, pdfRequests: pdfLatencies.length, bytes, apiP95Ms: sorted[Math.floor(sorted.length * 0.95)],
    pdfP95Ms: sortedPdf[Math.floor(sortedPdf.length * 0.95)], maxBackendRssMiB: Math.max(...rss) / 1024 / 1024,
    failures, childErrors, sourceHashes, expectedAccountHeader: true, environment: 'local Windows; not GCP capacity evidence',
  };
  await writeFile(path.join(folder, 'load-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, failures: failures.length, reportPath: path.join(folder, 'load-report.json') }));
  if (failures.length || report.apiP95Ms! >= 500 || report.maxBackendRssMiB > 256 || childErrors.length) process.exitCode = 1;
}
