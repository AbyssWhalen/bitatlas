import { legacyLearningPack, parseContentPack, parseLearningPack, supplementBlockers, validateContentPack } from '@408os/content-schema';
import { questionAvailability, type ContentPack, type LearningPack } from '@408os/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth';
import { ApiError } from './errors';

interface ContentRow { id: string; version: string; kind: string; digest: string; payload: string; published: number }
export class ContentService {
  constructor(readonly auth: AuthService) {}
  private compatibility?: { digest: string; pack: LearningPack };
  private legacy(digest: string, payload?: string) {
    if (this.compatibility?.digest !== digest) {
      const full = payload ? JSON.parse(payload) as LearningPack : this.learning()!;
      this.compatibility = { digest, pack: legacyLearningPack(full) };
    }
    return this.compatibility.pack;
  }
  catalog(full = false) {
    const rows = this.auth.db.prepare('SELECT id,version,kind,digest,title FROM content_versions WHERE published=1 ORDER BY id').all() as Array<Omit<ContentRow, 'payload' | 'published'> & { title: string }>;
    return rows.map((row) => row.kind === 'learning' && !full ? { ...row, digest: this.legacy(row.digest).sha256 } : row);
  }
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
      const prior = this.learning();
      const entries = pack.schemaVersion === 2 ? pack.questionSupplements : [];
      return { id: pack.id, version: pack.version, kind, digest: pack.sha256, title: '跨年知识与复习', content: pack,
        currentDigest: prior?.sha256 ?? null,
        summary: { cards: pack.cards.length, articles: pack.articles?.length ?? 0, mappings: pack.mappings.length, unavailableMappings: unavailable.map((entry) => entry.questionId),
          supplements: entries.filter((s) => s.kind === 'supplement').length, errata: entries.filter((s) => s.kind === 'erratum').length },
        blockers: [...(unavailable.length ? ['关联题包未发布或版本不匹配'] : []), ...supplementBlockers(pack, questions, prior)] };
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
    const fullFormat = (query: unknown) => z.object({ learningFormat: z.enum(['1', '2']).optional() }).parse(query).learningFormat === '2';
    app.get('/api/v1/content', async (request) => { this.auth.require(request); return this.catalog(fullFormat(request.query)); });
    app.get('/api/v1/content/:id', async (request) => {
      this.auth.require(request);
      const { id } = z.object({ id: z.string().min(1).max(200) }).parse(request.params);
      const row = this.auth.db.prepare('SELECT * FROM content_versions WHERE id=? AND published=1').get(id) as ContentRow | undefined;
      if (!row) throw new ApiError(404, 'PACK_NOT_FOUND', '题包尚未发布。');
      if (row.kind === 'learning' && !fullFormat(request.query)) return this.legacy(row.digest, row.payload);
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
      const { kind, content, expectedDigest, expectedCurrentDigest } = z.object({ kind: z.enum(['questions', 'learning']), content: z.unknown(), expectedDigest: z.string().length(64), expectedCurrentDigest: z.string().length(64).nullable().optional() }).strict().parse(request.body);
      return this.auth.db.transaction(() => {
        const preview = this.preview({ kind, content });
        if (preview.digest !== expectedDigest || preview.blockers.length) throw new ApiError(409, 'PREVIEW_CHANGED', '内容与预检不一致，或仍有未满足的发布条件。');
        if (kind === 'learning' && (expectedCurrentDigest !== undefined || (preview.content as LearningPack).schemaVersion === 2)
          && preview.currentDigest !== expectedCurrentDigest) throw new ApiError(409, 'BASE_CHANGED', '当前学习包已变化，请重新制作候选并预检。');
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
