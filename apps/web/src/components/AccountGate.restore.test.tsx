import 'fake-indexeddb/auto';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { accountRegistry, activeAccount, lockAccount, type AccountSession } from '../app/account';
import { AccountGate } from './AccountGate';

vi.mock('../app/server-mode', () => ({ SERVER_MODE: true }));
vi.mock('./StorageUpgradeGate', () => ({
  StorageUpgradeGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const warning = '账号状态已改变，请联网登录。未同步记录仍保存在原账号中。';
const session = (): AccountSession => ({
  account: { id: '5bc20cd6-64d1-4418-9d78-19ad504a4cd6', username: 'reader', role: 'member' },
  authenticatedAt: Date.now() - 60000, offlineUntil: Date.now() + 60000,
});
const open = () => render(<AccountGate><p>已打开学习空间</p></AccountGate>);
const unauthorized = () => Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });

beforeEach(async () => {
  lockAccount();
  localStorage.clear();
  await accountRegistry.state.clear();
});
afterEach(() => { cleanup(); lockAccount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('shows a clean login form when the real session probe returns 401 on a first visit', async () => {
  const fetcher = vi.fn(async () => unauthorized());
  vi.stubGlobal('fetch', fetcher);
  open();
  expect(await screen.findByRole('button', { name: '登录' })).toBeEnabled();
  expect(fetcher).toHaveBeenCalledWith('/api/v1/auth/me', expect.anything());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('warns and stays locked when a saved account is refused even with offline time remaining', async () => {
  await accountRegistry.state.put({ key: 'last-session', value: session() });
  vi.stubGlobal('fetch', vi.fn(async () => unauthorized()));
  open();
  expect(await screen.findByRole('alert')).toHaveTextContent(warning);
  expect(activeAccount).toBeNull();
  expect(await accountRegistry.state.get('last-session')).toBeUndefined();
});

it('keeps expired offline access locked and explains why the returning user must log in', async () => {
  await accountRegistry.state.put({ key: 'last-session', value: { ...session(), offlineUntil: Date.now() - 1 } });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  open();
  expect(await screen.findByRole('button', { name: '登录' })).toBeVisible();
  expect(screen.queryByRole('alert')).toHaveTextContent(warning);
  expect(activeAccount).toBeNull();
});

it('warns an open account when another tab broadcasts an account change', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(session())));
  open();
  expect(await screen.findByText('已打开学习空间')).toBeVisible();
  const otherTab = new BroadcastChannel('bitatlas-accounts');
  try {
    await act(async () => {
      const locked = new Promise<void>((resolve) => window.addEventListener('bitatlas-account-changed', () => resolve(), { once: true }));
      otherTab.postMessage({ type: 'account-changed' });
      await locked;
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(warning);
    expect(activeAccount).toBeNull();
  } finally { otherTab.close(); }
});
