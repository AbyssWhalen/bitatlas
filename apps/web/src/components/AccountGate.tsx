import { useEffect, useState, type ReactNode } from 'react';
import { activeAccount, loginAccount, restoreAccount, synchronize, type AccountSession } from '../app/account';
import { SERVER_MODE } from '../app/server-mode';
import { StorageUpgradeGate } from './StorageUpgradeGate';

function AccountSyncRunner({ session, onError }: { session: AccountSession; onError: (message: string) => void }) {
  useEffect(() => {
    const sync = () => {
      if (Date.now() >= session.offlineUntil) { window.dispatchEvent(new CustomEvent('bitatlas-auth-required')); return; }
      if (navigator.onLine && document.visibilityState === 'visible') void synchronize().catch((reason) => onError(`同步暂未完成：${String(reason)}`));
    };
    sync();
    const timer = window.setInterval(sync, 30_000);
    window.addEventListener('online', sync); document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync); };
  }, [session, onError]);
  return null;
}

export function AccountGate({ children }: { children: ReactNode }) {
  return SERVER_MODE ? <ServerAccountGate>{children}</ServerAccountGate> : children;
}

function ServerAccountGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void restoreAccount().then((value) => { if (active) setSession(value); })
      .catch((reason) => { if (active) setError(String(reason)); }).finally(() => { if (active) setLoading(false); });
    const lock = () => { setSession(null); setError('账号状态已改变，请联网登录。未同步记录仍保存在原账号中。'); };
    window.addEventListener('bitatlas-account-changed', lock);
    return () => { active = false; window.removeEventListener('bitatlas-account-changed', lock); };
  }, []);

  if (loading) {
    return (
      <main className="page sec-page sec-auth-shell">
        <p className="sec-auth-loading" role="status">正在打开账号…</p>
      </main>
    );
  }

  if (session && activeAccount?.account.id === session.account.id) {
    return (
      <div key={session.account.id}>
        {error && (
          <aside className="account-sync-notice sec-sync-notice" role="status">
            <span>{error}</span>
            <button type="button" className="secondary-command" onClick={() => setError('')}>收起</button>
          </aside>
        )}
        <StorageUpgradeGate account>
          <AccountSyncRunner session={session} onError={setError} />
          {children}
        </StorageUpgradeGate>
      </div>
    );
  }

  return (
    <main className="page account-login sec-page sec-auth-shell">
      <div className="sec-auth-box">
        <header className="sec-auth-brand">
          <div className="sec-auth-mark" aria-hidden="true">
            <img src="/favicon.svg" alt="" />
          </div>
          <div>
            <h1>BitAtlas</h1>
            <p>进入自己的学习空间。</p>
          </div>
        </header>

        <form
          className="study-panel sec-auth-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            void loginAccount(username, password, registering ? invite : undefined)
              .then((value) => { setPassword(''); setInvite(''); setSession(value); })
              .catch((reason) => setError(String(reason)))
              .finally(() => setBusy(false));
          }}
        >
          <h2>{registering ? '使用邀请码加入' : '登录'}</h2>
          <label>
            <span>用户名</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={32} />
          </label>
          <label>
            <span>密码</span>
            <input type="password" autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} />
          </label>
          {registering && (
            <label>
              <span>邀请码</span>
              <input autoComplete="off" value={invite} onChange={(event) => setInvite(event.target.value)} required />
            </label>
          )}
          {error && <p className="sec-inline-alert" role="alert">{error}</p>}
          <div className="command-row sec-auth-actions">
            <button type="submit" className="primary-command" disabled={busy}>
              {busy ? '处理中…' : registering ? '创建账号' : '登录'}
            </button>
            <button type="button" className="secondary-command" onClick={() => setRegistering(!registering)}>
              {registering ? '已有账号' : '使用邀请码注册'}
            </button>
          </div>
        </form>

        <p className="sec-auth-footnote">
          初次登录和切换账号需要联网；已登录账号可离线学习 7 天。退出后，本地记录锁定并保留。
        </p>
      </div>
    </main>
  );
}
