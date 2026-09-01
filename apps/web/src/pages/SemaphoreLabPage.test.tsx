import '@testing-library/jest-dom/vitest';
import { Q45_BUFFER_PRESET } from '@408os/lab-core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SemaphoreLabPage } from './SemaphoreLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q45-session'),
  questions: [{ id: 'cn408-2009-q45', year: 2009, number: 45, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function LocationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <output aria-label="当前测试地址">{location.pathname}{location.search}</output>
      <button type="button" onClick={() => void navigate(-1)}>测试后退</button>
      <button type="button" onClick={() => void navigate(1)}>测试前进</button>
    </div>
  );
}

function renderPage(path = '/lab/os-memory?module=semaphore&preset=cn408-2009-q45') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/os-memory" element={<><SemaphoreLabPage /><LocationControls /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q45 单题练习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function clickNext(times: number) {
  for (let index = 0; index < times; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
  }
}

describe('SemaphoreLabPage', () => {
  beforeEach(() => {
    study.createSession.mockClear();
  });

  afterEach(cleanup);

  it('renders the Q45 preset with N slots, four semaphores, and four OS modules', () => {
    const { container } = renderPage();

    expect(screen.getByRole('heading', { name: '信号量同步实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByRole('navigation', { name: '操作系统实验模块' }).querySelectorAll('a')).toHaveLength(7);
    expect(screen.getByRole('link', { name: '信号量同步' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelectorAll('[data-buffer-slot]')).toHaveLength(2);
    expect(container.querySelector('[data-semaphore-id="mutex"]')).toHaveAttribute('data-semaphore-value', '1');
    expect(container.querySelector('[data-semaphore-id="empty"]')).toHaveAttribute('data-semaphore-value', '2');
    expect(container.querySelector('[data-semaphore-id="odd"]')).toHaveAttribute('data-semaphore-value', '0');
    expect(container.querySelector('[data-semaphore-id="even"]')).toHaveAttribute('data-semaphore-value', '0');
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(screen.getByLabelText('转换步骤').querySelector('.step-list')).not.toHaveAttribute('aria-live');
  });

  it('shows FIFO blocking, direct permit handoff, and typed odd removal on one timeline', async () => {
    const { container } = renderPage();

    clickNext(2);
    expect(container.querySelector('[data-process-id="P2"]')).toHaveAttribute('data-process-status', 'blocked');
    expect(container.querySelector('[data-process-id="P3"]')).toHaveAttribute('data-process-status', 'blocked');
    expect(screen.getByLabelText('odd FIFO 阻塞队列')).toHaveTextContent('P2');
    expect(screen.getByLabelText('even FIFO 阻塞队列')).toHaveTextContent('P3');

    clickNext(6);
    await waitFor(() => expect(container.querySelector('[data-event-outcome="woken"]')).toBeInTheDocument());
    expect(container.querySelector('[data-process-id="P2"]')).toHaveAttribute('data-process-status', 'ready');
    expect(container.querySelector('[data-semaphore-id="odd"]')).toHaveAttribute('data-semaphore-value', '0');
    expect(container.querySelector('[data-buffer-value="3"]')).toHaveTextContent('奇数');
    expect(screen.getByText(/许可直接移交给 P2/u)).toBeVisible();

    clickNext(2);
    expect(container.querySelector('[data-buffer-slot="0"]')).toHaveAttribute('data-buffer-value', '');
  });

  it('fails closed for an invalid script and restores the reviewed preset', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Q45 操作脚本'), { target: { value: 'P1 eval alert(1)' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/第 1 行/u);
    expect(screen.queryByRole('heading', { name: '容量 N 缓冲区' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q45 预设' }));
    expect(screen.getByRole('heading', { name: '容量 N 缓冲区' })).toBeVisible();
    expect(screen.getByLabelText('缓冲区容量 N')).toHaveValue('2');
  });

  it('restores a custom capacity and script from the URL', () => {
    const script = encodeURIComponent('P1 produce 5');
    const { container } = renderPage(`/lab/os-memory?module=semaphore&capacity=3&script=${script}`);

    expect(screen.getByLabelText('缓冲区容量 N')).toHaveValue('3');
    expect(screen.getByLabelText('Q45 操作脚本')).toHaveValue('P1 produce 5');
    expect(container.querySelectorAll('[data-buffer-slot]')).toHaveLength(3);
    expect(screen.getByText('1 条原子操作 · 2 个可重放状态')).toBeVisible();
  });

  it('keeps UI state synchronized across active-tab navigation and browser history', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('缓冲区容量 N'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Q45 操作脚本'), { target: { value: 'P1 produce 5' } });
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent(/capacity=3/u);

    fireEvent.click(screen.getByRole('link', { name: '信号量同步' }));
    await waitFor(() => expect(screen.getByLabelText('缓冲区容量 N')).toHaveValue('2'));
    expect(screen.getByLabelText('Q45 操作脚本')).toHaveValue(Q45_BUFFER_PRESET.script);
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent(
      '/lab/os-memory?module=semaphore&preset=cn408-2009-q45',
    );

    fireEvent.click(screen.getByRole('button', { name: '测试后退' }));
    await waitFor(() => expect(screen.getByLabelText('缓冲区容量 N')).toHaveValue('3'));
    expect(screen.getByLabelText('Q45 操作脚本')).toHaveValue('P1 produce 5');

    fireEvent.click(screen.getByRole('button', { name: '测试前进' }));
    await waitFor(() => expect(screen.getByLabelText('缓冲区容量 N')).toHaveValue('2'));
    expect(screen.getByLabelText('Q45 操作脚本')).toHaveValue(Q45_BUFFER_PRESET.script);
  });

  it('exposes play, pause, and reset through the shared step explorer', () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: '播放步骤' }));
    expect(screen.getByRole('button', { name: '暂停步骤' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '暂停步骤' }));
    clickNext(1);
    expect(container.querySelector('[data-process-id="P2"]')).toHaveAttribute('data-process-status', 'blocked');
    fireEvent.click(screen.getByRole('button', { name: '复位步骤' }));
    expect(container.querySelector('[data-process-id="P2"]')).toHaveAttribute('data-process-status', 'ready');
  });

  it('opens a single-question Q45 practice session', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q45' }));

    expect(await screen.findByRole('heading', { name: 'Q45 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q45'], 'practice');
  });
});
