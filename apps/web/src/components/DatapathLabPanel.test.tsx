import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DatapathLabPanel } from './DatapathLabPanel';

describe('DatapathLabPanel', () => {
  afterEach(cleanup);

  it('shows deterministic control signals and all five stages for the default R-type instruction', () => {
    const { container } = render(<DatapathLabPanel />);

    expect(screen.getByRole('heading', { name: 'RV32I 单周期数据通路' })).toBeVisible();
    expect(screen.getAllByText('add x5, x6, x7')).toHaveLength(2);
    expect(screen.getByText('x5 = 0x0000001e')).toBeVisible();
    expect(container.querySelectorAll('.datapath-stage')).toHaveLength(5);
    expect(screen.getByText('IF')).toBeVisible();
    expect(screen.getByText('ID')).toBeVisible();
    expect(screen.getByText('EX')).toBeVisible();
    expect(screen.getByText('MEM')).toBeVisible();
    expect(screen.getByText('WB')).toBeVisible();
    expect(screen.getByText('RegWrite')).toBeVisible();
    expect(screen.getByText('alu')).toBeVisible();
  });

  it('applies a load preset and exposes the memory-to-writeback path', async () => {
    const user = userEvent.setup();
    const { container } = render(<DatapathLabPanel />);

    await user.selectOptions(screen.getByLabelText('选择数据通路例题'), 'lw x5, 4(x6)');

    expect(screen.getByDisplayValue('lw x5, 4(x6)')).toBeVisible();
    expect(screen.getByText('MemRead')).toBeVisible();
    expect(screen.getByText('memory')).toBeVisible();
    expect(screen.getByText('x5 = 0xffffff80')).toBeVisible();
    expect(container.querySelectorAll('.datapath-stage')[3]).toHaveTextContent('Address0x00001004');
  });

  it('updates branch selection and reports malformed numeric input without a stale trace', async () => {
    const user = userEvent.setup();
    const { container } = render(<DatapathLabPanel />);

    await user.selectOptions(screen.getByLabelText('选择数据通路例题'), 'beq x1, x2, 12');
    expect(screen.getByText('taken')).toBeVisible();
    expect(screen.getByText('Next PC: 0x0000100c')).toBeVisible();

    const rs2 = screen.getByLabelText<HTMLInputElement>('rs2 · x2');
    await user.clear(rs2);
    await user.type(rs2, '8');
    expect(screen.getByText('not taken')).toBeVisible();
    expect(screen.getByText('Next PC: 0x00001004')).toBeVisible();

    const pc = screen.getByLabelText<HTMLInputElement>('PC');
    await user.clear(pc);
    await user.type(pc, 'not-a-number');
    expect(screen.getByRole('alert')).toHaveTextContent('PC 必须是 32 位无符号整数');
    expect(container.querySelectorAll('.datapath-stage')).toHaveLength(0);
  });
});
