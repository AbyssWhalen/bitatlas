import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FtpControlConnectionLabPage } from './FtpControlConnectionLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q40-session'),
  questions: [{ id: 'cn408-2009-q40', year: 2009, number: 40, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-search">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/network?module=ftp-control&preset=cn408-2009-q40') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/network" element={<><FtpControlConnectionLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q40 单题练习</h1>} />
        <Route path="/knowledge" element={<><h1>Q40 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FtpControlConnectionLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the source-backed TCP control connection on port 21', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'FTP 控制与数据连接实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByRole('combobox', { name: '观察事件' })).toHaveValue('control');
    expect(screen.getByLabelText('当前连接')).toHaveTextContent('TCP/21');
    expect(screen.getByLabelText('题目答案')).toHaveTextContent('A');

    const navigation = within(screen.getByRole('navigation', { name: '计算机网络实验模块' }));
    expect(navigation.getAllByRole('link')).toHaveLength(8);
    expect(navigation.getByRole('link', { name: 'FTP 连接' })).toHaveAttribute('aria-current', 'page');
  });

  it('switches to the data connection and keeps the channel in the URL', () => {
    renderPage('/lab/network?module=ftp-control&channel=data');

    expect(screen.getByRole('combobox', { name: '观察事件' })).toHaveValue('data');
    expect(screen.getByLabelText('当前连接')).toHaveTextContent('TCP/20');
    fireEvent.change(screen.getByRole('combobox', { name: '观察事件' }), { target: { value: 'control' } });
    expect(screen.getByTestId('current-search')).toHaveTextContent('channel=control');
    expect(screen.getByLabelText('当前连接')).toHaveTextContent('TCP/21');
  });

  it('fails closed on an unsupported channel and restores the preset', () => {
    renderPage('/lab/network?module=ftp-control&channel=udp');

    expect(screen.getByRole('alert')).toHaveTextContent('控制或数据');
    expect(screen.queryByLabelText('当前连接')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '恢复 Q40 预设' }));
    expect(screen.getByTestId('current-search')).toHaveTextContent('preset=cn408-2009-q40');
    expect(screen.getByLabelText('当前连接')).toHaveTextContent('TCP/21');
  });

  it('opens the Q40 practice and knowledge deep links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q40' }));
    expect(await screen.findByRole('heading', { name: 'Q40 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q40'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q40 知识节点' })).toBeVisible();
    expect(screen.getByTestId('current-search')).toHaveTextContent('subject=computer-networks');
    expect(screen.getByTestId('current-search')).toHaveTextContent('node=topic-2009-q40');
  });

  it('advances and resets the five-step connection trace', () => {
    renderPage();
    expect(screen.getByText('1 / 5')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText('2 / 5')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '复位步骤' }));
    expect(screen.getByText('1 / 5')).toBeVisible();
  });
});
