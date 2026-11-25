import Fastify from 'fastify';
import { ZodError } from 'zod';
import { AuthService } from './auth';
import { openDatabase } from './database';
import { ApiError } from './errors';
import { FileService } from './files';
import { ContentService } from './content';
import { SyncService } from './sync';
import fastifyStatic from '@fastify/static';

export interface ServerOptions { database: string; files: string; origin: string; webRoot?: string; secureCookies?: boolean; now?: () => number }
export function createApp(options: ServerOptions) {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024, requestTimeout: 60_000, trustProxy: false, exposeHeadRoutes: false });
  const db = openDatabase(options.database);
  const auth = new AuthService(db, options.origin, options.secureCookies ?? new URL(options.origin).protocol === 'https:', options.now);
  const content = new ContentService(auth);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff').header('Referrer-Policy', 'same-origin').header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== options.origin) {
      throw new ApiError(403, 'ORIGIN_MISMATCH', '请求来源与本站不一致。');
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ code: 'INVALID_INPUT', message: '输入格式不符合要求。', issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })) });
    if (error instanceof ApiError) return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    const status = typeof error === 'object' && error && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    return reply.code(status).send({ code: status === 413 ? 'BODY_TOO_LARGE' : 'REQUEST_FAILED', message: status >= 500 ? '服务器处理失败，原数据仍保留，请稍后重试。' : '请求无法处理。' });
  });
  app.get('/api/v1/health', async () => ({ status: 'ok', version: 1 }));
  auth.routes(app);
  content.routes(app);
  new FileService(auth, options.files).routes(app);
  new SyncService(auth, content).routes(app);
  if (options.webRoot) {
    app.register(fastifyStatic, { root: options.webRoot, wildcard: false, dotfiles: 'deny',
      allowedPath: (pathname) => !pathname.replaceAll('\\', '/').split('/').some((part) => part === 'content' || part.startsWith('.')) });
    app.setNotFoundHandler((request, reply) => {
      const pathname = new URL(request.url, options.origin).pathname;
      if (!['GET', 'HEAD'].includes(request.method) || /^\/(?:api|content)(?:\/|$)/.test(pathname)
        || /\.[a-z0-9]+$/i.test(pathname)) return reply.code(404).send({ message: '资源不存在。' });
      return reply.sendFile('index.html');
    });
  }
  app.addHook('onClose', async () => { db.close(); });
  return { app, auth, db, content };
}
