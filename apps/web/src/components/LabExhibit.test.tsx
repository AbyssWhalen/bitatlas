import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LabExhibit,
  LabExhibitNotice,
  LabExhibitWorkspace,
} from './LabExhibit';

describe('LabExhibit', () => {
  afterEach(cleanup);

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
});
