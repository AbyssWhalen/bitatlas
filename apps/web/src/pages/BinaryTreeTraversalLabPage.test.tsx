import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BinaryTreeTraversalLabPage } from './BinaryTreeTraversalLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q03-session'),
  questions: [{ id: 'cn408-2009-q03', year: 2009, number: 3, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function renderPage(path = '/lab/data-structures?module=tree-traversal&preset=cn408-2009-q03&order=RNL') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/data-structures" element={<BinaryTreeTraversalLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q3 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q3 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BinaryTreeTraversalLabPage', () => {
  beforeEach(() => {
    study.createSession.mockClear();
  });

  afterEach(cleanup);

  it('shows the exact Q3 tree, RNL result, review boundary, and seven modules', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '二叉树遍历实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('层序结点')).toHaveValue('1,2,3,4,5,#,#,#,#,6,7');
    expect(screen.getByRole('button', { name: 'RNL' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('遍历结果')).toHaveTextContent('3, 1, 7, 5, 6, 2, 4');
    expect(screen.getByLabelText('当前二叉树').querySelectorAll('[data-tree-node-id]')).toHaveLength(7);

    const navigation = screen.getByRole('navigation', { name: '数据结构实验模块' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(8);
    expect(within(navigation).getByRole('link', { name: '二叉树遍历' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the tree and recursive call stack synchronized with the trace', async () => {
    renderPage();
    expect(screen.getByLabelText('递归调用栈')).toHaveTextContent('空');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => expect(screen.getByLabelText('递归调用栈')).toHaveTextContent('1'));
    expect(screen.getByLabelText('当前二叉树').querySelector('[data-tree-node-id="1"]')).toHaveClass('active');
    expect(screen.getByLabelText('当前遍历事件')).toHaveTextContent('进入结点 1');
  });

  it('fails closed for an unreachable level-order node and restores Q3', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('层序结点'), { target: { value: '1,#,#,2' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/父结点|不可达|层序/u);
    expect(screen.queryByLabelText('当前二叉树')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('遍历结果')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q3 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('遍历结果')).toHaveTextContent('3, 1, 7, 5, 6, 2, 4');
  });

  it('restores a custom tree and traversal order from the URL', () => {
    renderPage('/lab/data-structures?module=tree-traversal&tree=A,B,C&order=NLR');

    expect(screen.getByLabelText('层序结点')).toHaveValue('A,B,C');
    expect(screen.getByRole('button', { name: 'NLR' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('遍历结果')).toHaveTextContent('A, B, C');
  });

  it('opens Q3 practice and the exact knowledge node', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q3' }));
    expect(await screen.findByRole('heading', { name: 'Q3 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q03'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q3 知识节点' })).toBeVisible();
  });
});
