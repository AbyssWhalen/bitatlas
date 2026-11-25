import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export function openDatabase(filename: string): Database.Database {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  db.pragma('busy_timeout = 5000');
  const version = db.pragma('user_version', { simple: true }) as number;
  if (version > 1) { db.close(); throw new Error('数据库版本高于当前服务端，请使用匹配版本。'); }
  if (version < 1) db.transaction(() => {
    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','member')),
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE auth_sessions (
        token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
        created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX auth_sessions_account ON auth_sessions(account_id);
      CREATE TABLE invitations (
        token_hash TEXT PRIMARY KEY, created_by TEXT NOT NULL REFERENCES accounts(id),
        role TEXT NOT NULL CHECK(role IN ('admin','member')), expires_at INTEGER NOT NULL,
        consumed_by TEXT REFERENCES accounts(id), revoked INTEGER NOT NULL DEFAULT 0
      ) STRICT;
      CREATE TABLE login_limits (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, resets_at INTEGER NOT NULL) STRICT;
      CREATE TABLE content_versions (
        id TEXT NOT NULL, version TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('questions','learning')),
        digest TEXT NOT NULL, title TEXT NOT NULL, payload TEXT NOT NULL,
        created_by TEXT NOT NULL REFERENCES accounts(id), created_at TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(id,version)
      ) STRICT;
      CREATE UNIQUE INDEX current_content ON content_versions(id) WHERE published=1;
      CREATE TABLE files (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL,
        mime TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES accounts(id), created_at TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 0, relative_path TEXT NOT NULL
      ) STRICT;
      CREATE INDEX published_files ON files(published,mime);
      CREATE TABLE uploads (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL,
        mime TEXT NOT NULL, account_id TEXT NOT NULL REFERENCES accounts(id), created_at TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('open','complete')), file_id TEXT REFERENCES files(id)
      ) STRICT;
      CREATE TABLE upload_chunks (
        upload_id TEXT NOT NULL REFERENCES uploads(id), ordinal INTEGER NOT NULL,
        sha256 TEXT NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY(upload_id,ordinal)
      ) STRICT;
      CREATE TABLE entities (
        account_id TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL, entity_id TEXT NOT NULL,
        revision INTEGER NOT NULL, payload TEXT, deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
        PRIMARY KEY(account_id,kind,entity_id)
      ) STRICT;
      CREATE TABLE entity_history (
        account_id TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL, entity_id TEXT NOT NULL,
        revision INTEGER NOT NULL, payload TEXT, deleted INTEGER NOT NULL, updated_at TEXT NOT NULL,
        PRIMARY KEY(account_id,kind,entity_id,revision)
      ) STRICT;
      CREATE TABLE operations (
        account_id TEXT NOT NULL REFERENCES accounts(id), operation_id TEXT NOT NULL,
        digest TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(account_id,operation_id)
      ) STRICT;
      CREATE TABLE sync_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT NOT NULL REFERENCES accounts(id),
        kind TEXT NOT NULL, entity_id TEXT NOT NULL, revision INTEGER NOT NULL,
        payload TEXT, deleted INTEGER NOT NULL, operation_id TEXT NOT NULL
      ) STRICT;
      CREATE INDEX sync_account_sequence ON sync_events(account_id,sequence);
      CREATE TABLE conflicts (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL,
        entity_id TEXT NOT NULL, local_payload TEXT, remote_payload TEXT, remote_revision INTEGER NOT NULL,
        created_at TEXT NOT NULL, resolved_at TEXT
      ) STRICT;
      PRAGMA user_version = 1;
    `);
    db.prepare('INSERT INTO meta(key,value) VALUES (?,?)').run('sync_epoch', randomUUID());
  })();
  return db;
}
