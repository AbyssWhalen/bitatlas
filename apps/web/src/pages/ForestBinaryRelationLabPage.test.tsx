import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForestBinaryRelationLabPage } from './ForestBinaryRelationLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q06-session'),
  questions: [{ id: 'cn408-2009-q06', year: 2009, number: 6, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function renderPage(path = '/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=LR') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/data-structures" element={<ForestBinaryRelationLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q6 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q6 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForestBinaryRelationLabPage', () => {
  afterEach(cleanup);

  it('shows the Q6 proof, both synchronized views, and seven module links', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '森林与二叉树转换实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByRole('button', { name: 'LR' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('二叉树视图')).toHaveTextContent('u');
    expect(screen.getByLabelText('森林视图')).toHaveTextContent('u');
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('待判定');
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('匹配题干命题待判定');
    expect(screen.getByLabelText('森林视图')).toHaveTextContent('等待两条边解码后判定');
    expect(screen.getByLabelText('题干命题判定')).toHaveTextContent('I');
    expect(within(screen.getByRole('navigation', { name: '数据结构实验模块' })).getAllByRole('link')).toHaveLength(8);
  });

  it('changes case, steps one edge at a time, and restores Q6 after an invalid path', () => {
    renderPage('/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=RR');

    expect(screen.getByRole('button', { name: 'RR' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('待判定');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前证明步骤')).toHaveTextContent('解码第 1 条边');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前证明步骤')).toHaveTextContent('解码第 2 条边');
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('待判定');
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('匹配题干命题待判定');
    expect(screen.getByLabelText('森林视图')).toHaveTextContent('等待两条边解码后判定');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('u、v 是同一父结点下的兄弟');
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('匹配题干命题II');
    expect(screen.getByLabelText('森林视图')).toHaveTextContent('u、v 是同一父结点下的兄弟');

    cleanup();
    renderPage('/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=bad');
    expect(screen.getByRole('alert')).toHaveTextContent(/path|LL|LR|RL|RR/u);
    expect(screen.queryByLabelText('二叉树视图')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '恢复 Q6 预设' }));
    expect(screen.getByLabelText('当前关系')).toHaveTextContent('待判定');
  });

  it('opens the Q6 practice and exact knowledge node links', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q6' }));
    expect(await screen.findByRole('heading', { name: 'Q6 单题练习' })).toBeVisible();

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q6 知识节点' })).toBeVisible();
  });
});
