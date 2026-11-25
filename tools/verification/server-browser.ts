import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { seedServer } from './server-fixture';

const folder = path.resolve('output/server-implementation-2026-11-20/browser-server', randomUUID());
const result = await seedServer(folder, 4323, true);
console.log('Disposable browser fixture ready on 127.0.0.1:4323');
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => { void result.app.close(); });
