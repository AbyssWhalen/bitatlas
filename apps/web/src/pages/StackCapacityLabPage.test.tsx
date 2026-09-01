import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StackCapacityLabPage } from './StackCapacityLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q02-session'),
  questions: [{ id: 'cn408-2009-q02', year: 2009, number: 2, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function renderPage(path = '/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/data-structures" element={<StackCapacityLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q2 单题练习</h1>} />
        <Route path="/knowledge" element={<h1>Q2 知识节点</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StackCapacityLabPage', () => {
  beforeEach(() => {
    study.createSession.mockClear();
  });

  afterEach(cleanup);

  it('shows the exact Q2 preset, review boundary, and four data-structure modules', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '栈最小容量实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('入栈顺序')).toHaveValue('a,b,c,d,e,f,g');
    expect(screen.getByLabelText('目标出栈顺序')).toHaveValue('b,d,c,f,e,a,g');
    expect(screen.getByLabelText('最小栈容量')).toHaveTextContent('3');
    const navigation = screen.getByRole('navigation', { name: '数据结构实验模块' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(8);
    expect(within(navigation).getByRole('link', { name: '栈容量' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the stack, high-water mark, and produced prefix synchronized with steps', async () => {
    renderPage();
    expect(screen.getByLabelText('当前栈')).toHaveTextContent('空栈');

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    }

    await waitFor(() => expect(screen.getByLabelText('当前栈深度')).toHaveTextContent('3'));
    expect(screen.getByLabelText('当前峰值深度')).toHaveTextContent('3');
    expect(screen.getByLabelText('当前栈').querySelectorAll('[data-stack-value]')).toHaveLength(3);
    expect(screen.getByLabelText('当前栈')).toHaveTextContent('a');
    expect(screen.getByLabelText('当前栈')).toHaveTextContent('c');
    expect(screen.getByLabelText('当前栈')).toHaveTextContent('d');
    expect(screen.getByLabelText('已出栈并入队的顺序')).toHaveTextContent('b');
    expect(screen.getByText('d 入栈')).toBeVisible();
  });

  it('announces step changes exactly once through the current event', () => {
    const { container } = renderPage();
    const liveRegions = container.querySelectorAll('[aria-live="polite"]');

    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0]).toHaveTextContent('准备产生目标输出 b');
    expect(screen.getByLabelText('转换步骤').querySelector('[aria-live]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(liveRegions[0]).toHaveTextContent('将 a 压入栈顶');
  });

  it('fails closed for an impossible permutation and restores the Q2 preset', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('入栈顺序'), { target: { value: 'a,b,c' } });
    fireEvent.change(screen.getByLabelText('目标出栈顺序'), { target: { value: 'c,a,b' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/expected a.*top is b/u);
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('当前栈')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q2 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('入栈顺序')).toHaveValue('a,b,c,d,e,f,g');
    expect(screen.getByLabelText('最小栈容量')).toHaveTextContent('3');
  });

  it('restores custom orders from the URL', () => {
    renderPage('/lab/data-structures?module=stack-capacity&input=x,y,z&output=z,y,x');

    expect(screen.getByLabelText('入栈顺序')).toHaveValue('x,y,z');
    expect(screen.getByLabelText('目标出栈顺序')).toHaveValue('z,y,x');
    expect(screen.getByLabelText('最小栈容量')).toHaveTextContent('3');
  });

  it('opens Q2 practice and the exact knowledge node', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q2' }));
    expect(await screen.findByRole('heading', { name: 'Q2 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q02'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q2 知识节点' })).toBeVisible();
  });
});
