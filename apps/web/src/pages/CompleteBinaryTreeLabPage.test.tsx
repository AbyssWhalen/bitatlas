import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CompleteBinaryTreeLabPage } from './CompleteBinaryTreeLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q05-session'),
  questions: [{ id: 'cn408-2009-q05', year: 2009, number: 5, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前测试 URL">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/data-structures?module=complete-tree&preset=cn408-2009-q05') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/lab/data-structures" element={<CompleteBinaryTreeLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q5 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q5 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CompleteBinaryTreeLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('shows the Q5 source values, review boundary, and eight-module navigation', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '完全二叉树最大结点实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('叶结点所在层 L')).toHaveValue(6);
    expect(screen.getByLabelText('该层叶结点数 k')).toHaveValue(8);
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent('待推导');
    const navigation = screen.getByRole('navigation', { name: '数据结构实验模块' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(8);
    expect(within(navigation).getByRole('link', { name: /完全树极值/u })).toHaveAttribute('aria-current', 'page');
  });

  it('reveals the maximum construction in causal order and concludes 111 only at completion', () => {
    renderPage();

    expect(screen.getByLabelText('当前推导状态')).toHaveTextContent('第 6 层有 8 个叶结点');
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent('待推导');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导状态')).toHaveTextContent('容量 32');
    expect(screen.getByLabelText('当前推导状态')).toHaveTextContent('前 6 层共 63 个结点');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByRole('img', { name: /目标层容量分区/u })).toHaveTextContent('24 个内部结点');
    expect(screen.getByRole('img', { name: /目标层容量分区/u })).toHaveTextContent('8 个叶结点');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导状态')).toHaveTextContent('最大高度 7');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导状态')).toHaveTextContent('第 7 层新增 48 个结点');
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent('待推导');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent('最大结点数 111');
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent('来源选项 C');
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent('最大构型');
  });

  it('restores custom URL state, fails closed, and returns to the canonical preset', () => {
    renderPage('/lab/data-structures?module=complete-tree&leafLevel=3&leafCount=1');

    expect(screen.getByLabelText('叶结点所在层 L')).toHaveValue(3);
    expect(screen.getByLabelText('该层叶结点数 k')).toHaveValue(1);
    fireEvent.change(screen.getByLabelText('该层叶结点数 k'), { target: { value: '5' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/叶结点数|容量|4/u);
    expect(screen.queryByLabelText('当前推导状态')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('当前最大结点结论')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q5 预设' }));
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/lab/data-structures?module=complete-tree&preset=cn408-2009-q05');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('叶结点所在层 L')).toHaveValue(6);
    expect(screen.getByLabelText('该层叶结点数 k')).toHaveValue(8);
  });

  it('lets the explicit complete-tree module ignore a conflicting foreign preset', () => {
    renderPage('/lab/data-structures?module=complete-tree&preset=cn408-2009-q41&leafLevel=3&leafCount=1');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('叶结点所在层 L')).toHaveValue(6);
    expect(screen.getByLabelText('该层叶结点数 k')).toHaveValue(8);
    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    }
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent('最大结点数 111');
    expect(screen.getByLabelText('当前最大结点结论')).not.toHaveTextContent('来源选项 C');
  });

  it.each([
    { leafLevel: 3, leafCount: 4, maximum: 7 },
    { leafLevel: 1, leafCount: 1, maximum: 1 },
  ])('describes full level $leafLevel without inventing an empty last level', ({ leafLevel, leafCount, maximum }) => {
    renderPage(`/lab/data-structures?module=complete-tree&leafLevel=${leafLevel}&leafCount=${leafCount}`);

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByRole('img', { name: /目标层容量分区/u })).toHaveTextContent(`0 个内部结点`);
    expect(screen.getByRole('img', { name: /目标层容量分区/u })).toHaveTextContent(`${leafCount} 个叶结点`);
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导状态')).toHaveTextContent(`最大高度 ${leafLevel}`);
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导状态')).toHaveTextContent(`无需新增第 ${leafLevel + 1} 层`);
    expect(screen.getByLabelText('当前推导状态')).not.toHaveTextContent(`第 ${leafLevel} 层 0 个结点`);
    expect(screen.getByLabelText('最大构型聚合图')).toHaveTextContent('L+1 层新增');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前最大结点结论')).toHaveTextContent(`最大结点数 ${maximum}`);
    expect(screen.getByLabelText('当前最大结点结论')).not.toHaveTextContent('来源选项 C');
  });

  it('keeps maximum safe integers inside mobile-friendly metric cells', () => {
    renderPage('/lab/data-structures?module=complete-tree&leafLevel=52&leafCount=1');

    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    }
    const metrics = screen.getByLabelText('最大构型指标');
    expect(metrics).toHaveTextContent('4503599627370495');
    expect(metrics).toHaveTextContent('4503599627370494');
    expect(within(metrics).getAllByRole('group')).toHaveLength(3);
  });

  it('opens the exact Q5 practice and knowledge links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q5' }));
    expect(await screen.findByRole('heading', { name: 'Q5 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q05'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q5 知识节点' })).toBeVisible();
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=data-structures&node=topic-2009-q05');
  });
});
