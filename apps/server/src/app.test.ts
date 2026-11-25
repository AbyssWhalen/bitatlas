// @vitest-environment node
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { CHUNK_BYTES, MAX_FILE_BYTES, parseByteRange, privatePath } from './files';

const origin = 'http://127.0.0.1:4310';
const servers: Array<ReturnType<typeof createApp>> = [];
const password = 'test-only-password-408';
async function fixture() {
  const folder = path.resolve('output/server-implementation-2026-11-20/api-tests', randomUUID());
  await mkdir(folder, { recursive: true });
  const server = createApp({ database: path.join(folder, 'test.sqlite'), files: path.join(folder, 'files'), origin });
  servers.push(server);
  await server.auth.bootstrap('admin', password);
  const login = await server.app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username: 'admin', password } });
  expect(login.statusCode).toBe(200);
  const cookie = login.headers['set-cookie']!.toString().split(';')[0]!;
  const request = (method: 'GET' | 'POST' | 'PUT' | 'HEAD', url: string, payload?: object | Buffer, extra = {}) =>
    server.app.inject({ method, url, headers: { origin, cookie, ...extra }, ...(payload ? { payload } : {}) });
  return { ...server, request, cookie, folder };
}
afterEach(async () => { for (const server of servers.splice(0)) await server.app.close(); });

describe('static application routing', () => {
  const shell = '<!doctype html><html><body><div id="root">BitAtlas test shell</div></body></html>';
  async function staticFixture() {
    const folder = path.resolve('output/gcp-domain-2026-11-22/static-route-tests', randomUUID());
    const webRoot = path.join(folder, 'web');
    await mkdir(path.join(webRoot, 'content'), { recursive: true });
    await writeFile(path.join(webRoot, 'index.html'), shell);
    await writeFile(path.join(webRoot, 'app.js'), 'window.bitatlas = true;');
    await writeFile(path.join(webRoot, 'content', 'private.json'), '{"private":true}');
    const server = createApp({ database: path.join(folder, 'test.sqlite'), files: path.join(folder, 'files'), origin, webRoot });
    servers.push(server);
    return server.app;
  }
  it.each(['GET', 'HEAD'] as const)('serves the real shell for %s concept deep links with dotted query values', async (method) => {
    const app = await staticFixture();
    for (const url of ['/questions', '/knowledge?subject=computer-organization&node=co.memory.cache',
      '/knowledge?node=co.memory.cache&section=summary', '/knowledge?node=co.memory.cache&source=review.json']) {
      const response = await app.inject({ method, url });
      expect(response.statusCode, url).toBe(200);
      expect(response.headers['content-type'], url).toContain('text/html');
      expect(response.body, url).toBe(method === 'HEAD' ? '' : shell);
    }
  });
  it.each(['GET', 'HEAD'] as const)('keeps missing assets, API and private content out of the %s shell fallback', async (method) => {
    const app = await staticFixture();
    for (const url of ['/missing.js', '/missing.css?from=knowledge', '/missing.png?node=co.memory.cache',
      '/api/v1/missing?node=co.memory.cache', '/content/private.json', '/content/missing?node=co.memory.cache',
      '/api', '/content']) {
      const response = await app.inject({ method, url });
      expect(response.statusCode, url).toBe(404);
      expect(response.body, url).not.toContain('BitAtlas test shell');
      expect(response.body, url).not.toContain('"private":true');
    }
    const asset = await app.inject({ method, url: '/app.js?version=co.memory.cache' });
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toBe(method === 'HEAD' ? '' : 'window.bitatlas = true;');
  });
  it('preserves authentication and rejects writes to client routes', async () => {
    const app = await staticFixture();
    for (const url of ['/api/v1/content', '/api/v1/files']) expect((await app.inject(url)).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/knowledge?node=co.memory.cache', headers: { origin } })).statusCode).toBe(404);
  });
});

describe('invited server access', () => {
  it('requires a valid session, rejects cross-origin writes and does not expose password hashes', async () => {
    const { app, request } = await fixture();
    expect((await app.inject('/api/v1/content')).statusCode).toBe(401);
    expect((await app.inject('/api/v1/files')).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { username: 'admin', password } })).statusCode).toBe(403);
    expect((await request('GET', '/api/v1/auth/me')).json().account.password_hash).toBeUndefined();
    expect((await request('GET', '/api/v1/admin/accounts')).body).not.toContain('scrypt');
    expect((await request('GET', '/api/v1/sync/pull', undefined, { 'x-bitatlas-account': randomUUID() })).statusCode).toBe(401);
  });
  it('consumes invitations once, isolates admin writes and immediately revokes sessions', async () => {
    const { app, request } = await fixture();
    const invite = (await request('POST', '/api/v1/admin/invitations', { role: 'member', days: 7 })).json().invite as string;
    const signup = await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin }, payload: { invite, username: 'member', password } });
    expect(signup.statusCode).toBe(200);
    const cookie = signup.headers['set-cookie']!.toString().split(';')[0]!;
    expect((await app.inject({ method: 'POST', url: '/api/v1/admin/invitations', headers: { origin, cookie }, payload: {} })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin }, payload: { invite, username: 'another', password } })).statusCode).toBe(400);
    expect((await request('POST', `/api/v1/admin/accounts/${signup.json().account.id}/revoke`, {})).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/v1/auth/me', headers: { cookie } })).statusCode).toBe(401);
    expect((await request('POST', '/api/v1/auth/logout', {})).headers['set-cookie']).toContain('Max-Age=0');
    expect((await request('GET', '/api/v1/auth/me')).statusCode).toBe(401);
  });
  it('enforces expiration, invitation revocation and login throttling', async () => {
    const { app, request, db } = await fixture();
    const invite = (await request('POST', '/api/v1/admin/invitations', {})).json().invite as string;
    await request('POST', '/api/v1/admin/invitations/revoke', { invite });
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin }, payload: { invite, username: 'new-user', password } })).statusCode).toBe(400);
    for (let i = 0; i < 8; i++) {
      expect((await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username: 'missing', password } })).statusCode).toBe(401);
    }
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username: 'missing', password } })).statusCode).toBe(429);
    db.prepare('UPDATE auth_sessions SET expires_at=0').run();
    expect((await request('GET', '/api/v1/auth/me')).statusCode).toBe(401);
  });
});

