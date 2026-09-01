import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { TcpCumulativeAckLabPage } from './TcpCumulativeAckLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q38-session'),
  questions: [{ id: 'cn408-2009-q38', year: 2009, number: 38, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/network?module=tcp-ack&preset=cn408-2009-q38') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/network" element={<><TcpCumulativeAckLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q38 单题练习</h1>} />
        <Route path="/knowledge" element={<><h1>Q38 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TcpCumulativeAckLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the Q38 byte ranges, cumulative ACK, review boundary, and six modules', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'TCP 累计确认实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('首段序列号')).toHaveValue('200');
    expect(screen.getByLabelText('第一个 payload')).toHaveValue('300');
    expect(screen.getByLabelText('第二个 payload')).toHaveValue('500');
    expect(screen.getByLabelText('TCP 累计确认公式')).toHaveTextContent('ACK 1000');
    expect(screen.getByLabelText('TCP 字节区间')).toHaveTextContent('[200, 500)');
    expect(screen.getByLabelText('TCP 字节区间')).toHaveTextContent('[500, 1000)');
    expect(screen.getByLabelText('当前 TCP 累计确认步骤')).toHaveTextContent('读取连接与首段序号');

    const navigation = within(screen.getByRole('navigation', { name: '计算机网络实验模块' }));
    expect(navigation.getAllByRole('link')).toHaveLength(8);
    expect(navigation.getByRole('link', { name: 'TCP ACK' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps URL and trace synchronized, fails closed, and restores the preset', async () => {
    renderPage('/lab/network?module=tcp-ack&firstSequence=10&firstLength=4&secondLength=6');

    expect(screen.getByLabelText('TCP 累计确认公式')).toHaveTextContent('ACK 20');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => expect(screen.getByLabelText('当前 TCP 累计确认步骤')).toHaveTextContent('展开第一个 TCP 段'));
    expect(screen.getByLabelText('转换步骤')).toHaveTextContent('2 / 5');

    fireEvent.change(screen.getByLabelText('第一个 payload'), { target: { value: '0' } });
    expect(screen.getByRole('alert')).toHaveTextContent('payload');
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q38 预设' }));
    expect(screen.getByTestId('location')).toHaveTextContent('module=tcp-ack');
    expect(screen.getByTestId('location')).toHaveTextContent('preset=cn408-2009-q38');
    expect(screen.getByLabelText('TCP 累计确认公式')).toHaveTextContent('ACK 1000');
  });

  it('opens the Q38 practice and knowledge deep links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q38' }));
    expect(await screen.findByRole('heading', { name: 'Q38 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q38'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q38 知识节点' })).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('subject=computer-networks');
    expect(screen.getByTestId('location')).toHaveTextContent('node=topic-2009-q38');
  });
});
