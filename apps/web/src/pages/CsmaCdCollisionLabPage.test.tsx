import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CsmaCdCollisionLabPage } from './CsmaCdCollisionLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q37-session'),
  questions: [{ id: 'cn408-2009-q37', year: 2009, number: 37, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/network?module=csma-cd&preset=cn408-2009-q37') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/network" element={<><CsmaCdCollisionLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q37 单题练习</h1>} />
        <Route path="/knowledge" element={<><h1>Q37 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CsmaCdCollisionLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('shows the exact Q37 parameters, 80 m result, review boundary, and six modules', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'CSMA/CD 碰撞域实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('传输速率')).toHaveValue('1000000000');
    expect(screen.getByLabelText('传播速度')).toHaveValue('200000000');
    expect(screen.getByLabelText('减少的最小帧长')).toHaveValue('800');
    expect(screen.getAllByText('0.8 μs', { exact: true }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('80 m', { exact: true }).length).toBeGreaterThanOrEqual(2);
    const moduleNavigation = within(screen.getByRole('navigation', { name: '计算机网络实验模块' }));
    expect(moduleNavigation.getAllByRole('link')).toHaveLength(8);
    expect(moduleNavigation.getByRole('link', { name: 'CSMA/CD' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the current derivation synchronized with StepExplorer', async () => {
    renderPage();
    expect(screen.getByLabelText('当前 CSMA/CD 推导步骤')).toHaveTextContent('读取题设参数');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => expect(screen.getByLabelText('当前 CSMA/CD 推导步骤')).toHaveTextContent('计算发送时间差'));
    expect(screen.getByLabelText('转换步骤')).toHaveTextContent('2 / 5');
    expect(screen.getByLabelText('当前 CSMA/CD 推导步骤')).toHaveTextContent('0.0000008 s');
  });

  it('restores custom URL parameters, fails closed, and returns to the canonical preset', () => {
    renderPage('/lab/network?module=csma-cd&rate=100000000&speed=200000000&reduction=100');
    expect(screen.getByLabelText('减少的最小帧长')).toHaveValue('100');
    expect(screen.getAllByText('100 m', { exact: true }).length).toBeGreaterThanOrEqual(2);

    fireEvent.change(screen.getByLabelText('减少的最小帧长'), { target: { value: '0' } });
    expect(screen.getByRole('alert')).toHaveTextContent('正整数');
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q37 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/lab/network?module=csma-cd&preset=cn408-2009-q37');
    expect(screen.getAllByText('80 m', { exact: true }).length).toBeGreaterThanOrEqual(2);
  });

  it('opens the exact Q37 practice and knowledge-node deep links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q37' }));
    expect(await screen.findByRole('heading', { name: 'Q37 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q37'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q37 知识节点' })).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('/knowledge?subject=computer-networks&node=topic-2009-q37');
  });
});
