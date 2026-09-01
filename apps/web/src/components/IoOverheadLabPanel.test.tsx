import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { IoOverheadLabPanel } from './IoOverheadLabPanel';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPanel(path = '/lab?module=io-overhead&preset=cn408-2009-q43') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<><IoOverheadLabPanel /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IoOverheadLabPanel', () => {
  afterEach(cleanup);

  it('replays Q43 with decimal MB, review boundary, and seven scoring steps', () => {
    const { container } = renderPanel();

    expect(screen.getByRole('heading', { name: '中断与 DMA CPU 开销' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('CPU 频率 MHz')).toHaveValue(500);
    expect(screen.getByLabelText('中断方式 CPU 占用')).toHaveTextContent('2.5%');
    expect(screen.getByLabelText('DMA 方式 CPU 占用')).toHaveTextContent('0.1%');
    expect(screen.getByLabelText('CPU 开销相对降低')).toHaveTextContent('96%');
    expect(screen.getByText(/1 MB = 1,000,000 B/u)).toBeVisible();
    expect(screen.getByText(/DMA 与 CPU 无访存冲突/u)).toBeVisible();
    expect(screen.getByLabelText('转换步骤').querySelectorAll('li')).toHaveLength(1);
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  });

  it('keeps the state card synchronized with step, play, and reset controls', async () => {
    renderPanel();
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('换算每秒 CPU 时钟预算');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('计算每次中断的 CPU 开销');

    fireEvent.click(screen.getByRole('button', { name: '播放步骤' }));
    await waitFor(
      () => expect(screen.getByLabelText('当前推导事件')).not.toHaveTextContent('计算每次中断的 CPU 开销'),
      { timeout: 1_500 },
    );
    fireEvent.click(screen.getByRole('button', { name: '暂停步骤' }));
    fireEvent.click(screen.getByRole('button', { name: '复位步骤' }));
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('换算每秒 CPU 时钟预算');
  });

  it('restores custom parameters from the URL and writes edits back to it', () => {
    renderPanel('/lab?module=io-overhead&cpu=1000&cpi=2&irqRate=1&irqBits=64&irqService=10&irqOther=0&dmaRate=8&dmaBlock=8000&dmaCycles=250');

    expect(screen.getByLabelText('CPU 频率 MHz')).toHaveValue(1000);
    expect(screen.getByLabelText('中断方式 CPU 占用')).toHaveTextContent('0.25%');
    expect(screen.getByLabelText('DMA 方式 CPU 占用')).toHaveTextContent('0.025%');

    fireEvent.change(screen.getByLabelText('CPU 频率 MHz'), { target: { value: '500' } });
    expect(screen.getByLabelText('current URL')).toHaveTextContent('module=io-overhead');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('cpu=500');
    expect(screen.getByLabelText('current URL')).not.toHaveTextContent('preset=');
  });

  it('fails closed for invalid URL input and restores the canonical Q43 preset', () => {
    renderPanel('/lab?module=io-overhead&cpu=not-a-number');

    expect(screen.getByRole('alert')).toHaveTextContent('CPU 频率');
    expect(screen.queryByLabelText('中断方式 CPU 占用')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q43 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('CPU 频率 MHz')).toHaveValue(500);
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=io-overhead&preset=cn408-2009-q43');
  });

  it('shows an explicit overload state without hiding the arithmetic', () => {
    renderPanel('/lab?module=io-overhead&cpu=1&cpi=5&irqRate=1&irqBits=8&irqService=200&irqOther=0&dmaRate=20&dmaBlock=5000&dmaCycles=500');

    expect(screen.getByLabelText('中断方式 CPU 占用')).toHaveTextContent('100000%');
    expect(screen.getAllByText('不可持续').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('DMA 方式 CPU 占用')).toHaveTextContent('200%');
  });
});
