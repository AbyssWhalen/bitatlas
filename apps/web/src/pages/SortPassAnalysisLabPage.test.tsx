import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SortPassAnalysisLabPage } from './SortPassAnalysisLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q10-session'),
  questions: [{ id: 'cn408-2009-q10', year: 2009, number: 10, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前测试 URL">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/data-structures?module=sort-pass&preset=cn408-2009-q10') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/lab/data-structures" element={<SortPassAnalysisLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q10 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q10 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SortPassAnalysisLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('shows the Q10 source state, review boundary, and eight-module navigation', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '排序趟次不变量判别实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('第二趟序列')).toHaveValue('11,12,13,7,8,9,23,4,5');
    expect(screen.getByLabelText('当前判别结论')).toHaveTextContent('待判定');
    expect(screen.queryByText(/来源答案 B/u)).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: '候选必要不变量' })).toHaveTextContent('满足其一');
    expect(screen.getByRole('table', { name: '候选必要不变量' })).not.toHaveTextContent('证明就是');
    const navigation = screen.getByRole('navigation', { name: '数据结构实验模块' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(8);
    expect(within(navigation).getByRole('link', { name: /趟次判别/u })).toHaveAttribute('aria-current', 'page');
  });

  it('reveals four necessary-condition checks and only concludes B at completion', () => {
    renderPage();

    const matrix = screen.getByRole('table', { name: '候选必要不变量' });
    expect(within(matrix).getByText('A · 起泡排序').closest('tr')).toHaveTextContent('待检查');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(within(matrix).getByText('A · 起泡排序').closest('tr')).toHaveTextContent('已排除');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(within(matrix).getByText('B · 插入排序').closest('tr')).toHaveTextContent('未被必要条件排除');
    expect(screen.getByLabelText('当前判别结论')).toHaveTextContent('待判定');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(within(matrix).getByText('D · 二路归并排序').closest('tr')).toHaveTextContent('已排除');
    expect(screen.getByLabelText('当前判别结论')).toHaveTextContent('待判定');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前判别结论')).toHaveTextContent('题列四项中仅 B 未被必要条件排除');
    expect(screen.getByLabelText('当前判别结论')).toHaveTextContent('不是未知前两趟的重放证明');
  });

  it('restores custom URL state, fails closed, and returns to the canonical preset', () => {
    renderPage('/lab/data-structures?module=sort-pass&values=1,2,3,4');

    expect(screen.getByLabelText('第二趟序列')).toHaveValue('1,2,3,4');
    fireEvent.change(screen.getByLabelText('第二趟序列'), { target: { value: '1,,3' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/空项|整数|序列/u);
    expect(screen.queryByRole('table', { name: '候选必要不变量' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('当前判别结论')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q10 预设' }));
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/lab/data-structures?module=sort-pass&preset=cn408-2009-q10');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('第二趟序列')).toHaveValue('11,12,13,7,8,9,23,4,5');
  });

  it('derives a custom completion from its own trace instead of projecting the Q10 answer', () => {
    renderPage('/lab/data-structures?module=sort-pass&values=1,2,3,4');

    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    }

    expect(screen.getByLabelText('当前判别结论')).toHaveTextContent('仍有多个题列候选未被排除');
    expect(screen.getByLabelText('当前判别结论')).not.toHaveTextContent('仅 B');
    expect(screen.queryByText(/来源答案 B/u)).not.toBeInTheDocument();
  });

  it('lets the explicit sort-pass module ignore a conflicting foreign preset', () => {
    renderPage('/lab/data-structures?module=sort-pass&preset=cn408-2009-q41');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('第二趟序列')).toHaveValue('11,12,13,7,8,9,23,4,5');
    expect(screen.getByRole('table', { name: '候选必要不变量' })).toBeVisible();
  });

  it('opens the exact Q10 practice and knowledge links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q10' }));
    expect(await screen.findByRole('heading', { name: 'Q10 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q10'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q10 知识节点' })).toBeVisible();
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=data-structures&node=topic-2009-q10');
  });
});
