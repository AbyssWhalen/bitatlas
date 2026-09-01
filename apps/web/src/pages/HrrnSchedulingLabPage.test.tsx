import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HrrnSchedulingLabPage } from './HrrnSchedulingLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q24-session'),
  questions: [{ id: 'cn408-2009-q24', year: 2009, number: 24, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前测试地址">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/os-memory?module=hrrn&preset=cn408-2009-q24') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/os-memory" element={<><HrrnSchedulingLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q24 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q24 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HrrnSchedulingLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the Q24 source concept separately from the editable teaching example', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '高响应比调度实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByText(/原题只给出算法概念/u)).toBeVisible();
    expect(screen.getByLabelText('响应比公式')).toHaveTextContent('R = (等待时间 + 执行时间) / 执行时间');
    expect(screen.getByLabelText('Q24 来源结论')).toHaveTextContent('D');
    expect(screen.getByRole('textbox', { name: '进程教学示例' })).toHaveValue('P1,0,3;P2,1,5;P3,2,2;P4,4,1');
    expect(screen.getByRole('table', { name: 'HRRN 调度结果' })).toHaveTextContent('P1');
    expect(screen.getByRole('table', { name: 'HRRN 调度结果' })).toHaveTextContent('P3');

    const navigation = screen.getByRole('navigation', { name: '操作系统实验模块' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(7);
    expect(within(navigation).getByRole('link', { name: '高响应比' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps custom jobs URL-driven, fails closed, and restores the Q24 example', () => {
    renderPage('/lab/os-memory?module=hrrn&jobs=P1%2C4%2C2%3BP2%2C4%2C2');

    expect(screen.getByRole('textbox', { name: '进程教学示例' })).toHaveValue('P1,4,2;P2,4,2');
    expect(screen.getByText(/CPU 空闲 4 个时间单位/u)).toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: '进程教学示例' }), { target: { value: 'P1,0,0' } });
    expect(screen.getByRole('alert')).toHaveTextContent('执行时间');
    expect(screen.queryByRole('table', { name: 'HRRN 调度结果' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q24 示例' }));
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent('module=hrrn');
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent('preset=cn408-2009-q24');
    expect(screen.getByRole('table', { name: 'HRRN 调度结果' })).toHaveTextContent('P4');
  });

  it('opens the Q24 practice and knowledge links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q24' }));
    expect(await screen.findByRole('heading', { name: 'Q24 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q24'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q24 知识节点' })).toBeVisible();
  });
});
