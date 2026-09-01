import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TcpCongestionLabPage } from './TcpCongestionLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q39-session'),
  questions: [{ id: 'cn408-2009-q39', year: 2009, number: 39, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/lab/network?module=tcp-congestion&preset=cn408-2009-q39']}>
      <Routes>
        <Route path="/lab/network" element={<TcpCongestionLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q39 单题练习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TcpCongestionLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('replays the Q39 timeout and four acknowledged RTTs in the classic model', async () => {
    const { container } = renderPage();

    expect(screen.getByRole('heading', { name: 'TCP 拥塞控制实验室' })).toBeVisible();
    expect(screen.getByText('408 经典超时模型')).toBeVisible();
    expect(screen.getByText(/不代表所有现代 TCP 实现/u)).toBeVisible();
    expect(container.querySelector('.tcp-state-summary')).toHaveTextContent('1 MSS');
    expect(container.querySelector('.tcp-state-summary')).toHaveTextContent('8 MSS');
    const next = screen.getByRole('button', { name: '下一步' });
    for (let index = 0; index < 4; index += 1) fireEvent.click(next);
    await waitFor(() => expect(container.querySelector('.tcp-state-summary')).toHaveTextContent('9 MSS'));
  });

  it('synchronizes the chart and state with the step controls', async () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('.tcp-cwnd-point')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => expect(container.querySelectorAll('.tcp-cwnd-point')).toHaveLength(3));
    expect(container.querySelector('.tcp-state-summary')).toHaveTextContent('2 MSS');
  });

  it('accepts custom events and removes stale results on invalid input', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('初始拥塞窗口'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('初始慢开始门限'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('TCP 事件脚本'), { target: { value: 'rtt\ndup3\ntimeout' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/收到 3 个重复 ACK/u)).toBeVisible();

    fireEvent.change(screen.getByLabelText('TCP 事件脚本'), { target: { value: 'cubic' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/事件“cubic”无效/u);
    expect(screen.queryByLabelText('当前 TCP 拥塞状态')).not.toBeInTheDocument();
  });

  it('starts the exact Q39 practice session', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q39' }));
    expect(await screen.findByRole('heading', { name: 'Q39 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q39'], 'practice');
  });
});
