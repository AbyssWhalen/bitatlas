import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MinHeapInsertLabPage } from './MinHeapInsertLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q09-session'),
  questions: [{ id: 'cn408-2009-q09', year: 2009, number: 9, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function renderPage(path = '/lab/data-structures?module=min-heap&preset=cn408-2009-q09') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/data-structures" element={<MinHeapInsertLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q9 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q9 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MinHeapInsertLabPage', () => {
  beforeEach(() => {
    study.createSession.mockClear();
  });

  afterEach(cleanup);

  it('shows the exact Q9 preset, review boundary, and four data-structure modules', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '小根堆插入实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('初始小根堆')).toHaveValue('5,8,12,19,28,20,15,22');
    expect(screen.getByLabelText('插入关键字')).toHaveValue(3);
    expect(screen.getByLabelText('最终层序')).toHaveTextContent('3, 5, 12, 8, 28, 20, 15, 22, 19');
    expect(screen.getByLabelText('交换次数')).toHaveTextContent('3');

    const navigation = screen.getByRole('navigation', { name: '数据结构实验模块' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(8);
    expect(within(navigation).getByRole('link', { name: '小根堆插入' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the complete-binary-tree state synchronized with upward swaps', async () => {
    renderPage();
    expect(screen.getByLabelText('当前堆树').querySelectorAll('[data-heap-index]')).toHaveLength(8);

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => expect(screen.getByLabelText('当前堆树').querySelectorAll('[data-heap-index]')).toHaveLength(9));
    expect(screen.getByLabelText('当前堆事件')).toHaveTextContent('追加关键字 3');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前根结点')).toHaveTextContent('5');
    expect(screen.getByLabelText('当前堆树').querySelector('[data-heap-index="3"]')).toHaveTextContent('3');
  });

  it('fails closed for an invalid initial heap and restores the Q9 preset', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('初始小根堆'), { target: { value: '8,5,12' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/min-heap|小根堆|parent/u);
    expect(screen.queryByLabelText('当前堆树')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q9 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('初始小根堆')).toHaveValue('5,8,12,19,28,20,15,22');
  });

  it('restores custom input from the URL', () => {
    renderPage('/lab/data-structures?module=min-heap&heap=1,4,2&value=0');
    expect(screen.getByLabelText('初始小根堆')).toHaveValue('1,4,2');
    expect(screen.getByLabelText('插入关键字')).toHaveValue(0);
    expect(screen.getByLabelText('最终层序')).toHaveTextContent('0, 1, 2, 4');
  });

  it('opens Q9 practice and the exact knowledge node', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q9' }));
    expect(await screen.findByRole('heading', { name: 'Q9 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q09'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q9 知识节点' })).toBeVisible();
  });
});
