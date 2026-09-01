import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkLabPage } from './NetworkLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(),
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => ({
    questions: [{ id: 'cn408-2009-q47', year: 2009, number: 47 }],
    createSession: study.createSession,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current search">{location.search}</output>;
}

function renderNetworkLab(path = '/lab/network?module=cidr&preset=cn408-2009-q47') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NetworkLabPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

async function replaceInput(label: string, value: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText<HTMLInputElement>(label);
  await user.clear(input);
  if (value) await user.type(input, value);
  return input;
}

describe('NetworkLabPage CIDR and route boundaries', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    study.createSession.mockResolvedValue('q47-session');
  });

  it('renders the Q47 aggregation with an icon and keeps the DNS /32 route selected', () => {
    const { container } = renderNetworkLab();

    const equation = container.querySelector('.network-aggregate-equation');
    expect(equation).not.toBeNull();
    expect(equation).toHaveTextContent('202.118.1.0/25');
    expect(equation).toHaveTextContent('202.118.1.128/25');
    expect(equation).toHaveTextContent('202.118.1.0/24');
    expect(equation).not.toHaveTextContent('\\u2192');
    expect(equation?.querySelector('.lucide-arrow-right')).toBeInTheDocument();
    expect(screen.getByText('经 DNS 主机 路由转发')).toBeVisible();
    expect(screen.getByText('255.255.255.255')).toBeVisible();
  });

  it('represents a /0 parent as 32 host bits without an empty prefix segment', async () => {
    renderNetworkLab();

    await replaceInput('父 CIDR', '0.0.0.0/0');

    const parentRuler = screen.getAllByRole('img', { name: /0\.0\.0\.0\/0 的 32 位地址/ })[0];
    const visual = parentRuler?.closest('.network-prefix-visual');
    expect(visual).not.toBeNull();
    expect(visual?.querySelector('.network-prefix-legend .prefix')).not.toBeInTheDocument();
    expect(visual?.querySelector('.network-prefix-legend .host')).toHaveTextContent('主机部分 32 bit');
    expect(visual?.querySelectorAll('.network-bit-ruler > .host')).toHaveLength(32);
  });

  it('represents a /32 parent as 32 prefix bits and reports no traditional host range', async () => {
    renderNetworkLab();

    await replaceInput('父 CIDR', '202.118.3.2/32');

    const parentRuler = screen.getByRole('img', { name: /202\.118\.3\.2\/32 的 32 位地址/ });
    const visual = parentRuler.closest('.network-prefix-visual');
    expect(visual?.querySelector('.network-prefix-legend .prefix')).toHaveTextContent('网络前缀 32 bit');
    expect(visual?.querySelector('.network-prefix-legend .host')).not.toBeInTheDocument();
    expect(screen.getByText('无传统可用主机地址')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('父网络没有足够的地址空间');
  });

  it('rejects non-positive and fractional subnet counts through the core validation', async () => {
    renderNetworkLab();

    await replaceInput('所需子网数', '0');
    expect(screen.getByRole('alert')).toHaveTextContent('子网数必须是有效的正整数');

    await replaceInput('所需子网数', '1.5');
    expect(screen.getByRole('alert')).toHaveTextContent('子网数必须是有效的正整数');
  });

  it('reports malformed LPM addresses and otherwise falls back to the /0 internet route', async () => {
    const { container } = renderNetworkLab();

    await replaceInput('LPM 目的地址', '999.1.1.1');
    expect(screen.getByRole('alert')).toHaveTextContent('IPv4 地址必须由 4 个 0 至 255 的十进制字段组成');

    await replaceInput('LPM 目的地址', '203.0.113.9');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.querySelector('.network-lpm-selected')).toHaveTextContent('经 互联网 路由转发');
  });

  it('restores custom CIDR inputs from the URL and writes edits back without the preset', async () => {
    renderNetworkLab('/lab/network?module=cidr&cidr=10.0.0.0%2F24&subnets=4&destination=203.0.113.9');

    expect(screen.getByLabelText('父 CIDR')).toHaveValue('10.0.0.0/24');
    expect(screen.getByLabelText('所需子网数')).toHaveValue(4);
    expect(screen.getByLabelText('LPM 目的地址')).toHaveValue('203.0.113.9');

    await replaceInput('所需子网数', '2');
    expect(screen.getByLabelText('current search')).toHaveTextContent('module=cidr');
    expect(screen.getByLabelText('current search')).toHaveTextContent('cidr=10.0.0.0%2F24');
    expect(screen.getByLabelText('current search')).toHaveTextContent('subnets=2');
    expect(screen.getByLabelText('current search')).not.toHaveTextContent('preset=');

    const navigation = screen.getByRole('navigation', { name: '计算机网络实验模块' });
    expect(navigation).toBeVisible();
    expect(screen.getByRole('link', { name: 'CIDR / LPM' })).toHaveAttribute('aria-current', 'page');
  });
});
