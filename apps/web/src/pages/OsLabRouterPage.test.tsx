import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OsLabRouterPage } from './OsLabRouterPage';

vi.mock('./SemaphoreLabPage', () => ({
  SemaphoreLabPage: () => <h1>semaphore module</h1>,
}));

vi.mock('./DiskSchedulingLabPage', () => ({
  DiskSchedulingLabPage: () => <h1>disk module</h1>,
}));

vi.mock('./VirtualMemoryLabPage', () => ({
  VirtualMemoryLabPage: () => <h1>memory module</h1>,
}));

vi.mock('./SingleResourceDeadlockLabPage', () => ({
  SingleResourceDeadlockLabPage: () => <h1>deadlock module</h1>,
}));

vi.mock('./FilesystemLinksLabPage', () => ({
  FilesystemLinksLabPage: () => <h1>filesystem links module</h1>,
}));

vi.mock('./SegmentationAddressLabPage', () => ({
  SegmentationAddressLabPage: () => <h1>segmentation address module</h1>,
}));

vi.mock('./HrrnSchedulingLabPage', () => ({
  HrrnSchedulingLabPage: () => <h1>hrrn module</h1>,
}));

function renderRouter(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/lab/os-memory${search}`]}>
      <OsLabRouterPage />
    </MemoryRouter>,
  );
}

describe('OsLabRouterPage', () => {
  afterEach(cleanup);

  it.each([
    ['?module=memory&preset=cn408-2009-q45', 'memory module'],
    ['?module=disk&preset=cn408-2009-q45', 'disk module'],
    ['?module=semaphore&preset=cn408-2009-q29', 'semaphore module'],
    ['?module=deadlock&preset=cn408-2009-q45', 'deadlock module'],
    ['?module=filesystem-links&preset=cn408-2009-q25', 'filesystem links module'],
    ['?module=segmentation-address&preset=cn408-2009-q31', 'segmentation address module'],
    ['?module=hrrn&preset=cn408-2009-q24', 'hrrn module'],
    ['?module=semaphore&preset=cn408-2009-q25', 'semaphore module'],
  ])('prefers the recognized module in %s', (search, heading) => {
    renderRouter(search);
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  });

  it.each([
    ['?preset=cn408-2009-q45', 'semaphore module'],
    ['?preset=cn408-2009-q29', 'disk module'],
    ['?preset=cn408-2009-q46', 'memory module'],
    ['?preset=cn408-2009-q25', 'deadlock module'],
    ['?preset=cn408-2009-q31', 'filesystem links module'],
    ['?preset=cn408-2009-q27', 'segmentation address module'],
    ['?preset=cn408-2009-q24', 'hrrn module'],
  ])('falls back to a recognized preset in %s', (search, heading) => {
    renderRouter(search);
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  });
});
