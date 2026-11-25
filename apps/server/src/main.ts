import path from 'node:path';
import { createApp } from './app';

const origin = process.env.BITATLAS_ORIGIN ?? 'http://127.0.0.1:4310';
const port = Number(process.env.BITATLAS_PORT ?? 4310);
const data = path.resolve(process.env.BITATLAS_DATA ?? path.join(process.cwd(), '..', '..', 'local-data', 'server'));
const { app } = createApp({ origin, database: path.join(data, 'bitatlas.sqlite'), files: path.join(data, 'files'),
  webRoot: path.resolve(process.env.BITATLAS_WEB_ROOT ?? path.join(process.cwd(), '..', 'web', 'dist-server')) });
await app.listen({ port, host: '127.0.0.1' });
console.log(`BitAtlas API listening at 127.0.0.1:${port}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close(); });
