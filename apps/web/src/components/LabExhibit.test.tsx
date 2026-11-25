import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudySession } from '@408os/domain';
import { storage } from '../app/storage';
import {
  LabExhibit,
  LabExhibitNotice,
  LabExhibitWorkspace,
} from './LabExhibit';
import { clearPracticeLabReturn, PRACTICE_LAB_RETURN_STORAGE_KEY } from './practiceLabReturn';

describe('LabExhibit', () => {
  afterEach(() => {
    cleanup();
    clearPracticeLabReturn();
    vi.restoreAllMocks();
  });

  it('renders title, controls, dark canvas, step notes, and lab-exhibit-page marker class', () => {
    const { container } = render(
      <LabExhibit
        pageClassName="sample-lab-page"
        subjectLabel="数据结构实验"
        title="样例实验室"
        description="验证展厅外壳的四个槽位结构。"
        headerAction={<button type="button">练习原题</button>}
        navigation={<nav aria-label="样例模块导航"><a href="#a">模块 A</a></nav>}
        notice={<LabExhibitNotice label="本地练习预设" badge="needs-review" note="仅用于验证边界。" />}
        subheading={<span>样例小标题</span>}
        controls={<section aria-label="参数区">参数控件</section>}
        status={<div aria-label="当前事件">第 1 步</div>}
        canvas={<div aria-label="画布区">图形内容</div>}
        steps={<aside aria-label="步骤区">步骤列表</aside>}
      />,
    );

    const root = container.firstElementChild;
    expect(root).toHaveClass('page', 'lab-exhibit-page', 'sample-lab-page');
    expect(screen.getByRole('heading', { level: 1, name: '样例实验室' })).toBeVisible();
    expect(screen.getByRole('button', { name: '练习原题' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: '样例模块导航' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('参数区').closest('.lab-exhibit-controls')).not.toBeNull();
    expect(screen.getByLabelText('当前事件').closest('.lab-exhibit-status')).not.toBeNull();
    expect(screen.getByLabelText('画布区').closest('.lab-exhibit-canvas')).toHaveAttribute('data-exhibit-canvas', 'dark');
    expect(screen.getByLabelText('步骤区').closest('.lab-exhibit-steps')).not.toBeNull();
  });

  it('omits canvas and steps wrappers when optional slots are absent', () => {
    const { container } = render(
      <LabExhibit
        subjectLabel="操作系统实验"
        title="异常态实验室"
        description="输入无效时仅展示参数与错误提示。"
        controls={<div role="alert">输入无效</div>}
      />,
    );

    expect(container.querySelector('.lab-exhibit-canvas')).toBeNull();
    expect(container.querySelector('.lab-exhibit-steps')).toBeNull();
    expect(container.querySelector('.lab-exhibit-body')).toHaveClass('no-steps');
    expect(screen.getByRole('alert')).toHaveTextContent('输入无效');
  });

  it('supports host mode with an embedded canvas-first workspace', () => {
    const { container } = render(
      <LabExhibit
        pageClassName="cpu-lab-page"
        subjectLabel="组成原理实验"
        title="CPU 可视化实验室"
        description="宿主页负责标题和导航。"
      >
        <LabExhibitWorkspace
          mobileOrder="canvas-first"
          controls={<section aria-label="子面板参数">输入</section>}
          canvas={<div aria-label="子面板画布">图形</div>}
          steps={<aside aria-label="子面板步骤">步骤</aside>}
        />
      </LabExhibit>,
    );

    expect(container.firstElementChild).toHaveClass('page', 'lab-exhibit-page', 'cpu-lab-page');
    expect(container.querySelector('.lab-exhibit-host-body')).not.toBeNull();
    expect(container.querySelector('.lab-exhibit-body')).toHaveClass('canvas-first');
    expect(screen.getByLabelText('子面板画布').closest('.lab-exhibit-canvas')).toHaveAttribute('data-exhibit-canvas', 'dark');
  });

  it('retains the practice return bar across lab URL query overwrites and hides it when the session is completed', async () => {
    const user = userEvent.setup();
    const openSession: StudySession = {
      id: 'sess-open',
      mode: 'practice',
      questionIds: ['q1', 'q2', 'q3', 'q4'],
      questionContentVersions: { q1: 'v1', q2: 'v1', q3: 'v1', q4: 'v1' },
      currentIndex: 2,
      responses: {},
      submittedQuestionIds: ['q1'],
      startedAt: '2026-11-25T00:00:00.000Z',
      updatedAt: '2026-11-25T00:01:00.000Z',
    };
    const getSessionSpy = vi.spyOn(storage.studyRepository, 'getSession').mockImplementation(async (id: string) => (
      id === 'sess-open' ? openSession : undefined
    ));

    function MutatingLabRoute() {
      const [, setSearchParams] = useSearchParams();
      return (
        <LabExhibit
          subjectLabel="网络实验"
          title="滑动窗口实验室"
          description="改写查询参数后仍保留返回入口。"
          controls={(
            <button type="button" onClick={() => setSearchParams({ module: 'gbn', windowSize: '5' })}>
              改写实验参数
            </button>
          )}
        />
      );
    }

    render(
      <MemoryRouter initialEntries={['/lab/network?module=gbn&fromSession=sess-open']}>
        <Routes>
          <Route path="/lab/network" element={<MutatingLabRoute />} />
          <Route path="/practice/:sessionId" element={<h1>已回到原练习会话</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    const returnBtn = await screen.findByRole('button', { name: '← 返回刚才的练习（第 3 / 4 题）' });
    expect(returnBtn).toBeVisible();
    expect(globalThis.sessionStorage.getItem(PRACTICE_LAB_RETURN_STORAGE_KEY)).toBe('sess-open');

    // Lab overwrites URL search params removing fromSession; banner must remain visible via sessionStorage
    await user.click(screen.getByRole('button', { name: '改写实验参数' }));
    expect(screen.getByRole('button', { name: '← 返回刚才的练习（第 3 / 4 题）' })).toBeVisible();

    // Clicking return navigates back to /practice/sess-open and clears sessionStorage
    await user.click(screen.getByRole('button', { name: '← 返回刚才的练习（第 3 / 4 题）' }));
    expect(await screen.findByRole('heading', { name: '已回到原练习会话' })).toBeVisible();
    expect(globalThis.sessionStorage.getItem(PRACTICE_LAB_RETURN_STORAGE_KEY)).toBeNull();

    // Completed session must not render the return bar
    getSessionSpy.mockResolvedValueOnce({ ...openSession, completedAt: '2026-11-25T00:05:00.000Z' });
    cleanup();
    render(
      <MemoryRouter initialEntries={['/lab/network?module=gbn&fromSession=sess-open']}>
        <Routes>
          <Route path="/lab/network" element={<MutatingLabRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(getSessionSpy).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /返回刚才的练习/ })).not.toBeInTheDocument();
  });
});
