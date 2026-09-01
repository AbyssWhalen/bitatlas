import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BusBandwidthLabPanel } from './BusBandwidthLabPanel';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPanel(path = '/lab?module=bus-bandwidth&preset=cn408-2009-q20') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<><BusBandwidthLabPanel /><LocationProbe /></>} />
        <Route path="/knowledge" element={<><h1>Q20 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BusBandwidthLabPanel', () => {
  afterEach(cleanup);

  it('replays Q20 with the source parameters and decimal units', () => {
    const { container } = renderPanel();

    expect(screen.getByRole('heading', { name: '总线带宽' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('每总线周期传输 B')).toHaveValue(4);
    expect(screen.getByLabelText('每总线周期占用时钟数')).toHaveValue(2);
    expect(screen.getByLabelText('总线时钟频率 MHz')).toHaveValue(10);
    expect(screen.getByLabelText('总线带宽 MB/s')).toHaveTextContent('20 MB/s');
    expect(screen.getByLabelText('总线带宽 Mbit/s')).toHaveTextContent('160 Mbit/s');
    expect(screen.getByLabelText('题目答案')).toHaveTextContent('B');
    expect(screen.getByText(/1 MHz = 1,000,000 Hz/u)).toBeVisible();
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(screen.getByLabelText('转换步骤').querySelectorAll('li')).toHaveLength(1);
  });

  it('keeps the current derivation synchronized with step and reset controls', async () => {
    renderPanel();
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('把总线频率换算为 Hz');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('计算一个时钟周期');

    fireEvent.click(screen.getByRole('button', { name: '播放步骤' }));
    await waitFor(
      () => expect(screen.getByLabelText('当前推导事件')).not.toHaveTextContent('计算一个时钟周期'),
      { timeout: 1_500 },
    );
    fireEvent.click(screen.getByRole('button', { name: '暂停步骤' }));
    fireEvent.click(screen.getByRole('button', { name: '复位步骤' }));
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('把总线频率换算为 Hz');
  });

  it('restores custom parameters from the URL and writes edits back to it', () => {
    renderPanel('/lab?module=bus-bandwidth&bytes=8&clocks=4&frequency=25');

    expect(screen.getByLabelText('每总线周期传输 B')).toHaveValue(8);
    expect(screen.getByLabelText('总线带宽 MB/s')).toHaveTextContent('50 MB/s');

    fireEvent.change(screen.getByLabelText('总线时钟频率 MHz'), { target: { value: '20' } });
    expect(screen.getByLabelText('current URL')).toHaveTextContent('module=bus-bandwidth');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('frequency=20');
    expect(screen.getByLabelText('current URL')).not.toHaveTextContent('preset=');
  });

  it('fails closed for invalid input and restores the canonical preset', () => {
    renderPanel('/lab?module=bus-bandwidth&bytes=0&clocks=2&frequency=10');

    expect(screen.getByRole('alert')).toHaveTextContent('每总线周期传输');
    expect(screen.queryByLabelText('总线带宽 MB/s')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q20 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('总线带宽 MB/s')).toHaveTextContent('20 MB/s');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('module=bus-bandwidth&preset=cn408-2009-q20');
  });

  it('opens the exact Q20 knowledge node', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));

    expect(await screen.findByRole('heading', { name: 'Q20 知识节点' })).toBeVisible();
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/knowledge?subject=computer-organization&node=topic-2009-q20');
  });
});
