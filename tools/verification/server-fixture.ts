import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { createApp } from '../../apps/server/src/app';
import type { ContentPack, LearningPack } from '@408os/domain';
import { createTwoPagePdf } from '../../tests/e2e/pdf-fixture';

export const TEST_PASSWORD = 'disposable-test-only-408';
export async function seedServer(folder: string, port: number, web: boolean | string = false) {
  await mkdir(folder, { recursive: true });
  const root = path.resolve('.');
  const files = path.join(folder, 'files');
  const result = createApp({ database: path.join(folder, 'server.sqlite'), files, origin: `http://127.0.0.1:${port}`,
    ...(web ? { webRoot: typeof web === 'string' ? web : path.join(root, 'apps', 'web', 'dist-server') } : {}) });
  const admin = await result.auth.bootstrap('testadmin', TEST_PASSWORD);
  const encoded = await result.auth.hashPassword(TEST_PASSWORD);
  for (let i = 0; i < 20; i++) result.db.prepare('INSERT INTO accounts(id,username,password_hash,role,created_at) VALUES (?,?,?,?,?)')
    .run(randomUUID(), `member${i}`, encoded, 'member', new Date().toISOString());
  for (let year = 2009; year <= 2025; year++) {
    const pack = JSON.parse(await readFile(path.join(root, 'apps', 'web', 'public', 'content', `${year}.json`), 'utf8')) as ContentPack;
    result.db.prepare('INSERT INTO content_versions(id,version,kind,digest,title,payload,created_by,created_at,published) VALUES (?,?,?,?,?,?,?,?,1)')
      .run(pack.manifest.id, pack.manifest.contentVersion, 'questions', pack.manifest.sha256, pack.manifest.title, JSON.stringify(pack), admin.id, new Date().toISOString());
    if (web) for (const asset of pack.assets) {
      if (result.db.prepare('SELECT 1 FROM files WHERE sha256=?').get(asset.sha256)) continue;
      const relative = path.join('objects', asset.sha256);
      await mkdir(path.dirname(path.join(files, relative)), { recursive: true });
      await copyFile(path.join(root, 'apps', 'web', 'public', asset.path.replace(/^\/+/, '')), path.join(files, relative));
      const bytes = (await readFile(path.join(files, relative))).byteLength;
      result.db.prepare('INSERT INTO files(id,title,sha256,bytes,mime,created_by,created_at,published,relative_path) VALUES (?,?,?,?,?,?,?,1,?)')
        .run(randomUUID(), asset.id, asset.sha256, bytes, asset.mimeType, admin.id, new Date().toISOString(), relative);
    }
  }
  const learning = JSON.parse(await readFile(path.join(root, 'apps', 'web', 'public', 'content', 'learning.json'), 'utf8')) as LearningPack;
  result.db.prepare('INSERT INTO content_versions(id,version,kind,digest,title,payload,created_by,created_at,published) VALUES (?,?,?,?,?,?,?,?,1)')
    .run(learning.id, learning.version, 'learning', learning.sha256, '学习包', JSON.stringify(learning), admin.id, new Date().toISOString());
  const pdf = web ? createTwoPagePdf() : Buffer.alloc(16 * 1024 * 1024, 45);
  if (!web) pdf.write('%PDF-1.7\n');
  const hash = createHash('sha256').update(pdf).digest('hex');
  const relative = path.join('objects', hash);
  await mkdir(path.dirname(path.join(files, relative)), { recursive: true });
  await writeFile(path.join(files, relative), pdf);
  const fileId = randomUUID();
  result.db.prepare('INSERT INTO files(id,title,sha256,bytes,mime,created_by,created_at,published,relative_path) VALUES (?,?,?,?,?,?,?,1,?)')
    .run(fileId, '服务器测试资料.pdf', hash, pdf.byteLength, 'application/pdf', admin.id, new Date().toISOString(), relative);
  await result.app.listen({ port, host: '127.0.0.1' });
  return { ...result, fileId };
}
