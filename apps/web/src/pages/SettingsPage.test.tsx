import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';

const study = vi.hoisted(() => ({
  importBackup: vi.fn(async () => undefined),
  installVerifiedPack: vi.fn(async () => undefined),
  exportBackup: vi.fn(async () => '{}'),
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => ({
    packs: [{ id: 'cn408-2009', year: 2009, reviewStatus: 'needs-review' }],
    questions: Array.from({ length: 47 }),
    attempts: [],
    notes: new Map(),
    reviewSummary: { approved: 0, total: 47 },
    contentIssues: [],
    ...study,
  }),
}));

describe('SettingsPage content and backup imports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps verified content installation separate from user backup restore', async () => {
    const confirmRestore = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs).toHaveLength(2);
    expect(screen.getByText('needs-review', { selector: '.warning-text' })).toBeVisible();
    expect(screen.getByText('BACKUP V3')).toBeVisible();

    const packFile = new File(['{"manifest":{}}'], '2009.pack.json', { type: 'application/json' });
    Object.defineProperty(packFile, 'text', { value: vi.fn(async () => '{"manifest":{}}') });
    fireEvent.change(inputs[0]!, { target: { files: [packFile] } });
    await waitFor(() => expect(study.installVerifiedPack).toHaveBeenCalledWith('{"manifest":{}}'));
    expect(study.importBackup).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Verified 题包已校验并激活');

    const backupFile = new File(['{"schemaVersion":1}'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(backupFile, 'text', { value: vi.fn(async () => '{"schemaVersion":1}') });
    fireEvent.change(inputs[1]!, { target: { files: [backupFile] } });
    await waitFor(() => expect(confirmRestore).toHaveBeenCalledWith(expect.stringContaining('替换当前浏览器')));
    await waitFor(() => expect(study.importBackup).toHaveBeenCalledWith('{"schemaVersion":1}'));
  });

  it('does not replace local learning data when backup restore is cancelled', async () => {
    const confirmRestore = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const backupFile = new File(['{"schemaVersion":3}'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(backupFile, 'text', { value: vi.fn(async () => '{"schemaVersion":3}') });

    fireEvent.change(inputs[1]!, { target: { files: [backupFile] } });

    await waitFor(() => expect(confirmRestore).toHaveBeenCalledWith(expect.stringContaining('替换当前浏览器')));
    expect(study.importBackup).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('已取消备份恢复');
  });
});
