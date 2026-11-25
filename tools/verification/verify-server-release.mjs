import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'release-manifest.json'), 'utf8'));
assert.equal(manifest.format, 'bitatlas-release-v1');
for (const entry of manifest.entries) {
  const filename = path.resolve(root, entry.path);
  assert.ok(filename.startsWith(root), `清单路径越界：${entry.path}`);
  const buffer = await readFile(filename);
  assert.equal(buffer.length, entry.bytes, entry.path);
  assert.equal(createHash('sha256').update(buffer).digest('hex'), entry.sha256, entry.path);
}
const publicFiles = await readdir(path.join(root, 'apps', 'web', 'dist-server'), { recursive: true });
assert.equal(publicFiles.some((item) => item.replaceAll('\\', '/').split('/').includes('content')), false);
const require = createRequire(path.join(root, 'apps', 'server', 'package.json'));
assert.ok(require.resolve('tsx').startsWith(path.join(root, 'node_modules') + path.sep));
const { createApp } = await import(pathToFileURL(path.join(root, 'apps', 'server', 'src', 'app.ts')).href);
const data = path.resolve(root, '..', `runtime-smoke-${Date.now()}`);
await mkdir(data);
const { app } = createApp({ database: path.join(data, 'bitatlas.sqlite'), files: path.join(data, 'files'),
  origin: 'http://127.0.0.1:4327', webRoot: path.join(root, 'apps', 'web', 'dist-server') });
try {
  await app.listen({ host: '127.0.0.1', port: 4327 });
  const checks = [];
  for (const [route, status] of [['/api/v1/health', 200], ['/', 200], ['/questions', 200],
    ['/knowledge?subject=computer-organization&node=co.memory.cache', 200],
    ['/favicon.svg', 200], ['/pwa-192.png', 200], ['/pwa-512.png', 200],
    ['/assets/missing.js?node=co.memory.cache', 404], ['/api/v1/missing', 404], ['/api', 404], ['/content', 404],
    ['/content/2009.json', 404], ['/api/v1/content', 401], ['/api/v1/sync/pull', 401], ['/api/v1/files', 401]]) {
    const response = await fetch(`http://127.0.0.1:4327${route}`);
    assert.equal(response.status, status, route);
    if (route === '/' || route.startsWith('/knowledge?')) assert.ok((await response.text()).includes('<div id="root">'));
    else await response.arrayBuffer();
    checks.push({ route, status });
  }
  const receipt = { passed: true, createdAt: new Date().toISOString(), filesVerified: manifest.entries.length,
    data, checks, platform: process.platform, node: process.version, privateContentIncluded: false };
  await writeFile(path.resolve(root, '..', 'runtime-smoke-receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally { await app.close(); }
