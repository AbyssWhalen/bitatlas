import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ServerDocumentsPage } from './ServerDocumentsPage';

vi.mock('../app/account', () => ({ activeAccount: null }));
vi.mock('../app/documents', () => ({
  documents: {
    list: async () => [512, 1024, 12 * 1024, 1024 * 1024].map((byteLength, i) => ({
      id: String(i), name: `资料 ${i}.pdf`, byteLength, lastPage: 1,
    })),
    isOffline: async () => false,
  },
}));
afterEach(cleanup);

it('displays small PDFs and unit boundaries using the local library units', async () => {
  render(<MemoryRouter><ServerDocumentsPage /></MemoryRouter>);
  const rows = within(await screen.findByRole('region', { name: '共享 PDF' })).getAllByRole('article');
  expect(rows.map((row) => within(row).getByText(/(?:B|MiB)$/).textContent))
    .toEqual(['512 B', '1.0 KB', '12.0 KB', '1.0 MB']);
});
