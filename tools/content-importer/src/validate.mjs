import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContentPack } from '@408os/content-schema';
import { validateContentPackAssets } from './release-2009-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const generatedDir = path.join(root, 'local-data', 'generated');
const publicContentDir = path.join(root, 'apps', 'web', 'public', 'content');

const publicPacks = (await readdir(publicContentDir))
  .filter((name) => /^\d{4}\.json$/.test(name))
  .sort();
if (publicPacks.length === 0) throw new Error('No content packs found in apps/web/public/content.');

let failed = false;
for (const fileName of publicPacks) {
  const year = Number(fileName.slice(0, 4));
  try {
    const pack = JSON.parse(await readFile(path.join(publicContentDir, fileName), 'utf8'));
    const result = validateContentPack(pack, { requireVerified: false, enforceExamShape: true });
    if (!result.success) {
      console.error(result.issues);
      throw new Error(`schema validation failed for ${fileName}`);
    }
    await validateContentPackAssets(pack, { publicRoot: path.join(root, 'apps', 'web', 'public') });

    // 交叉核对：公开题包与本地生成产物必须解析等价（防手改生成物）。
    const generated = JSON.parse(await readFile(path.join(generatedDir, `${year}.pack.json`), 'utf8'));
    if (JSON.stringify(generated) !== JSON.stringify(pack)) {
      throw new Error(`public/${fileName} differs from generated/${year}.pack.json`);
    }

    // 来源文件哈希核对：重构 PDF 必须与题包记录一致（存在时才核对）。
    for (const question of pack.questions.slice(0, 1)) {
      for (const document of [question.source.question, question.source.answer]) {
        const localPath = path.join(root, 'local-data', 'sources', 'rebuild', document.fileName);
        try {
          const bytes = await readFile(localPath);
          const hash = createHash('sha256').update(bytes).digest('hex');
          if (hash !== document.sha256) throw new Error(`Source hash mismatch: ${document.fileName}`);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
    }

    const objective = pack.questions.filter((question) => question.kind === 'single-choice').length;
    const comprehensive = pack.questions.length - objective;
    const verified = pack.questions.filter((question) => question.reviewStatus === 'verified').length;
    console.log(`PASS ${pack.manifest.id}: ${pack.questions.length} questions (${objective} objective, ${comprehensive} comprehensive)`);
    console.log(`Review status: ${pack.manifest.reviewStatus}; verified ${verified}/${pack.questions.length}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${fileName}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
