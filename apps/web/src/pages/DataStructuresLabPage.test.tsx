import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DataStructuresLabPage } from './DataStructuresLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q41-session'),
  questions: [
    { id: 'cn408-2009-q02', year: 2009, number: 2 },
    { id: 'cn408-2009-q03', year: 2009, number: 3 },
    { id: 'cn408-2009-q05', year: 2009, number: 5, reviewStatus: 'needs-review' },
    { id: 'cn408-2009-q06', year: 2009, number: 6 },
    { id: 'cn408-2009-q09', year: 2009, number: 9 },
    { id: 'cn408-2009-q10', year: 2009, number: 10 },
    { id: 'cn408-2009-q41', year: 2009, number: 41 },
    { id: 'cn408-2009-q42', year: 2009, number: 42 },
  ],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function renderPage(path = '/lab/data-structures?preset=cn408-2009-q41') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/data-structures" element={<DataStructuresLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q41 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q41 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DataStructuresLabPage', () => {
  beforeEach(() => {
    study.createSession.mockClear();
  });

  afterEach(cleanup);

  it('shows the reviewed-status caveat and compares local-nearest with Dijkstra', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '最短路径实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByText('S → A → T')).toBeVisible();
    expect(screen.getByText('S → B → T')).toBeVisible();
    expect(screen.getByText('11', { exact: true })).toBeVisible();
    expect(screen.getByText('4', { exact: true })).toBeVisible();
    expect(screen.getByText(/题设方法不是 Dijkstra/u)).toBeVisible();
  });

  it('keeps the graph state synchronized with StepExplorer controls', async () => {
    renderPage();
    expect(document.querySelector('[data-node-id="S"]')).toHaveClass('current');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => expect(document.querySelector('[data-node-id="A"]')).toHaveClass('current'));
    expect(screen.getByText('选择当前最近边 sa')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Dijkstra' }));
    expect(document.querySelector('[data-node-id="S"]')).toHaveClass('current');
    expect(screen.getByText('初始化全局距离')).toBeVisible();
  });

  it('opens Q41 practice and the exact knowledge-node deep link', async () => {
    renderPage('/lab/data-structures?preset=dead-end');
    expect(screen.getByRole('combobox', { name: '典型题预设' })).toHaveValue('dead-end');

    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q41' }));
    expect(await screen.findByRole('heading', { name: 'Q41 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q41'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q41 知识节点' })).toBeVisible();
  });

  it('runs the Q42 two-pointer trace and handles the too-short boundary', async () => {
    renderPage('/lab/data-structures?module=linked-list&preset=cn408-2009-q42');

    expect(screen.getByRole('heading', { name: '单链表双指针实验室' })).toBeVisible();
    expect(screen.getByText('data = 9')).toBeVisible();
    expect(document.querySelector('[data-node-index="0"]')).toHaveClass('fast', 'slow');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => expect(document.querySelector('[data-node-index="1"]')).toHaveClass('fast'));
    expect(document.querySelector('[data-node-index="0"]')).toHaveClass('slow');

    fireEvent.change(screen.getByRole('combobox', { name: '单链表典型题预设' }), { target: { value: 'too-short' } });
    expect(screen.getByText('未找到')).toBeVisible();
    expect(screen.getByText(/链长 2 小于 k=3/u)).toBeVisible();
  });

  it('opens Q42 practice from the linked-list module', async () => {
    renderPage('/lab/data-structures?module=linked-list&preset=cn408-2009-q42');
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q42' }));
    await waitFor(() => expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q42'], 'practice'));
  });

  it.each([
    ['/lab/data-structures?module=complete-tree&preset=cn408-2009-q41'],
    ['/lab/data-structures?preset=cn408-2009-q05'],
  ])('routes %s to the Q5 complete-tree module', (path) => {
    renderPage(path);
    expect(screen.getByRole('heading', { name: '完全二叉树最大结点实验室' })).toBeVisible();
  });

  it.each([
    ['/lab/data-structures?module=stack-capacity&preset=cn408-2009-q42'],
    ['/lab/data-structures?preset=cn408-2009-q02'],
  ])('routes %s to the Q2 stack-capacity module', (path) => {
    renderPage(path);
    expect(screen.getByRole('heading', { name: '栈最小容量实验室' })).toBeVisible();
  });

  it.each([
    ['/lab/data-structures?module=min-heap&preset=cn408-2009-q41'],
    ['/lab/data-structures?preset=cn408-2009-q09'],
  ])('routes %s to the Q9 min-heap module', (path) => {
    renderPage(path);
    expect(screen.getByRole('heading', { name: '小根堆插入实验室' })).toBeVisible();
  });

  it.each([
    ['/lab/data-structures?module=tree-traversal&preset=cn408-2009-q41'],
    ['/lab/data-structures?preset=cn408-2009-q03'],
  ])('routes %s to the Q3 binary-tree traversal module', (path) => {
    renderPage(path);
    expect(screen.getByRole('heading', { name: '二叉树遍历实验室' })).toBeVisible();
  });

  it.each([
    ['/lab/data-structures?module=forest-conversion&preset=cn408-2009-q41'],
    ['/lab/data-structures?preset=cn408-2009-q06'],
  ])('routes %s to the Q6 forest-conversion module', (path) => {
    renderPage(path);
    expect(screen.getByRole('heading', { name: '森林与二叉树转换实验室' })).toBeVisible();
  });

  it.each([
    ['/lab/data-structures?module=sort-pass&preset=cn408-2009-q41'],
    ['/lab/data-structures?preset=cn408-2009-q10'],
  ])('routes %s to the Q10 sort-pass module', (path) => {
    renderPage(path);
    expect(screen.getByRole('heading', { name: '排序趟次不变量判别实验室' })).toBeVisible();
  });

  it('does not let a Q10 preset override an invalid explicit module', () => {
    renderPage('/lab/data-structures?module=unknown&preset=cn408-2009-q10');
    expect(screen.getByRole('heading', { name: '最短路径实验室' })).toBeVisible();
  });

  it('does not let a Q5 preset override an invalid explicit module', () => {
    renderPage('/lab/data-structures?module=unknown&preset=cn408-2009-q05');
    expect(screen.getByRole('heading', { name: '最短路径实验室' })).toBeVisible();
  });
});