describe('resumable authenticated files', () => {
  it('resumes exact chunks, detects corruption, publishes atomically and serves bounded ranges', async () => {
    const { app, request } = await fixture();
    const bytes = Buffer.alloc(CHUNK_BYTES + 41, 42);
    bytes.write('%PDF-1.7\n');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const started = await request('POST', '/api/v1/admin/uploads', { title: '测试.pdf', bytes: bytes.length, mime: 'application/pdf', sha256 });
    expect(started.statusCode).toBe(200);
    const id = started.json().id as string;
    const part = bytes.subarray(0, CHUNK_BYTES);
    const chunkHeaders = { 'content-type': 'application/octet-stream', 'x-chunk-sha256': createHash('sha256').update(part).digest('hex') };
    expect((await request('PUT', `/api/v1/admin/uploads/${id}/chunks/0`, part, chunkHeaders)).statusCode).toBe(200);
    expect((await request('PUT', `/api/v1/admin/uploads/${id}/chunks/0`, part, chunkHeaders)).statusCode).toBe(200);
    expect((await request('GET', `/api/v1/admin/uploads/${id}`)).json().chunks).toHaveLength(1);
    expect((await request('POST', `/api/v1/admin/uploads/${id}/complete`, {})).statusCode).toBe(409);
    const last = bytes.subarray(CHUNK_BYTES);
    expect((await request('PUT', `/api/v1/admin/uploads/${id}/chunks/1`, last, chunkHeaders)).statusCode).toBe(400);
    expect((await request('PUT', `/api/v1/admin/uploads/${id}/chunks/1`, last, { ...chunkHeaders, 'x-chunk-sha256': createHash('sha256').update(last).digest('hex') })).statusCode).toBe(200);
    const complete = await request('POST', `/api/v1/admin/uploads/${id}/complete`, {});
    expect(complete.statusCode).toBe(200);
    const fileId = complete.json().fileId as string;
    expect((await request('POST', `/api/v1/admin/uploads/${id}/complete`, {})).json().fileId).toBe(fileId);
    expect((await request('GET', '/api/v1/files')).json()).toHaveLength(0);
    expect((await request('POST', `/api/v1/admin/files/${fileId}/publish`, {})).statusCode).toBe(200);
    expect((await request('GET', '/api/v1/files')).json()).toHaveLength(1);
    expect((await app.inject(`/api/v1/files/${fileId}`)).statusCode).toBe(401);
    const range = await request('GET', `/api/v1/files/${fileId}`, undefined, { range: 'bytes=0-8' });
    expect(range.statusCode).toBe(206);
    expect(range.body).toBe('%PDF-1.7\n');
    expect(range.headers['content-length']).toBe('9');
    const head = await request('HEAD', `/api/v1/files/${fileId}`);
    expect(head.body).toBe('');
    expect(head.headers['content-length']).toBe(String(bytes.length));
    const invalid = await request('GET', `/api/v1/files/${fileId}`, undefined, { range: `bytes=${bytes.length}-` });
    expect(invalid.statusCode).toBe(416);
    expect(invalid.headers['content-range']).toBe(`bytes */${bytes.length}`);
  });
  it('rejects oversize declarations and altered stored chunks without publishing', async () => {
    const { request, folder, db } = await fixture();
    expect((await request('POST', '/api/v1/admin/uploads', { title: 'large', bytes: MAX_FILE_BYTES + 1, mime: 'application/pdf', sha256: 'a'.repeat(64) })).statusCode).toBe(400);
    const bytes = Buffer.from('%PDF-1.7\nsample');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const { id } = (await request('POST', '/api/v1/admin/uploads', { title: 'file', bytes: bytes.length, mime: 'application/pdf', sha256 })).json() as { id: string };
    await request('PUT', `/api/v1/admin/uploads/${id}/chunks/0`, bytes, { 'content-type': 'application/octet-stream', 'x-chunk-sha256': sha256 });
    await writeFile(path.join(folder, 'files', 'uploads', id, '0.chunk'), 'damaged');
    expect((await request('POST', `/api/v1/admin/uploads/${id}/complete`, {})).statusCode).toBe(409);
    expect(db.prepare('SELECT * FROM files').all()).toEqual([]);
  });
  it('validates content before publication and excludes static private content', async () => {
    const { request, app } = await fixture();
    const content = JSON.parse(await readFile(path.resolve('apps/web/public/content/2009.json'), 'utf8')) as unknown;
    const preview = await request('POST', '/api/v1/admin/content/preview', { kind: 'questions', content });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().summary.questions).toBe(47);
    expect(preview.json().blockers).not.toHaveLength(0);
    expect((await request('POST', '/api/v1/admin/content/publish', { kind: 'questions', content, expectedDigest: preview.json().digest })).statusCode).toBe(409);
    expect((await app.inject('/content/2009.json')).statusCode).toBe(404);
  });
  it('range parsing properties preserve bounds and suffix semantics', () => {
    for (let size = 1; size <= 400; size++) {
      for (const suffix of [1, size, size + 10]) {
        const range = parseByteRange(`bytes=-${suffix}`, size)!;
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.end).toBe(size - 1);
        expect(range.end - range.start + 1).toBe(Math.min(size, suffix));
      }
    }
    for (const header of ['bytes=-0', 'bytes=2-1', 'bytes=0-1,2-3', 'bytes=1.1-4', 'items=0-1']) expect(() => parseByteRange(header, 10)).toThrow();
    expect(() => privatePath(path.resolve('local-data'), '../outside')).toThrow();
  });
});
