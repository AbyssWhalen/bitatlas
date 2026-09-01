import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { FilesystemLinksLabPage } from './FilesystemLinksLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q31-session'),
  questions: [{ id: 'cn408-2009-q31', year: 2009, number: 31, reviewStatus: 'needs-review' }],
}));

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

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

function renderPage(path = '/lab/os-memory?module=filesystem-links&preset=cn408-2009-q31') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/os-memory" element={<><FilesystemLinksLabPage /><LocationControls /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q31 单题练习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FilesystemLinksLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the Q31 preset and seven-module OS navigation', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '软硬链接实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('目标文件名')).toHaveValue('F1');
    expect(screen.getByLabelText('符号链接名')).toHaveValue('F2');
    expect(screen.getByLabelText('硬链接名')).toHaveValue('F3');
    expect(screen.getByLabelText('目标 inode 引用计数')).toHaveTextContent('1');
    expect(screen.getByRole('navigation', { name: '操作系统实验模块' }).querySelectorAll('a')).toHaveLength(7);
    expect(screen.getByRole('link', { name: '文件链接' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('目录项 F1')).toHaveAttribute('data-entry-status', 'present');
    expect(screen.getByLabelText('目录项 F2')).toHaveAttribute('data-entry-status', 'absent');
  });

  it('advances to the final dangling-symlink and surviving-hardlink state', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => expect(screen.getByLabelText('目录项 F1')).toHaveAttribute('data-entry-status', 'absent'));
    expect(screen.getByLabelText('目录项 F2')).toHaveAttribute('data-entry-status', 'dangling');
    expect(screen.getByLabelText('目录项 F3')).toHaveAttribute('data-entry-status', 'present');
    expect(screen.getByLabelText('目标 inode 引用计数')).toHaveTextContent('1');
    expect(screen.getByRole('status', { name: '链接解析状态' })).toHaveTextContent(/F2.*悬空.*F3.*仍可访问/u);
  });

  it('fails closed for duplicate or empty names and restores the preset', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('符号链接名'), { target: { value: 'F1' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/distinct|不同/u);
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q31 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('符号链接名')).toHaveValue('F2');
    expect(screen.getByLabelText('转换步骤')).toBeVisible();
  });

  it('keeps custom names synchronized with URL navigation history', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('目标文件名'), { target: { value: 'report' } });
    expect(screen.getByLabelText('当前测试地址')).toHaveTextContent(/target=report/u);
    expect(screen.getByLabelText('目录项 report')).toBeVisible();

    fireEvent.click(screen.getByRole('link', { name: '文件链接' }));
    await waitFor(() => expect(screen.getByLabelText('目标文件名')).toHaveValue('F1'));
    fireEvent.click(screen.getByRole('button', { name: '测试后退' }));
    await waitFor(() => expect(screen.getByLabelText('目标文件名')).toHaveValue('report'));
    fireEvent.click(screen.getByRole('button', { name: '测试前进' }));
    await waitFor(() => expect(screen.getByLabelText('目标文件名')).toHaveValue('F1'));
  });

  it('opens a single-question Q31 practice session', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q31' }));
    expect(await screen.findByRole('heading', { name: 'Q31 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q31'], 'practice');
  });
});
