import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth';
import { ApiError } from './errors';

export const CHUNK_BYTES = 4 * 1024 * 1024;
export const MAX_FILE_BYTES = 128 * 1024 * 1024;
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const uploadSchema = z.object({
  title: z.string().trim().min(1).max(200), bytes: z.int().min(1).max(MAX_FILE_BYTES),
  sha256: hashSchema, mime: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
}).strict();
interface Upload extends z.infer<typeof uploadSchema> { id: string; account_id: string; state: string; file_id: string | null }
interface FileRow extends z.infer<typeof uploadSchema> { id: string; relative_path: string; published: number }

export function parseByteRange(header: string | undefined, bytes: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) throw new ApiError(416, 'INVALID_RANGE', '不支持此文件范围。');
  const start = match[1] ? Number(match[1]) : Math.max(0, bytes - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(bytes - 1, Number(match[2])) : bytes - 1) : bytes - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= bytes) {
    throw new ApiError(416, 'INVALID_RANGE', '文件范围超出长度。');
  }
  return { start, end };
}
export function privatePath(root: string, relative: string): string {
  const base = path.resolve(root);
  const target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep)) throw new ApiError(400, 'INVALID_PATH', '文件路径无效。');
  return target;
}
async function fileHash(filename: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}
export class FileService {
  private locks = new Set<string>();
  constructor(readonly auth: AuthService, readonly root: string) {}
  private async locked<T>(id: string, job: () => Promise<T>): Promise<T> {
    if (this.locks.has(id)) throw new ApiError(409, 'UPLOAD_BUSY', '该上传正在处理，请稍后重试。');
    this.locks.add(id);
    try { return await job(); } finally { this.locks.delete(id); }
  }
  private getUpload(id: string, accountId: string) {
    z.uuid().parse(id);
    const row = this.auth.db.prepare('SELECT * FROM uploads WHERE id=? AND account_id=?').get(id, accountId) as Upload | undefined;
    if (!row) throw new ApiError(404, 'UPLOAD_NOT_FOUND', '上传不存在。');
    return row;
  }
  routes(app: FastifyInstance) {
    app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: CHUNK_BYTES }, (_request, payload, done) => done(null, payload));
    app.get('/api/v1/files', async (request) => {
      this.auth.require(request);
      return this.auth.db.prepare('SELECT id,title,bytes,sha256,mime,created_at FROM files WHERE published=1 AND mime=? ORDER BY created_at DESC').all('application/pdf');
    });
    app.post('/api/v1/admin/uploads', async (request) => {
      const account = this.auth.require(request, true);
      const input = uploadSchema.parse(request.body);
      return this.auth.db.transaction(() => {
        const pending = this.auth.db.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(bytes),0) AS bytes FROM uploads WHERE account_id=? AND state='open'").get(account.id) as { count: number; bytes: number };
        if (pending.count >= 32 || pending.bytes + input.bytes > 512 * 1024 * 1024) throw new ApiError(409, 'UPLOAD_QUOTA', '未完成上传过多，请先完成已有上传。');
        const id = randomUUID();
        this.auth.db.prepare("INSERT INTO uploads(id,title,sha256,bytes,mime,account_id,created_at,state) VALUES (?,?,?,?,?,?,?,'open')")
          .run(id, input.title, input.sha256, input.bytes, input.mime, account.id, new Date(this.auth.now()).toISOString());
        return { id, chunkBytes: CHUNK_BYTES, chunks: Math.ceil(input.bytes / CHUNK_BYTES) };
      })();
    });
    app.get('/api/v1/admin/uploads/:id', async (request) => {
      const account = this.auth.require(request, true);
      const { id } = z.object({ id: z.uuid() }).parse(request.params);
      const upload = this.getUpload(id, account.id);
      return { ...upload, chunks: this.auth.db.prepare('SELECT ordinal,sha256,bytes FROM upload_chunks WHERE upload_id=? ORDER BY ordinal').all(id) };
    });
    app.put('/api/v1/admin/uploads/:id/chunks/:ordinal', { bodyLimit: CHUNK_BYTES }, async (request) => {
      const account = this.auth.require(request, true);
      const { id, ordinal } = z.object({ id: z.uuid(), ordinal: z.coerce.number().int().nonnegative() }).parse(request.params);
      const expectedHash = hashSchema.parse(request.headers['x-chunk-sha256']);
      if (!Buffer.isBuffer(request.body)) throw new ApiError(400, 'BINARY_REQUIRED', '分块必须使用二进制内容。');
      const data = request.body;
      return this.locked(id, async () => {
        const upload = this.getUpload(id, account.id);
        if (upload.state !== 'open') throw new ApiError(409, 'UPLOAD_COMPLETE', '上传已经完成。');
        const expectedBytes = Math.min(CHUNK_BYTES, upload.bytes - ordinal * CHUNK_BYTES);
        if (expectedBytes <= 0 || data.length !== expectedBytes || createHash('sha256').update(data).digest('hex') !== expectedHash) {
          throw new ApiError(400, 'CHUNK_MISMATCH', '分块长度或摘要不匹配。');
        }
        const previous = this.auth.db.prepare('SELECT sha256 FROM upload_chunks WHERE upload_id=? AND ordinal=?').get(id, ordinal) as { sha256: string } | undefined;
        if (previous && previous.sha256 !== expectedHash) throw new ApiError(409, 'CHUNK_CONFLICT', '此分块已经存在不同内容。');
        const folder = privatePath(this.root, path.join('uploads', id));
        await mkdir(folder, { recursive: true });
        const destination = path.join(folder, `${ordinal}.chunk`);
        const temporary = path.join(folder, `${ordinal}.pending`);
        const handle = await open(temporary, 'w', 0o600);
        try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
        await rename(temporary, destination);
        this.auth.db.prepare('INSERT INTO upload_chunks(upload_id,ordinal,sha256,bytes) VALUES (?,?,?,?) ON CONFLICT(upload_id,ordinal) DO UPDATE SET sha256=excluded.sha256,bytes=excluded.bytes')
          .run(id, ordinal, expectedHash, data.length);
        return { ordinal, sha256: expectedHash };
      });
    });
    app.post('/api/v1/admin/uploads/:id/complete', async (request) => {
      const account = this.auth.require(request, true);
      const { id } = z.object({ id: z.uuid() }).parse(request.params);
      return this.locked(id, async () => {
        const upload = this.getUpload(id, account.id);
        if (upload.state === 'complete') return { fileId: upload.file_id };
        const chunks = this.auth.db.prepare('SELECT ordinal,sha256,bytes FROM upload_chunks WHERE upload_id=? ORDER BY ordinal').all(id) as Array<{ ordinal: number; sha256: string; bytes: number }>;
        if (chunks.length !== Math.ceil(upload.bytes / CHUNK_BYTES) || chunks.some((chunk, index) => chunk.ordinal !== index)) throw new ApiError(409, 'CHUNKS_MISSING', '仍有分块未上传。');
        const relative = path.join('objects', upload.sha256);
        const destination = privatePath(this.root, relative);
        await mkdir(path.dirname(destination), { recursive: true });
        const temporary = privatePath(this.root, path.join('uploads', id, 'assembled.pending'));
        const output = await open(temporary, 'w', 0o600);
        const hash = createHash('sha256');
        let total = 0;
        let prefix = Buffer.alloc(0);
        try {
          for (const chunk of chunks) {
            const chunkHash = createHash('sha256');
            let chunkBytes = 0;
            for await (const data of createReadStream(privatePath(this.root, path.join('uploads', id, `${chunk.ordinal}.chunk`)))) {
              const bytes = Buffer.from(data);
              chunkHash.update(bytes); hash.update(bytes); total += bytes.length; chunkBytes += bytes.length;
              if (prefix.length < 8) prefix = Buffer.concat([prefix, bytes.subarray(0, 8 - prefix.length)]);
              await output.writeFile(bytes);
            }
            if (chunkHash.digest('hex') !== chunk.sha256 || chunkBytes !== chunk.bytes) throw new ApiError(409, 'STORED_CHUNK_CORRUPT', '已存分块损坏，请重新上传该分块。');
          }
          await output.sync();
        } finally { await output.close(); }
        if (total !== upload.bytes || hash.digest('hex') !== upload.sha256) throw new ApiError(400, 'FILE_MISMATCH', '完整文件摘要不匹配。');
        const signatureOK = upload.mime === 'application/pdf' ? prefix.subarray(0, 5).toString() === '%PDF-'
          : upload.mime === 'image/png' ? prefix.equals(Buffer.from('89504e470d0a1a0a', 'hex')) : prefix.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
        if (!signatureOK) throw new ApiError(400, 'FILE_TYPE', '文件头与声明类型不符。');
        try {
          await stat(destination);
          if (await fileHash(destination) !== upload.sha256) throw new ApiError(409, 'OBJECT_CORRUPT', '已有文件摘要异常，停止发布。');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          await rename(temporary, destination);
        }
        const fileId = randomUUID();
        this.auth.db.transaction(() => {
          this.auth.db.prepare('INSERT INTO files(id,title,sha256,bytes,mime,created_by,created_at,relative_path) VALUES (?,?,?,?,?,?,?,?)')
            .run(fileId, upload.title, upload.sha256, upload.bytes, upload.mime, account.id, new Date(this.auth.now()).toISOString(), relative);
          this.auth.db.prepare("UPDATE uploads SET state='complete',file_id=? WHERE id=?").run(fileId, id);
        })();
        return { fileId };
      });
    });
    app.post('/api/v1/admin/files/:id/publish', async (request) => {
      this.auth.require(request, true);
      const { id } = z.object({ id: z.uuid() }).parse(request.params);
      const file = this.auth.db.prepare('SELECT * FROM files WHERE id=?').get(id) as FileRow | undefined;
      if (!file) throw new ApiError(404, 'FILE_NOT_FOUND', '文件不存在。');
      if (await fileHash(privatePath(this.root, file.relative_path)) !== file.sha256) throw new ApiError(409, 'OBJECT_CORRUPT', '文件摘要异常，停止发布。');
      this.auth.db.prepare('UPDATE files SET published=1 WHERE id=?').run(id);
      return { ok: true };
    });
    const serve = async (request: Parameters<AuthService['require']>[0], reply: import('fastify').FastifyReply, byHash: boolean) => {
      const account = this.auth.require(request);
      const params = z.object(byHash ? { id: hashSchema } : { id: z.uuid() }).parse(request.params);
      const file = this.auth.db.prepare(`SELECT * FROM files WHERE ${byHash ? 'sha256' : 'id'}=? AND (published=1 OR ?='admin') ORDER BY published DESC LIMIT 1`)
        .get(params.id, account.role) as FileRow | undefined;
      if (!file) throw new ApiError(404, 'FILE_NOT_FOUND', '资料不存在或尚未发布。');
      const filename = privatePath(this.root, file.relative_path);
      const info = await stat(filename);
      if (info.size !== file.bytes) throw new ApiError(409, 'FILE_DAMAGED', '资料文件长度异常。');
      reply.header('Content-Type', file.mime).header('Accept-Ranges', 'bytes')
        .header('ETag', `"${file.sha256}"`).header('Cache-Control', 'private, no-store')
        .header('Content-Disposition', `inline; filename="document"; filename*=UTF-8''${encodeURIComponent(file.title).replace(/'/g, '%27')}`);
      let range;
      try { range = parseByteRange(request.headers['if-range'] && request.headers['if-range'] !== `"${file.sha256}"` ? undefined : request.headers.range, file.bytes); }
      catch (error) { reply.header('Content-Range', `bytes */${file.bytes}`); throw error; }
      if (range) reply.code(206).header('Content-Range', `bytes ${range.start}-${range.end}/${file.bytes}`).header('Content-Length', range.end - range.start + 1);
      else reply.header('Content-Length', file.bytes);
      if (request.method === 'HEAD') return reply.send();
      return reply.send(createReadStream(filename, range ?? {}));
    };
    app.route({ method: ['GET', 'HEAD'], url: '/api/v1/files/:id', handler: (request, reply) => serve(request, reply, false) });
    app.route({ method: ['GET', 'HEAD'], url: '/api/v1/assets/:id', handler: (request, reply) => serve(request, reply, true) });
  }
}
