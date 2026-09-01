import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NetworkLabRouterPage } from './NetworkLabRouterPage';

vi.mock('./NetworkLabPage', () => ({ NetworkLabPage: () => <h1>cidr module</h1> }));
vi.mock('./GbnLabPage', () => ({ GbnLabPage: () => <h1>gbn module</h1> }));
vi.mock('./TcpCongestionLabPage', () => ({ TcpCongestionLabPage: () => <h1>tcp module</h1> }));
vi.mock('./TcpCumulativeAckLabPage', () => ({ TcpCumulativeAckLabPage: () => <h1>tcp ack module</h1> }));
vi.mock('./CsmaCdCollisionLabPage', () => ({ CsmaCdCollisionLabPage: () => <h1>csma module</h1> }));
vi.mock('./QamNyquistLabPage', () => ({ QamNyquistLabPage: () => <h1>qam module</h1> }));
vi.mock('./SwitchForwardingLabPage', () => ({ SwitchForwardingLabPage: () => <h1>switch module</h1> }));
vi.mock('./FtpControlConnectionLabPage', () => ({ FtpControlConnectionLabPage: () => <h1>ftp module</h1> }));

function renderRouter(search: string) {
  return render(<MemoryRouter initialEntries={[`/lab/network${search}`]}><NetworkLabRouterPage /></MemoryRouter>);
}

describe('NetworkLabRouterPage', () => {
  afterEach(cleanup);

  it.each([
    ['?module=cidr&preset=cn408-2009-q37', 'cidr module'],
    ['?module=gbn&preset=cn408-2009-q37', 'gbn module'],
    ['?module=tcp-congestion&preset=cn408-2009-q37', 'tcp module'],
    ['?module=tcp-ack&preset=cn408-2009-q38', 'tcp ack module'],
    ['?module=csma-cd&preset=cn408-2009-q35', 'csma module'],
    ['?module=qam-nyquist&preset=cn408-2009-q34', 'qam module'],
    ['?module=switch-forwarding&preset=cn408-2009-q36', 'switch module'],
    ['?module=ftp-control&preset=cn408-2009-q40', 'ftp module'],
  ])('prefers the recognized module in %s', (search, heading) => {
    renderRouter(search);
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  });

  it.each([
    ['?preset=cn408-2009-q35', 'gbn module'],
    ['?preset=cn408-2009-q37', 'csma module'],
    ['?preset=cn408-2009-q39', 'tcp module'],
    ['?preset=cn408-2009-q38', 'tcp ack module'],
    ['?preset=cn408-2009-q47', 'cidr module'],
    ['?preset=cn408-2009-q34', 'qam module'],
    ['?preset=cn408-2009-q36', 'switch module'],
    ['?preset=cn408-2009-q40', 'ftp module'],
  ])('falls back to a recognized preset in %s', (search, heading) => {
    renderRouter(search);
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  });
});
