import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VirtualMemoryLabPage } from './VirtualMemoryLabPage';

vi.mock('../app/StudyContext', () => ({
  useStudy: () => ({
    createSession: vi.fn(),
    questions: [{ id: 'cn408-2009-q46', year: 2009, number: 46 }],
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current search">{location.search}</output>;
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <VirtualMemoryLabPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('VirtualMemoryLabPage URL state', () => {
  afterEach(cleanup);

  it('restores custom addresses and timing parameters and writes edits back without the preset', () => {
    renderPage('/lab/os-memory?module=memory&addresses=0x0000%2C0x1000&tlbNs=5&memoryNs=80&faultNs=9000');

    expect(screen.getByLabelText('虚拟地址序列')).toHaveValue('0x0000,0x1000');
    expect(screen.getByLabelText('TLB 查询时间，纳秒')).toHaveValue('5');
    expect(screen.getByLabelText('主存访问时间，纳秒')).toHaveValue('80');
    expect(screen.getByLabelText('缺页处理时间，纳秒')).toHaveValue('9000');

    fireEvent.change(screen.getByLabelText('主存访问时间，纳秒'), { target: { value: '90' } });
    expect(screen.getByLabelText('current search')).toHaveTextContent('module=memory');
    expect(screen.getByLabelText('current search')).toHaveTextContent('addresses=0x0000%2C0x1000');
    expect(screen.getByLabelText('current search')).toHaveTextContent('memoryNs=90');
    expect(screen.getByLabelText('current search')).not.toHaveTextContent('preset=');

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q46 预设' }));
    expect(screen.getByLabelText('current search')).toHaveTextContent('?module=memory&preset=cn408-2009-q46');
  });
});
