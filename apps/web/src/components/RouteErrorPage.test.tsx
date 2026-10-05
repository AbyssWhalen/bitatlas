import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, it } from 'vitest';
import { RouteErrorPage } from './RouteErrorPage';

it('offers a recovery action when a route module cannot load', async () => {
  const router = createMemoryRouter([{
    path: '/',
    lazy: async () => { throw new TypeError('Failed to fetch dynamically imported module'); },
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <p>载入页面</p>,
  }]);
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole('heading', { name: '页面未能载入' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重新载入页面' })).toBeEnabled();
  expect(screen.queryByText('Unexpected Application Error!')).not.toBeInTheDocument();
  router.dispose();
});
