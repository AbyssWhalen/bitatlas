import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { CacheLabPanel } from './CacheLabPanel';

describe('CacheLabPanel', () => {
  afterEach(cleanup);

  it('renders the Q14 address as block 4 in Cache set 4', () => {
    const { container } = render(<CacheLabPanel />);
    expect(screen.getByRole('heading', { name: '组相联 Cache' })).toBeVisible();
    expect(container.querySelector('.cache-address-fields .set')).toHaveTextContent('Set · 3 bit1004');
    expect(container.querySelector('.cache-outcome-row')).toHaveTextContent('129 · 块 4');
    expect(container.querySelector('.cache-outcome-row')).toHaveTextContent('组 4 / 路 0');
    expect(container.querySelectorAll('.cache-state-table tbody tr')).toHaveLength(2);
  });

  it('replays the LRU preset and exposes its dirty write-back summary', async () => {
    const user = userEvent.setup();
    const { container } = render(<CacheLabPanel />);
    await user.selectOptions(screen.getByLabelText('选择 Cache 例题'), 'lru');

    expect(container.querySelectorAll('.cache-access-timeline button')).toHaveLength(6);
    expect(container.querySelector('.cache-trace-section')).toHaveTextContent('1 / 6 命中 · 16.7%');
    expect(container.querySelector('.cache-summary-grid')).toHaveTextContent('脏块写回1');

    await user.click(container.querySelectorAll<HTMLButtonElement>('.cache-access-timeline button')[5]!);
    expect(container.querySelector('.cache-outcome-row')).toHaveTextContent('读取地址0 · 块 0');
    expect(container.querySelector('.step-list')).toHaveTextContent('分解地址字段');
  });

  it('accepts H-suffix addresses and reports invalid power-of-two parameters', async () => {
    const user = userEvent.setup();
    const { container } = render(<CacheLabPanel />);
    const trace = screen.getByLabelText('Cache 访存序列');
    await user.clear(trace);
    await user.type(trace, 'R 81H');
    expect(container.querySelector('.cache-outcome-row')).toHaveTextContent('129 · 块 4');

    const lineSize = screen.getByLabelText('Cache 块大小');
    await user.clear(lineSize);
    await user.type(lineSize, '3');
    expect(screen.getByRole('alert')).toHaveTextContent('块大小必须是 2 的正整数次幂');
  });
});
