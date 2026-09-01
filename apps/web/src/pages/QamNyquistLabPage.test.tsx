import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QamNyquistLabPage } from './QamNyquistLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q34-session'),
  questions: [{ id: 'cn408-2009-q34', year: 2009, number: 34, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-search" aria-label="current search">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/network?module=qam-nyquist&preset=cn408-2009-q34') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/network" element={<><QamNyquistLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q34 单题练习</h1>} />
        <Route path="/knowledge" element={<><h1>Q34 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QamNyquistLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the source-backed Q34 parameters and 24 kbps result', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'QAM / 奈氏准则实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('链路带宽')).toHaveValue('3000');
    expect(screen.getByLabelText('相位数量')).toHaveValue(4);
    expect(screen.getByLabelText('振幅数量')).toHaveValue(4);
    expect(screen.getByLabelText('QAM 最大速率公式')).toHaveTextContent('24 kbps');
    expect(screen.getByLabelText('当前 QAM 推导步骤')).toHaveTextContent('读取题设参数');

    const navigation = within(screen.getByRole('navigation', { name: '计算机网络实验模块' }));
    expect(navigation.getAllByRole('link')).toHaveLength(8);
    expect(navigation.getByRole('link', { name: 'QAM / 奈氏' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the derivation and URL synchronized, rejects invalid input, and restores the preset', () => {
    renderPage('/lab/network?module=qam-nyquist&bandwidth=8000&phases=8&amplitudes=2');

    expect(screen.getByLabelText('链路带宽')).toHaveValue('8000');
    expect(screen.getByLabelText('相位数量')).toHaveValue(8);
    expect(screen.getByLabelText('振幅数量')).toHaveValue(2);
    expect(screen.getByLabelText('QAM 最大速率公式')).toHaveTextContent('64 kbps');

    fireEvent.change(screen.getByLabelText('相位数量'), { target: { value: '1' } });
    expect(screen.getByRole('alert')).toHaveTextContent('相位数量');
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q34 预设' }));
    expect(screen.getByTestId('current-search')).toHaveTextContent('module=qam-nyquist');
    expect(screen.getByTestId('current-search')).toHaveTextContent('preset=cn408-2009-q34');
    expect(screen.getByLabelText('QAM 最大速率公式')).toHaveTextContent('24 kbps');
  });

  it('opens the Q34 practice and knowledge deep links', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q34' }));
    expect(await screen.findByRole('heading', { name: 'Q34 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q34'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q34 知识节点' })).toBeVisible();
    expect(screen.getByLabelText('current search')).toHaveTextContent('subject=computer-networks');
    expect(screen.getByLabelText('current search')).toHaveTextContent('node=topic-2009-q34');
  });
});
