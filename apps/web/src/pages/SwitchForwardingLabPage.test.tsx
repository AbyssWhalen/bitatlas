import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SwitchForwardingLabPage } from './SwitchForwardingLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q36-session'),
  questions: [{ id: 'cn408-2009-q36', year: 2009, number: 36, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-search">{location.pathname}{location.search}</output>;
}

function renderPage(path = '/lab/network?module=switch-forwarding&preset=cn408-2009-q36') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/network" element={<><SwitchForwardingLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q36 单题练习</h1>} />
        <Route path="/knowledge" element={<><h1>Q36 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SwitchForwardingLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the source conclusion and a matched destination MAC', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '以太网交换机转发实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('目的 MAC')).toHaveValue('00:11:22:33:44:55');
    expect(screen.getByLabelText('转发决策')).toHaveTextContent('P3');
    expect(screen.getByLabelText('题目答案')).toHaveTextContent('A');

    const navigation = within(screen.getByRole('navigation', { name: '计算机网络实验模块' }));
    expect(navigation.getAllByRole('link')).toHaveLength(8);
    expect(navigation.getByRole('link', { name: '交换机转发' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps custom destination/table values in the URL and reports a bounded miss', () => {
    renderPage('/lab/network?module=switch-forwarding&destination=aa:bb:cc:dd:ee:ff&table=00:11:22:33:44:55%3DP3');

    expect(screen.getByLabelText('目的 MAC')).toHaveValue('aa:bb:cc:dd:ee:ff');
    expect(screen.getByLabelText('转发决策')).toHaveTextContent('没有匹配项');
    fireEvent.change(screen.getByLabelText('目的 MAC'), { target: { value: '10:20:30:40:50:60' } });
    expect(screen.getByTestId('current-search')).toHaveTextContent('destination=10%3A20%3A30%3A40%3A50%3A60');
    expect(screen.getByLabelText('转发决策')).toHaveTextContent('没有匹配项');
  });

  it('fails closed on malformed table input and restores the preset', () => {
    renderPage('/lab/network?module=switch-forwarding&destination=00:11:22:33:44:55&table=bad-entry');

    expect(screen.getByRole('alert')).toHaveTextContent('转发表');
    expect(screen.queryByLabelText('转发决策')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '恢复 Q36 预设' }));
    expect(screen.getByTestId('current-search')).toHaveTextContent('preset=cn408-2009-q36');
    expect(screen.getByLabelText('转发决策')).toHaveTextContent('P3');
  });

  it('opens the Q36 practice and knowledge deep links', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q36' }));
    expect(await screen.findByRole('heading', { name: 'Q36 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q36'], 'practice');

    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));
    expect(await screen.findByRole('heading', { name: 'Q36 知识节点' })).toBeVisible();
    expect(screen.getByTestId('current-search')).toHaveTextContent('subject=computer-networks');
    expect(screen.getByTestId('current-search')).toHaveTextContent('node=topic-2009-q36');
  });

  it('advances and resets the five-step trace', () => {
    renderPage();
    expect(screen.getByText('1 / 5')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText('2 / 5')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '复位步骤' }));
    expect(screen.getByText('1 / 5')).toBeVisible();
  });
});
