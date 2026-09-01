import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SegmentationAddressLabPage } from './SegmentationAddressLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q27-session'),
  questions: [{ id: 'cn408-2009-q27', year: 2009, number: 27, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前测试地址">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/os-memory?module=segmentation-address&preset=cn408-2009-q27') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/os-memory" element={<><SegmentationAddressLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q27 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q27 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SegmentationAddressLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the source-backed Q27 fields and 2^24-byte result', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '分段地址字段实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('地址总位数')).toHaveValue(32);
    expect(screen.getByLabelText('段号位数')).toHaveValue(8);
    expect(screen.getByLabelText('最大段长公式')).toHaveTextContent('2^24 B');
    expect(screen.getByRole('img', { name: '32 位地址由 8 位段号和 24 位段内位移组成' })).toBeVisible();
    expect(screen.getByLabelText('当前分段地址推导步骤')).toHaveTextContent('读取地址格式');

    const navigation = screen.getByRole('navigation', { name: '操作系统实验模块' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(7);
    expect(within(navigation).getByRole('link', { name: '分段地址' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps custom parameters URL-driven, fails closed, and restores Q27', () => {
    renderPage('/lab/os-memory?module=segmentation-address&addressBits=16&segmentBits=4');

    expect(screen.getByLabelText('最大段长公式')).toHaveTextContent('2^12 B');
    fireEvent.change(screen.getByLabelText('段号位数'), { target: { value: '16' } });
    expect(screen.getByRole('alert')).toHaveTextContent('段号位数');
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q27 预设' }));
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent('module=segmentation-address');
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent('preset=cn408-2009-q27');
    expect(screen.getByLabelText('最大段长公式')).toHaveTextContent('2^24 B');
  });

  it('opens the Q27 practice and knowledge links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q27' }));
    expect(await screen.findByRole('heading', { name: 'Q27 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q27'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q27 知识节点' })).toBeVisible();
  });
});
