import '@testing-library/jest-dom/vitest';
import { SINGLE_RESOURCE_Q25_PRESET } from '@408os/lab-core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SingleResourceDeadlockLabPage } from './SingleResourceDeadlockLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q25-session'),
  questions: [{ id: 'cn408-2009-q25', year: 2009, number: 25, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function LocationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <div aria-label="当前测试地址">{location.pathname}{location.search}</div>
      <button type="button" onClick={() => void navigate(-1)}>测试后退</button>
      <button type="button" onClick={() => void navigate(1)}>测试前进</button>
    </div>
  );
}

function renderPage(path = '/lab/os-memory?module=deadlock&preset=cn408-2009-q25') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/os-memory" element={<><SingleResourceDeadlockLabPage /><LocationControls /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q25 单题练习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SingleResourceDeadlockLabPage', () => {
  beforeEach(() => {
    study.createSession.mockClear();
  });

  afterEach(cleanup);

  it('renders the Q25 extreme allocation and the seven-module OS navigation', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '单类资源死锁实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('资源总数 R')).toHaveValue('8');
    expect(screen.getByLabelText('进程数量 K')).toHaveValue('4');
    expect(screen.getByLabelText('单进程最大需求 M')).toHaveValue('3');
    expect(screen.getByLabelText('最小死锁进程数')).toHaveTextContent('4');
    expect(screen.getByLabelText('当前可用资源')).toHaveTextContent('0');
    expect(screen.getByRole('status')).toHaveTextContent(/死锁/u);

    const navigation = screen.getByRole('navigation', { name: '操作系统实验模块' });
    expect(navigation.querySelectorAll('a')).toHaveLength(7);
    expect(screen.getByRole('link', { name: '死锁阈值' })).toHaveAttribute('aria-current', 'page');

    const processes = screen.getAllByRole('article', { name: /进程 P[1-4]/u });
    expect(processes).toHaveLength(4);
    for (const process of processes) {
      expect(process).toHaveTextContent(/已占\s*2/u);
      expect(process).toHaveTextContent(/还需\s*1/u);
      expect(process).toHaveTextContent(/等待/u);
    }
  });

  it('restores a safe K = 3 URL and advances its completion trace', async () => {
    renderPage('/lab/os-memory?module=deadlock&resources=8&processes=3&max-demand=3');

    expect(screen.getByLabelText('资源总数 R')).toHaveValue('8');
    expect(screen.getByLabelText('进程数量 K')).toHaveValue('3');
    expect(screen.getByLabelText('单进程最大需求 M')).toHaveValue('3');
    expect(screen.getByLabelText('当前可用资源')).toHaveTextContent('2');
    expect(screen.getByRole('status')).toHaveTextContent(/安全/u);

    const explorer = screen.getByLabelText('转换步骤');
    expect(explorer.querySelectorAll('.step-list > li')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => expect(explorer.querySelectorAll('.step-list > li')).toHaveLength(2));
  });

  it('fails closed for invalid input and restores the Q25 preset', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('资源总数 R'), { target: { value: '0' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/资源总数/u);
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('article', { name: /进程 P/u })).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q25 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('资源总数 R')).toHaveValue(String(SINGLE_RESOURCE_Q25_PRESET.config.totalResources));
    expect(screen.getByLabelText('进程数量 K')).toHaveValue(String(SINGLE_RESOURCE_Q25_PRESET.config.processCount));
    expect(screen.getByLabelText('单进程最大需求 M')).toHaveValue(String(SINGLE_RESOURCE_Q25_PRESET.config.maxDemandPerProcess));
    expect(screen.getByLabelText('转换步骤')).toBeVisible();
  });

  it('keeps custom inputs synchronized with the URL and browser history', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('进程数量 K'), { target: { value: '3' } });
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent(/processes=3/u);
    expect(screen.getByLabelText('当前可用资源')).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('link', { name: '死锁阈值' }));
    await waitFor(() => expect(screen.getByLabelText('进程数量 K')).toHaveValue('4'));
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent(
      '/lab/os-memory?module=deadlock&preset=cn408-2009-q25',
    );

    fireEvent.click(screen.getByRole('button', { name: '测试后退' }));
    await waitFor(() => expect(screen.getByLabelText('进程数量 K')).toHaveValue('3'));
    expect(screen.getByLabelText('当前可用资源')).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: '测试前进' }));
    await waitFor(() => expect(screen.getByLabelText('进程数量 K')).toHaveValue('4'));
    expect(screen.getByRole('status')).toHaveTextContent(/死锁/u);
  });

  it('opens a single-question Q25 practice session', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q25' }));

    expect(await screen.findByRole('heading', { name: 'Q25 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q25'], 'practice');
  });
});
