import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MemoryExpansionLabPanel } from './MemoryExpansionLabPanel';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPanel(path = '/lab?module=memory-expansion&preset=cn408-2009-q15') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<><MemoryExpansionLabPanel /><LocationProbe /></>} />
        <Route path="/knowledge" element={<><h1>Q15 知识节点</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemoryExpansionLabPanel', () => {
  afterEach(cleanup);

  it('replays Q15 as exact ROM and RAM chip matrices', () => {
    const { container } = renderPanel();

    expect(screen.getByRole('heading', { name: '存储器芯片扩展' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByLabelText('主存总容量 B')).toHaveValue(64 * 1_024);
    expect(screen.getByLabelText('ROM 容量 B')).toHaveValue(4 * 1_024);
    expect(screen.getByLabelText('ROM 芯片字数')).toHaveValue(2 * 1_024);
    expect(screen.getByLabelText('ROM 芯片位宽 bit')).toHaveValue(8);
    expect(screen.getByLabelText('RAM 芯片字数')).toHaveValue(4 * 1_024);
    expect(screen.getByLabelText('RAM 芯片位宽 bit')).toHaveValue(4);
    expect(screen.getByLabelText('容量分区')).toHaveTextContent('64 KB');
    expect(screen.getByLabelText('容量分区')).toHaveTextContent('ROM4 KB');
    expect(screen.getByLabelText('容量分区')).toHaveTextContent('RAM60 KB');
    expect(screen.getByLabelText('ROM 扩展结果')).toHaveTextContent('位扩展1');
    expect(screen.getByLabelText('ROM 扩展结果')).toHaveTextContent('字扩展2');
    expect(screen.getByLabelText('ROM 扩展结果')).toHaveTextContent('2 片');
    expect(screen.getByLabelText('RAM 扩展结果')).toHaveTextContent('位扩展2');
    expect(screen.getByLabelText('RAM 扩展结果')).toHaveTextContent('字扩展15');
    expect(screen.getByLabelText('RAM 扩展结果')).toHaveTextContent('30 片');
    expect(screen.getByLabelText('总芯片数')).toHaveTextContent('32');
    expect(screen.getByLabelText('题目答案')).toHaveTextContent('D');
    expect(screen.getByText('容量守恒')).toBeVisible();
    expect(container.querySelectorAll('[data-memory-chip]')).toHaveLength(32);
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(screen.getByLabelText('转换步骤').querySelectorAll('li')).toHaveLength(1);
  });

  it('keeps the current derivation synchronized with step, play, and reset controls', async () => {
    renderPanel();
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('划分 ROM 与 RAM 容量');

    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('计算 ROM 位扩展');

    fireEvent.click(screen.getByRole('button', { name: '播放步骤' }));
    await waitFor(
      () => expect(screen.getByLabelText('当前推导事件')).not.toHaveTextContent('计算 ROM 位扩展'),
      { timeout: 1_500 },
    );
    fireEvent.click(screen.getByRole('button', { name: '暂停步骤' }));
    fireEvent.click(screen.getByRole('button', { name: '复位步骤' }));
    expect(screen.getByLabelText('当前推导事件')).toHaveTextContent('划分 ROM 与 RAM 容量');
  });

  it('restores custom byte parameters from the URL and writes edits back to it', () => {
    renderPanel('/lab?module=memory-expansion&totalBytes=24576&romBytes=8192&romWords=1024&romBits=4&ramWords=2048&ramBits=8');

    expect(screen.getByLabelText('主存总容量 B')).toHaveValue(24 * 1_024);
    expect(screen.getByLabelText('ROM 扩展结果')).toHaveTextContent('16 片');
    expect(screen.getByLabelText('RAM 扩展结果')).toHaveTextContent('8 片');

    fireEvent.change(screen.getByLabelText('主存总容量 B'), { target: { value: '32768' } });
    expect(screen.getByLabelText('current URL')).toHaveTextContent('module=memory-expansion');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('totalBytes=32768');
    expect(screen.getByLabelText('current URL')).not.toHaveTextContent('preset=');
  });

  it('fails closed for incompatible input and restores the canonical Q15 preset', () => {
    renderPanel('/lab?module=memory-expansion&totalBytes=65536&romBytes=4096&romWords=2048&romBits=3&ramWords=4096&ramBits=4');

    expect(screen.getByRole('alert')).toHaveTextContent('ROM 芯片位宽');
    expect(screen.queryByLabelText('总芯片数')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ROM 扩展结果')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q15 预设' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('总芯片数')).toHaveTextContent('32');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=memory-expansion&preset=cn408-2009-q15');
  });

  it('opens the exact Q15 knowledge node', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '查看知识节点' }));

    expect(await screen.findByRole('heading', { name: 'Q15 知识节点' })).toBeVisible();
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/knowledge?subject=computer-organization&node=topic-2009-q15');
  });
});
