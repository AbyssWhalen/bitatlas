import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApiError } from './errors';

export const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const credentials = z.object({
  username: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$/),
  password: z.string().min(12).max(128),
}).strict();
export interface Account { id: string; username: string; role: 'admin' | 'member'; active: number }
interface StoredAccount extends Account { password_hash: string }
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');

export class AuthService {
  private passwordJobs = 0;
  readonly cookieName: string;
  constructor(readonly db: Database.Database, readonly origin: string, readonly secure: boolean, readonly now = Date.now) {
    this.cookieName = secure ? '__Host-bitatlas-session' : 'bitatlas-dev-session';
    if (!secure && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) throw new Error('非本机服务必须启用 HTTPS 会话 Cookie。');
  }
  private async derive(password: string, salt: string): Promise<Buffer> {
    if (this.passwordJobs >= 2) throw new ApiError(429, 'AUTH_BUSY', '登录处理繁忙，请稍后重试。');
    this.passwordJobs++;
    try {
      return await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 40 * 1024 * 1024 },
        (error, key) => error ? reject(error) : resolve(key)));
    } finally { this.passwordJobs--; }
  }
  async hashPassword(password: string) {
    credentials.shape.password.parse(password);
    const salt = token();
    return `scrypt-v1:${salt}:${(await this.derive(password, salt)).toString('hex')}`;
  }
  private async verifyPassword(password: string, encoded: string) {
    const [algorithm, salt, expected] = encoded.split(':');
    if (algorithm !== 'scrypt-v1' || !salt || !expected || !/^[a-f0-9]{64}$/.test(expected)) return false;
    return timingSafeEqual(await this.derive(password, salt), Buffer.from(expected, 'hex'));
  }
  async bootstrap(username: string, password: string): Promise<Account> {
    const input = credentials.parse({ username, password });
    const hash = await this.hashPassword(input.password);
    return this.db.transaction(() => {
      if (this.db.prepare('SELECT 1 FROM accounts LIMIT 1').get()) throw new ApiError(409, 'INITIALIZED', '管理员已经初始化。');
      const account = { id: randomUUID(), username: input.username, role: 'admin' as const, active: 1 };
      this.db.prepare('INSERT INTO accounts(id,username,password_hash,role,created_at) VALUES (?,?,?,?,?)')
        .run(account.id, account.username, hash, account.role, new Date(this.now()).toISOString());
      return account;
    })();
  }
  private session(account: Account) {
    const value = token();
    const now = this.now();
    this.db.prepare('INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) VALUES (?,?,?,?)')
      .run(digest(value), account.id, now, now + AUTH_TTL_MS);
    return { cookie: `${this.cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${AUTH_TTL_MS / 1000}${this.secure ? '; Secure' : ''}`,
      result: { account: { id: account.id, username: account.username, role: account.role }, authenticatedAt: now, offlineUntil: now + AUTH_TTL_MS } };
  }
  private rateLimit(key: string) {
    const now = this.now();
    this.db.prepare('DELETE FROM login_limits WHERE resets_at <= ?').run(now);
    const existing = this.db.prepare('SELECT failures FROM login_limits WHERE key=?').get(key) as { failures: number } | undefined;
    if ((existing?.failures ?? 0) >= 8) throw new ApiError(429, 'LOGIN_LIMIT', '尝试次数过多，请 15 分钟后再试。');
    this.db.prepare('INSERT INTO login_limits(key,failures,resets_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET failures=failures+1')
      .run(key, now + 15 * 60 * 1000);
  }
  async login(input: unknown, address: string) {
    const value = credentials.parse(input);
    const key = digest(`${address}\0${value.username.toLowerCase()}`);
    this.rateLimit(digest(address));
    this.rateLimit(key);
    const account = this.db.prepare('SELECT * FROM accounts WHERE username=? COLLATE NOCASE').get(value.username) as StoredAccount | undefined;
    // Unknown accounts incur the same KDF cost.
    const valid = await this.verifyPassword(value.password, account?.password_hash ?? `scrypt-v1:${'0'.repeat(43)}:${'0'.repeat(64)}`);
    if (!valid || !account?.active) throw new ApiError(401, 'INVALID_LOGIN', '用户名或密码不正确，或账号已停用。');
    this.db.prepare('DELETE FROM login_limits WHERE key IN (?,?)').run(key, digest(address));
    return this.session(account);
  }
  invite(account: Account, input: unknown) {
    const { role, days } = z.object({ role: z.enum(['admin', 'member']).default('member'), days: z.int().min(1).max(30).default(7) }).strict().parse(input);
    const value = token();
    const expiresAt = this.now() + days * 86400000;
    this.db.prepare('INSERT INTO invitations(token_hash,created_by,role,expires_at) VALUES (?,?,?,?)').run(digest(value), account.id, role, expiresAt);
    return { invite: value, expiresAt };
  }
  async register(input: unknown, address: string) {
    const value = credentials.extend({ invite: z.string().min(32).max(128) }).parse(input);
    this.rateLimit(digest(`register:${address}`));
    const invitationHash = digest(value.invite);
    const lookup = () => this.db.prepare('SELECT role FROM invitations WHERE token_hash=? AND consumed_by IS NULL AND revoked=0 AND expires_at>?')
      .get(invitationHash, this.now()) as { role: Account['role'] } | undefined;
    if (!lookup()) throw new ApiError(400, 'INVALID_INVITE', '邀请码无效、已使用或已过期。');
    const hash = await this.hashPassword(value.password);
    const account = this.db.transaction(() => {
      const invitation = lookup();
      if (!invitation) throw new ApiError(400, 'INVALID_INVITE', '邀请码无效、已使用或已过期。');
      if (this.db.prepare('SELECT 1 FROM accounts WHERE username=? COLLATE NOCASE').get(value.username)) throw new ApiError(409, 'USERNAME_TAKEN', '用户名已被使用。');
      const result = { id: randomUUID(), username: value.username, role: invitation.role, active: 1 };
      this.db.prepare('INSERT INTO accounts(id,username,password_hash,role,created_at) VALUES (?,?,?,?,?)')
        .run(result.id, result.username, hash, result.role, new Date(this.now()).toISOString());
      this.db.prepare('UPDATE invitations SET consumed_by=? WHERE token_hash=?').run(result.id, invitationHash);
      return result;
    })();
    return this.session(account);
  }
  private requestToken(request: FastifyRequest) {
    const matches = (request.headers.cookie ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${this.cookieName}=`));
    if (matches.length !== 1) return null;
    const value = matches[0]!.slice(this.cookieName.length + 1);
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? digest(value) : null;
  }
  require(request: FastifyRequest, admin = false): Account {
    const hash = this.requestToken(request);
    const account = hash ? this.db.prepare(`SELECT a.id,a.username,a.role,a.active FROM auth_sessions s
      JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.active=1`).get(hash, this.now()) as Account | undefined : undefined;
    if (!account) throw new ApiError(401, 'AUTH_REQUIRED', '请联网登录后继续。');
    if (request.headers['x-bitatlas-account'] && request.headers['x-bitatlas-account'] !== account.id) {
      throw new ApiError(401, 'ACCOUNT_CHANGED', '账号已在另一页面切换，请重新登录。');
    }
    if (admin && account.role !== 'admin') throw new ApiError(403, 'ADMIN_REQUIRED', '此操作仅限管理员。');
    return account;
  }
  logout(request: FastifyRequest) {
    const hash = this.requestToken(request);
    if (hash) this.db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(hash);
    return `${this.cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${this.secure ? '; Secure' : ''}`;
  }
  routes(app: FastifyInstance) {
    app.post('/api/v1/auth/login', async (request, reply) => {
      const result = await this.login(request.body, request.ip);
      return reply.header('Set-Cookie', result.cookie).send(result.result);
    });
    app.post('/api/v1/auth/register', async (request, reply) => {
      const result = await this.register(request.body, request.ip);
      return reply.header('Set-Cookie', result.cookie).send(result.result);
    });
    app.get('/api/v1/auth/me', async (request) => {
      const account = this.require(request);
      return { account: { id: account.id, username: account.username, role: account.role }, authenticatedAt: this.now(), offlineUntil: this.now() + AUTH_TTL_MS };
    });
    app.post('/api/v1/auth/logout', async (request, reply) => reply.header('Set-Cookie', this.logout(request)).send({ ok: true }));
    app.post('/api/v1/admin/invitations', async (request) => this.invite(this.require(request, true), request.body));
    app.post('/api/v1/admin/invitations/revoke', async (request) => {
      this.require(request, true);
      const { invite } = z.object({ invite: z.string().min(32).max(128) }).strict().parse(request.body);
      this.db.prepare('UPDATE invitations SET revoked=1 WHERE token_hash=?').run(digest(invite));
      return { ok: true };
    });
    app.get('/api/v1/admin/accounts', async (request) => {
      this.require(request, true);
      return this.db.prepare('SELECT id,username,role,active,created_at FROM accounts ORDER BY created_at').all();
    });
    app.post('/api/v1/admin/accounts/:id/revoke', async (request) => {
      const actor = this.require(request, true);
      const { id } = z.object({ id: z.uuid() }).parse(request.params);
      if (id === actor.id) throw new ApiError(400, 'SELF_REVOKE', '不能在此处停用当前管理员。');
      this.db.transaction(() => {
        this.db.prepare('UPDATE accounts SET active=0 WHERE id=?').run(id);
        this.db.prepare('DELETE FROM auth_sessions WHERE account_id=?').run(id);
      })();
      return { ok: true };
    });
  }
}
