import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockExamPage } from './MockExamPage';

const study = vi.hoisted(() => ({
  packs: [{ id: 'cn408-2009', year: 2009, reviewStatus: 'needs-review', questionCount: 47 }],
  questions: Array.from({ length: 47 }, (_, index) => ({ id: `q${index + 1}`, year: 2009, number: index + 1, reviewStatus: 'verified' })),
  mockExams: [],
  createMockExam: vi.fn(),
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => study,
}));

function LocationProbe() {
  return <output aria-label="location">{useLocation().pathname}</output>;
}

describe('MockExamPage', () => {
  afterEach(() => {
    cleanup();
    study.packs = [{ id: 'cn408-2009', year: 2009, reviewStatus: 'needs-review', questionCount: 47 }];
    study.createMockExam.mockReset();
  });

  it('keeps the fixed paper unavailable while the pack is needs-review', () => {
    render(<MemoryRouter><MockExamPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: '整卷模考' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('尚未完成 47 题人工复核');
    expect(screen.queryByRole('button', { name: /开始.*模考/ })).not.toBeInTheDocument();
  });

  it('starts only an explicitly verified fixed paper and navigates to its persisted exam', async () => {
    study.packs = [{ id: 'cn408-2009', year: 2009, reviewStatus: 'verified', questionCount: 47 }];
    study.createMockExam.mockResolvedValueOnce({ exam: { id: 'exam-1' }, session: {} });
    render(<MemoryRouter><MockExamPage /><LocationProbe /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /开始 180 分钟模考/ }));
    await waitFor(() => expect(study.createMockExam).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText('location')).toHaveTextContent('/mock/exam-1'));
  });

  it('keeps a malformed verified pack unavailable instead of delegating the failure to storage', () => {
    study.packs = [{ id: 'cn408-2009', year: 2009, reviewStatus: 'verified', questionCount: 46 }];
    render(<MemoryRouter><MockExamPage /></MemoryRouter>);

    expect(screen.getByRole('alert')).toHaveTextContent('未满足固定整卷的 47 题契约');
    expect(screen.queryByRole('button', { name: /开始.*模考/ })).not.toBeInTheDocument();
    expect(study.createMockExam).not.toHaveBeenCalled();
  });
});
