import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { PipelineLabPanel } from './PipelineLabPanel';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPanel(path = '/lab?module=pipeline') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<><PipelineLabPanel /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PipelineLabPanel mode selection', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
  });

  it('exposes one pressed mode and moves it with the canonical URL', () => {
    renderPanel();

    const modeGroup = screen.getByLabelText('流水线实验模式');
    const modeButtons = within(modeGroup).getAllByRole('button');
    const dynamicButton = within(modeGroup).getByRole('button', { name: '动态五级流水' });
    const timingButton = within(modeGroup).getByRole('button', { name: '功能段时延' });

    expect(modeButtons).toHaveLength(2);
    expect(modeButtons.every((button) => button.hasAttribute('aria-pressed'))).toBe(true);
    expect(modeButtons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(dynamicButton).toHaveAttribute('aria-pressed', 'true');
    expect(timingButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(timingButton);

    expect(dynamicButton).toHaveAttribute('aria-pressed', 'false');
    expect(timingButton).toHaveAttribute('aria-pressed', 'true');
    expect(modeButtons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(screen.getByLabelText('current URL')).toHaveTextContent(
      '/lab?module=pipeline&mode=timing&preset=cn408-2009-q18-stage-clock',
    );

    fireEvent.click(dynamicButton);

    expect(dynamicButton).toHaveAttribute('aria-pressed', 'true');
    expect(timingButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('current URL')).toHaveTextContent('/lab?module=pipeline');
  });
});
