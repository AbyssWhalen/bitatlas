import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CpuLabPage } from './CpuLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q43-session'),
  questions: [
    { id: 'cn408-2009-q15', year: 2009, number: 15, reviewStatus: 'needs-review' },
    { id: 'cn408-2009-q43', year: 2009, number: 43, reviewStatus: 'needs-review' },
    { id: 'cn408-2009-q44', year: 2009, number: 44, reviewStatus: 'needs-review' },
    { id: 'cn408-2009-q20', year: 2009, number: 20, reviewStatus: 'needs-review' },
  ],
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<><CpuLabPage /><LocationProbe /></>} />
        <Route path="/practice/:sessionId" element={<h1>Q43 单题练习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function expectPressedGroup(buttons: HTMLElement[], active: HTMLElement) {
  expect(buttons.every((button) => button.hasAttribute('aria-pressed'))).toBe(true);
  expect(buttons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  expect(active).toHaveAttribute('aria-pressed', 'true');
}

describe('CpuLabPage I/O overhead routing', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('keeps eleven CPU modules and selects I/O overhead from an explicit module', () => {
    renderPage('/lab?module=io-overhead&preset=unknown');

    const tabs = screen.getByRole('navigation', { name: '实验类型' });
    expect(within(tabs).getAllByRole('button')).toHaveLength(11);
    expect(within(tabs).getByRole('button', { name: 'I/O 开销' })).toHaveClass('active');
    expect(screen.getByRole('heading', { name: '中断与 DMA CPU 开销' })).toBeVisible();
  });

  it('exposes exactly one pressed module and moves it when the module changes', () => {
    renderPage('/lab?module=io-overhead&preset=unknown');

    const tabs = screen.getByRole('navigation', { name: '实验类型' });
    const moduleButtons = within(tabs).getAllByRole('button');
    const ioButton = within(tabs).getByRole('button', { name: 'I/O 开销' });
    const cacheButton = within(tabs).getByRole('button', { name: 'Cache 映射' });

    expect(moduleButtons).toHaveLength(11);
    expect(moduleButtons.every((button) => button.hasAttribute('aria-pressed'))).toBe(true);
    expect(moduleButtons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(ioButton).toHaveAttribute('aria-pressed', 'true');
    expect(cacheButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(cacheButton);

    expect(ioButton).toHaveAttribute('aria-pressed', 'false');
    expect(cacheButton).toHaveAttribute('aria-pressed', 'true');
    expect(moduleButtons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });

  it('exposes pressed state for signed-integer direction and bit-width controls', () => {
    renderPage('/lab?module=signed');

    const encodeButton = screen.getByRole('button', { name: '真值 → 机器数' });
    const decodeButton = screen.getByRole('button', { name: '机器数 → 真值' });
    const width8Button = screen.getByRole('button', { name: '8 bit' });
    const width16Button = screen.getByRole('button', { name: '16 bit' });
    const width32Button = screen.getByRole('button', { name: '32 bit' });

    expectPressedGroup([encodeButton, decodeButton], encodeButton);
    expectPressedGroup([width8Button, width16Button, width32Button], width8Button);

    fireEvent.click(decodeButton);
    fireEvent.click(width16Button);

    expect(decodeButton).toHaveAttribute('aria-pressed', 'true');
    expect(encodeButton).toHaveAttribute('aria-pressed', 'false');
    expect(width16Button).toHaveAttribute('aria-pressed', 'true');
    expect(width8Button).toHaveAttribute('aria-pressed', 'false');
    expect(width32Button).toHaveAttribute('aria-pressed', 'false');
  });

  it('exposes pressed state for IEEE 754 direction controls', () => {
    renderPage('/lab?module=float32');

    const encodeButton = screen.getByRole('button', { name: '十进制 → 位串' });
    const decodeButton = screen.getByRole('button', { name: '位串 → 十进制' });
    expectPressedGroup([encodeButton, decodeButton], encodeButton);

    fireEvent.click(decodeButton);

    expect(decodeButton).toHaveAttribute('aria-pressed', 'true');
    expect(encodeButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('exposes pressed state for RV32I direction controls', () => {
    renderPage('/lab?module=riscv');

    const encodeButton = screen.getByRole('button', { name: '汇编 → 机器码' });
    const decodeButton = screen.getByRole('button', { name: '机器码 → 汇编' });
    expectPressedGroup([encodeButton, decodeButton], encodeButton);

    fireEvent.click(decodeButton);

    expect(decodeButton).toHaveAttribute('aria-pressed', 'true');
    expect(encodeButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back from the Q43 preset only when module is absent', () => {
    renderPage('/lab?preset=cn408-2009-q43');
    expect(screen.getByRole('heading', { name: '中断与 DMA CPU 开销' })).toBeVisible();

    cleanup();
    renderPage('/lab?module=cache&preset=cn408-2009-q43');
    expect(screen.getByRole('heading', { name: '组相联 Cache' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '中断与 DMA CPU 开销' })).not.toBeInTheDocument();
  });

  it('fails closed to radix when an invalid module conflicts with the Q43 preset', () => {
    renderPage('/lab?module=unknown&preset=cn408-2009-q43');
    expect(screen.getByRole('heading', { name: '进制解析' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '中断与 DMA CPU 开销' })).not.toBeInTheDocument();
  });

  it('writes the canonical module URL when its tab is selected', () => {
    renderPage('/lab?module=cache&preset=cn408-2009-q43');
    fireEvent.click(screen.getByRole('button', { name: 'I/O 开销' }));
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=io-overhead');
  });

  it('starts the exact Q43 practice session from the selected module', async () => {
    renderPage('/lab?module=io-overhead&preset=cn408-2009-q43');
    fireEvent.click(screen.getByRole('button', { name: '相关真题 1 题' }));

    expect(await screen.findByRole('heading', { name: 'Q43 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q43'], 'practice');
  });

  it('routes Q15 from an explicit module or a preset without module', () => {
    renderPage('/lab?module=memory-expansion&preset=unknown');
    expect(screen.getByRole('heading', { name: '存储器芯片扩展' })).toBeVisible();
    expect(screen.getByRole('button', { name: '存储扩展' })).toHaveClass('active');

    cleanup();
    renderPage('/lab?preset=cn408-2009-q15');
    expect(screen.getByRole('heading', { name: '存储器芯片扩展' })).toBeVisible();
  });

  it('keeps a valid module above Q15 preset fallback and fails closed for an invalid module', () => {
    renderPage('/lab?module=cache&preset=cn408-2009-q15');
    expect(screen.getByRole('heading', { name: '组相联 Cache' })).toBeVisible();

    cleanup();
    renderPage('/lab?module=unknown&preset=cn408-2009-q15');
    expect(screen.getByRole('heading', { name: '进制解析' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '存储器芯片扩展' })).not.toBeInTheDocument();
  });

  it('writes the canonical Q15 URL and starts its exact practice session', async () => {
    renderPage('/lab?module=cache');
    fireEvent.click(screen.getByRole('button', { name: '存储扩展' }));
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=memory-expansion&preset=cn408-2009-q15');

    fireEvent.click(screen.getByRole('button', { name: '相关真题 1 题' }));
    expect(await screen.findByRole('heading', { name: 'Q43 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q15'], 'practice');
  });

  it('routes Q44 from an explicit module or its preset without overriding a valid module', () => {
    renderPage('/lab?module=micro-operations&preset=unknown&schedule=parallel-5');
    expect(screen.getByRole('heading', { name: '数据通路微操作调度' })).toBeVisible();
    expect(screen.getByRole('button', { name: '微操作调度' })).toHaveClass('active');

    cleanup();
    renderPage('/lab?preset=cn408-2009-q44&schedule=split-6');
    expect(screen.getByRole('heading', { name: '数据通路微操作调度' })).toBeVisible();

    cleanup();
    renderPage('/lab?module=cache&preset=cn408-2009-q44&schedule=parallel-5');
    expect(screen.getByRole('heading', { name: '组相联 Cache' })).toBeVisible();

    cleanup();
    renderPage('/lab?module=unknown&preset=cn408-2009-q44&schedule=parallel-5');
    expect(screen.getByRole('heading', { name: '进制解析' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '数据通路微操作调度' })).not.toBeInTheDocument();
  });

  it('writes the canonical Q44 URL and starts its exact practice session', async () => {
    renderPage('/lab?module=cache');
    fireEvent.click(screen.getByRole('button', { name: '微操作调度' }));
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5');

    fireEvent.click(screen.getByRole('button', { name: '相关真题 1 题' }));
    expect(await screen.findByRole('heading', { name: 'Q43 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q44'], 'practice');
  });

  it('routes Q20 from its preset and starts its exact practice session', async () => {
    renderPage('/lab?preset=cn408-2009-q20');
    expect(screen.getByRole('heading', { name: '总线带宽' })).toBeVisible();
    expect(screen.getByRole('button', { name: '总线带宽' })).toHaveClass('active');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?preset=cn408-2009-q20');

    fireEvent.click(screen.getByRole('button', { name: '相关真题 1 题' }));
    expect(await screen.findByRole('heading', { name: 'Q43 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q20'], 'practice');
  });
});
