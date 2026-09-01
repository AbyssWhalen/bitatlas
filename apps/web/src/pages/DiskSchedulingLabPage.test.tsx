import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DiskSchedulingLabPage } from './DiskSchedulingLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q29-session'),
  questions: [{ id: 'cn408-2009-q29', year: 2009, number: 29, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function renderPage(path = '/lab/os-memory?module=disk&preset=cn408-2009-q29') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/os-memory" element={<DiskSchedulingLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q29 单题练习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DiskSchedulingLabPage', () => {
  beforeEach(() => {
    study.createSession.mockClear();
  });

  afterEach(cleanup);

  it('renders the Q29 service order without inventing a physical boundary', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '磁盘调度实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getAllByText('110 → 170 → 180 → 195 → 68 → 45 → 35 → 12')).toHaveLength(2);
    expect(screen.getAllByText('物理端点（题设未给磁道号）')).toHaveLength(2);
    expect(screen.getAllByText('无法由题设唯一计算')).toHaveLength(2);
    expect(screen.getAllByText(/未给物理端点/u).length).toBeGreaterThan(0);
  });

  it('restores the selected algorithm and custom configuration from the URL', () => {
    renderPage('/lab/os-memory?module=disk&policy=look&tracks=20%2C40%2C60%2C80&head=50&direction=decreasing&bounds=1&min=0&max=99');

    expect(screen.getByRole('button', { name: 'LOOK' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('待访问磁道')).toHaveValue('20,40,60,80');
    expect(screen.getByLabelText('初始磁头位置')).toHaveValue('50');
    expect(screen.getByLabelText('初始移动方向')).toHaveValue('decreasing');
    expect(screen.getByLabelText('使用物理磁道边界')).toBeChecked();
    expect(screen.getByLabelText('最小磁道')).toHaveValue('0');
    expect(screen.getByLabelText('最大磁道')).toHaveValue('99');
    expect(screen.getAllByText('90 个磁道')).toHaveLength(2);
  });

  it('keeps the disk figure synchronized with StepExplorer controls', async () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-active-track="110"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '播放步骤' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '播放步骤' }));
    expect(screen.getByRole('button', { name: '暂停步骤' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '暂停步骤' }));

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => expect(container.querySelector('[data-active-track="170"]')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '复位步骤' }));
    await waitFor(() => expect(container.querySelector('[data-active-track="110"]')).toBeInTheDocument());
  });

  it('computes SCAN movement only after explicit physical bounds are enabled', () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('使用物理磁道边界'));

    expect(screen.getAllByText('281 个磁道')).toHaveLength(2);
    expect(screen.getAllByText('磁道 199')).toHaveLength(2);
  });

  it('exposes every implemented policy and requires real bounds for C-SCAN', () => {
    const { container } = renderPage();

    expect(container.querySelectorAll('.disk-policy-switch button')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'C-SCAN' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/必须知道物理磁道边界/u);

    fireEvent.click(screen.getByLabelText('使用物理磁道边界'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C-SCAN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('361 个磁道')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'FCFS' }));
    expect(screen.getByRole('button', { name: 'FCFS' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /FCFS 调度轨迹/u })).toBeVisible();
  });

  it('opens a single-question Q29 practice session', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q29' }));

    expect(await screen.findByRole('heading', { name: 'Q29 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q29'], 'practice');
  });
});
