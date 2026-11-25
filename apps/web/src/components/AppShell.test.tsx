import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudy } from '../app/StudyContext';
import { AppShell } from './AppShell';
import { THEME_STORAGE_KEY } from './theme';

vi.mock('../app/StudyContext', () => ({ useStudy: vi.fn() }));
const sync = vi.hoisted(() => ({ value: { mode: 'local', loggedIn: null, pendingCount: null, offlineUntil: null, lastSuccessfulSyncAt: null } as { mode: 'local' | 'server'; loggedIn: boolean | null; pendingCount: number | null; offlineUntil: string | null; lastSuccessfulSyncAt: string | null } }));
vi.mock('../app/useSessionSyncStatus', () => ({ useSessionSyncStatus: () => sync.value }));
vi.mock('./ReadingPreferences', () => ({ ReadingPreferences: () => <select aria-label="正文字号" /> }));

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}<input aria-label="笔记" /></p>;
}

function renderShell(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/" element={<AppShell />}><Route path="*" element={<Where />} /><Route index element={<Where />} /></Route></Routes></MemoryRouter>);
}

const where = () => screen.getByTestId('where').textContent;
const press = (key: string, init: KeyboardEventInit = {}, target: Element | Window | Document = window) => fireEvent.keyDown(target, { key, ...init });

beforeEach(() => {
  vi.mocked(useStudy).mockReturnValue({ loading: false, contentReady: true, error: '', packs: [{ year: 2009 }] } as unknown as ReturnType<typeof useStudy>);
  sync.value = { mode: 'local', loggedIn: null, pendingCount: null, offlineUntil: null, lastSuccessfulSyncAt: null };
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  delete document.documentElement.dataset.theme;
});

afterEach(() => cleanup());

describe('shell navigation', () => {
  it('keeps five mobile links and exposes the desktop destinations', () => {
    renderShell();
    expect(within(screen.getByRole('navigation', { name: '移动端导航' })).getAllByRole('link').map((link) => link.textContent)).toEqual(['今日', '题库', '复习', '知识', '更多']);
    const desktop = within(screen.getByRole('navigation', { name: '主导航' }));
    expect(desktop.getAllByRole('link', { hidden: true }).map((link) => link.getAttribute('href'))).toEqual(['/', '/questions', '/review', '/knowledge', '/lab', '/wrong', '/stats', '/documents', '/mock', '/settings']);
    expect(screen.getByText('题包 1 套')).toBeInTheDocument();
  });

  it('opens the more menu from its button and closes it with Escape', () => {
    renderShell();
    const more = screen.getByRole('button', { name: '更多' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '统计' })).toBeVisible();
    press('Escape', {}, document);
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveFocus();
  });

  it('navigates with single keys only when nothing is being typed', () => {
    renderShell();
    press('q');
    expect(where()).toBe('/questions');
    press('k', { ctrlKey: true });
    press('k', { isComposing: true });
    press('k', {}, screen.getByRole('textbox', { name: '笔记' }));
    expect(where()).toBe('/questions');
    press('K');
    expect(where()).toBe('/knowledge');
    press('m');
    expect(screen.getByRole('button', { name: '更多' })).toHaveAttribute('aria-expanded', 'true');
  });

  it.each(['/practice/session-1', '/review/cards/round-1', '/mock/exam-1'])('never leaves an answering page on a stray key: %s', (path) => {
    renderShell(path);
    for (const key of ['t', 'q', 'r', 'k', 'l', 'm']) press(key);
    expect(where()).toBe(path);
    expect(screen.getByRole('button', { name: '更多' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '更多' })).not.toHaveAttribute('aria-keyshortcuts');
  });

  it('keeps shortcuts on pages that only share a prefix with answering pages', () => {
    renderShell('/practice/session-1/summary');
    press('t');
    expect(where()).toBe('/');
  });
});

describe('sync status', () => {
  const server = { mode: 'server' as const, loggedIn: true, offlineUntil: null };

  it('stays silent in local mode and before the pending count is known', () => {
    renderShell();
    expect(screen.queryByText(/同步/u)).not.toBeInTheDocument();
    cleanup();
    sync.value = { ...server, pendingCount: null, lastSuccessfulSyncAt: null };
    renderShell();
    expect(screen.queryByText(/同步/u)).not.toBeInTheDocument();
  });

  it('reports pending operations ahead of any earlier success', () => {
    sync.value = { ...server, pendingCount: 3, lastSuccessfulSyncAt: '2026-11-24T02:05:00.000Z' };
    renderShell();
    expect(screen.getByText('待同步 3 条')).toBeInTheDocument();
    expect(screen.queryByText(/已同步/u)).not.toBeInTheDocument();
  });

  it('does not present an empty queue as a completed sync', () => {
    sync.value = { ...server, pendingCount: 0, lastSuccessfulSyncAt: null };
    renderShell();
    expect(screen.getByText('无待同步记录')).toBeInTheDocument();
    expect(screen.queryByText(/已同步/u)).not.toBeInTheDocument();
  });

  it('shows the last observed success in Beijing time', () => {
    sync.value = { ...server, pendingCount: 0, lastSuccessfulSyncAt: '2026-11-24T02:05:00.000Z' };
    renderShell();
    expect(screen.getByText('已同步 10:05')).toBeInTheDocument();
  });
});

describe('theme toggle', () => {
  it('stores an explicit choice and follows changes made outside React', async () => {
    document.documentElement.dataset.theme = 'day';
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: '切换到夜班主题' }));
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    expect(await screen.findByRole('button', { name: '切换到白昼主题' })).toBeVisible();

    document.documentElement.dataset.theme = 'day';
    await waitFor(() => expect(screen.getByRole('button', { name: '切换到夜班主题' })).toBeVisible());
  });

  it('applies a stored choice when the page has no pre-paint script', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night');
    renderShell();
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(screen.getByRole('button', { name: '切换到白昼主题' })).toBeVisible();
  });
});
