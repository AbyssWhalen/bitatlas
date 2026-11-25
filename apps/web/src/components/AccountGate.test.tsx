import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const accountMocks = vi.hoisted(() => ({
  activeAccount: null as { account: { id: string; username: string } } | null,
  restoreAccount: vi.fn(),
  loginAccount: vi.fn(),
  synchronize: vi.fn(),
}));

vi.mock('../app/server-mode', () => ({
  SERVER_MODE: true,
}));

vi.mock('../app/account', () => ({
  get activeAccount() { return accountMocks.activeAccount; },
  restoreAccount: accountMocks.restoreAccount,
  loginAccount: accountMocks.loginAccount,
  synchronize: accountMocks.synchronize,
}));

vi.mock('./StorageUpgradeGate', () => ({
  StorageUpgradeGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AccountGate } from './AccountGate';

describe('AccountGate presentation and login contracts', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    accountMocks.activeAccount = null;
    accountMocks.restoreAccount.mockResolvedValue(null);
    accountMocks.loginAccount.mockResolvedValue({ account: { id: 'acc-1', username: 'alice' }, offlineUntil: Date.now() + 86_400_000 });
  });

  it('preserves exact username, password, invite labels and login/register buttons', async () => {
    const user = userEvent.setup();
    render(<AccountGate><div>应用内容</div></AccountGate>);

    expect(await screen.findByRole('heading', { name: 'BitAtlas' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '登录' })).toBeVisible();
    expect(screen.getByLabelText('用户名')).toBeVisible();
    expect(screen.getByLabelText('密码')).toBeVisible();
    expect(screen.getByRole('button', { name: '登录' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '使用邀请码注册' }));
    expect(screen.getByRole('heading', { name: '使用邀请码加入' })).toBeVisible();
    expect(screen.getByLabelText('邀请码')).toBeVisible();
    expect(screen.getByRole('button', { name: '创建账号' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '已有账号' }));
    await user.type(screen.getByLabelText('用户名'), 'alice');
    await user.type(screen.getByLabelText('密码'), 'secure-password-123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(accountMocks.loginAccount).toHaveBeenCalledWith('alice', 'secure-password-123', undefined));
  });
});
