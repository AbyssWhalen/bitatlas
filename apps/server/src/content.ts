import { parseContentPack, parseLearningPack, validateContentPack } from '@408os/content-schema';
import { questionAvailability, type ContentPack, type LearningPack } from '@408os/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth';
import { ApiError } from './errors';

interface ContentRow { id: string; version: string; kind: string; digest: string; payload: string; published: number }
export class ContentService {
  constructor(readonly auth: AuthService) {}
  catalog() { return this.auth.db.prepare('SELECT id,version,kind,digest,title FROM content_versions WHERE published=1 ORDER BY id').all(); }
  questions(): ContentPack[] {
    return (this.auth.db.prepare("SELECT payload FROM content_versions WHERE published=1 AND kind='questions'").all() as Array<{ payload: string }>).map((row) => JSON.parse(row.payload) as ContentPack);
  }
  learning(): LearningPack | undefined {
    const row = this.auth.db.prepare("SELECT payload FROM content_versions WHERE published=1 AND kind='learning'").get() as { payload: string } | undefined;
    return row ? JSON.parse(row.payload) as LearningPack : undefined;
  }
  preview(input: unknown) {
    const { kind, content } = z.object({ kind: z.enum(['questions', 'learning']), content: z.unknown() }).strict().parse(input);
    if (kind === 'learning') {
      const pack = parseLearningPack(content);
      const questions = new Map(this.questions().flatMap((entry) => entry.questions).map((question) => [question.id, question]));
      const unavailable = pack.mappings.filter((mapping) => questions.get(mapping.questionId)?.contentVersion !== mapping.questionContentVersion);
      return { id: pack.id, version: pack.version, kind, digest: pack.sha256, title: '跨年知识与复习', content: pack,
        summary: { cards: pack.cards.length, articles: pack.articles?.length ?? 0, mappings: pack.mappings.length, unavailableMappings: unavailable.map((entry) => entry.questionId) },
        blockers: unavailable.length ? ['关联题包未发布或版本不匹配'] : [] };
    }
    const pack = parseContentPack(content);
    const validation = validateContentPack(pack);
    if (!validation.success) throw new ApiError(400, 'CONTENT_INVALID', validation.issues.map((issue) => issue.message).join('；'));
    const missingAssets = pack.assets.filter((asset) => !this.auth.db.prepare('SELECT 1 FROM files WHERE sha256=? AND mime=? AND published=1').get(asset.sha256, asset.mimeType));
    const assets = new Map(pack.assets.map((asset) => [asset.id, asset]));
    return { id: pack.manifest.id, version: pack.manifest.contentVersion, kind, digest: pack.manifest.sha256, title: pack.manifest.title, content: pack,
      summary: { questions: pack.questions.length, unavailableQuestions: pack.questions.filter((question) => !questionAvailability(question, assets).practice).map((question) => question.id),
        missingExplanations: pack.questions.filter((question) => questionAvailability(question).explanationMissing).map((question) => question.id),
        missingAssets: missingAssets.map((asset) => asset.id) },
      blockers: missingAssets.length ? ['必要资料图片尚未发布'] : [] };
  }
  routes(app: FastifyInstance) {
    app.get('/api/v1/content', async (request) => { this.auth.require(request); return this.catalog(); });
    app.get('/api/v1/content/:id', async (request) => {
      this.auth.require(request);
      const { id } = z.object({ id: z.string().min(1).max(200) }).parse(request.params);
      const row = this.auth.db.prepare('SELECT * FROM content_versions WHERE id=? AND published=1').get(id) as ContentRow | undefined;
      if (!row) throw new ApiError(404, 'PACK_NOT_FOUND', '题包尚未发布。');
      return JSON.parse(row.payload) as unknown;
    });
    app.post('/api/v1/admin/content/preview', { bodyLimit: 16 * 1024 * 1024 }, async (request) => {
      this.auth.require(request, true);
      const { content: _content, ...preview } = this.preview(request.body);
      void _content;
      return preview;
    });
    app.post('/api/v1/admin/content/publish', { bodyLimit: 16 * 1024 * 1024 }, async (request) => {
      const account = this.auth.require(request, true);
      const { kind, content, expectedDigest } = z.object({ kind: z.enum(['questions', 'learning']), content: z.unknown(), expectedDigest: z.string().length(64) }).strict().parse(request.body);
      const preview = this.preview({ kind, content });
      if (preview.digest !== expectedDigest || preview.blockers.length) throw new ApiError(409, 'PREVIEW_CHANGED', '内容与预检不一致，或仍有未满足的发布条件。');
      return this.auth.db.transaction(() => {
        const old = this.auth.db.prepare('SELECT * FROM content_versions WHERE id=? AND version=?').get(preview.id, preview.version) as ContentRow | undefined;
        if (old && old.digest !== preview.digest) throw new ApiError(409, 'VERSION_CONFLICT', '同版本内容不能被替换，请提升内容版本。');
        const current = this.auth.db.prepare('SELECT * FROM content_versions WHERE id=? AND published=1').get(preview.id) as ContentRow | undefined;
        if (current && preview.version.localeCompare(current.version, 'en', { numeric: true }) < 0) {
          throw new ApiError(409, 'CONTENT_DOWNGRADE', '不能发布比当前版本更旧的内容。');
        }
        if (current?.kind === 'questions' && kind === 'questions') {
          const prior = parseContentPack(JSON.parse(current.payload));
          const next = preview.content as ContentPack;
          if (prior.manifest.reviewStatus === 'verified' && next.manifest.reviewStatus !== 'verified') {
            throw new ApiError(409, 'REVIEW_DOWNGRADE', '已审核题包不能被未审核内容覆盖。');
          }
        }
        this.auth.db.prepare('UPDATE content_versions SET published=0 WHERE id=?').run(preview.id);
        if (old) this.auth.db.prepare('UPDATE content_versions SET published=1 WHERE id=? AND version=?').run(preview.id, preview.version);
        else this.auth.db.prepare('INSERT INTO content_versions(id,version,kind,digest,title,payload,created_by,created_at,published) VALUES (?,?,?,?,?,?,?,?,1)')
          .run(preview.id, preview.version, kind, preview.digest, preview.title, JSON.stringify(preview.content), account.id, new Date(this.auth.now()).toISOString());
        return { id: preview.id, version: preview.version, digest: preview.digest };
      })();
    });
  }
}
