import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MicroOperationsLabPanel } from './MicroOperationsLabPanel';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPanel(path = '/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<><MicroOperationsLabPanel /><LocationProbe /></>} />
        <Route path="/knowledge" element={<><h1>Q44 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MicroOperationsLabPanel', () => {
  afterEach(cleanup);

  it('starts the source-backed five-cycle replay with unknown temporary registers', () => {
    const { container } = renderPanel();

    expect(screen.getByRole('heading', { name: '数据通路微操作调度' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByRole('button', { name: '5 拍并行方案' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '6 拍分步方案' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('R0 初值')).toHaveValue(0x1234);
    expect(screen.getByLabelText('R1 地址')).toHaveValue(0x0100);
    expect(screen.getByLabelText('目标内存字初值')).toHaveValue(0x00ff);
    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('C5');
    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('MAR <- R1');
    expect(screen.getByLabelText('当前寄存器状态')).toHaveTextContent('Aunknown');
    expect(screen.getByLabelText('当前寄存器状态')).toHaveTextContent('ACunknown');
    expect(screen.getByLabelText('当前寄存器状态')).toHaveTextContent('MDRunknown');
    expect(screen.getByLabelText('当前寄存器状态')).toHaveTextContent('MAR0x0100');
    expect(screen.getByLabelText('AB 地址总线')).toHaveTextContent('MARunknown');
    expect(screen.getByLabelText('架构可见结果')).toHaveTextContent('0x1333');
    expect(screen.getByLabelText('架构可见结果')).toHaveTextContent('暂存 A 可能不同');
    expect(screen.getByLabelText('转换步骤')).toHaveTextContent('1 / 5');
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  });

  it('shows the legal DB and internal-bus work together in parallel C6', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('C6');
    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('MDR <- M(MAR)');
    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('A <- R0');
    expect(screen.getByLabelText('AB 地址总线')).toHaveTextContent('MAR0x0100');
    expect(screen.getByLabelText('DB 数据总线')).toHaveTextContent('memory0x00ff');
    expect(screen.getByLabelText('CPU 内总线')).toHaveTextContent('R00x1234');
    expect(screen.getByLabelText('有效控制信号')).toHaveTextContent('MemR');
    expect(screen.getByLabelText('有效控制信号')).toHaveTextContent('MDRinE');
    expect(screen.getByLabelText('有效控制信号')).toHaveTextContent('R0out');
    expect(screen.getByLabelText('有效控制信号')).toHaveTextContent('Ain');
    expect(screen.getByLabelText('当前寄存器状态')).toHaveTextContent('A0x1234');
    expect(screen.getByLabelText('当前寄存器状态')).toHaveTextContent('MDR0x00ff');
    expect(screen.getByLabelText('当前寄存器状态')).toHaveTextContent('ACunknown');
  });

  it('switches to the six-cycle source replay, writes its URL, and resets the active step', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('C7');

    fireEvent.click(screen.getByRole('button', { name: '6 拍分步方案' }));
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=micro-operations&preset=cn408-2009-q44&schedule=split-6');
    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('C5');
    expect(screen.getByLabelText('转换步骤')).toHaveTextContent('1 / 6');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前微操作')).toHaveTextContent('MDR <- M(MAR)');
    expect(screen.getByLabelText('当前微操作')).not.toHaveTextContent('A <- R0');
    expect(screen.getByLabelText('CPU 内总线')).toHaveTextContent('idle');
  });

  it('restores custom URL values, applies 16-bit wraparound, and writes edits back', () => {
    renderPanel('/lab?module=micro-operations&schedule=parallel-5&r0=65535&r1=65535&memoryWord=2');

    expect(screen.getByLabelText('R0 初值')).toHaveValue(65535);
    expect(screen.getByLabelText('R1 地址')).toHaveValue(65535);
    expect(screen.getByLabelText('目标内存字初值')).toHaveValue(2);
    expect(screen.getByLabelText('架构可见结果')).toHaveTextContent('0x0001');

    fireEvent.change(screen.getByLabelText('R0 初值'), { target: { value: '7' } });
    expect(screen.getByLabelText('current URL')).toHaveTextContent('module=micro-operations');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('schedule=parallel-5');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('r0=7');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('r1=65535');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('memoryWord=2');
    expect(screen.getByLabelText('current URL')).not.toHaveTextContent('preset=');
  });

  it('fails closed for an invalid schedule or word and restores the canonical Q44 preset', () => {
    renderPanel('/lab?module=micro-operations&schedule=unknown&r0=1&r1=2&memoryWord=3');

    expect(screen.getByRole('alert')).toHaveTextContent('方案');
    expect(screen.queryByLabelText('当前寄存器状态')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('转换步骤')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q44 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5');

    fireEvent.change(screen.getByLabelText('目标内存字初值'), { target: { value: '65536' } });
    expect(screen.getByRole('alert')).toHaveTextContent('16 位');
    expect(screen.queryByLabelText('当前寄存器状态')).not.toBeInTheDocument();
  });

  it('opens the exact Q44 knowledge node', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));

    expect(await screen.findByRole('heading', { name: 'Q44 知识节点' })).toBeVisible();
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/knowledge?subject=computer-organization&node=topic-2009-q44');
  });
});
