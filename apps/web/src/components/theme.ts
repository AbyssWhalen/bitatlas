export type Theme = 'day' | 'night';

/** UI preference only; learning data never lives in localStorage. Shared with the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = 'bitatlas.ui.theme';

function isTheme(value: unknown): value is Theme {
  return value === 'day' || value === 'night';
}

export function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** The theme currently in effect: explicit attribute, then stored choice, then the system preference. */
export function currentTheme(): Theme {
  const attribute = document.documentElement.dataset.theme;
  if (isTheme(attribute)) return attribute;
  const stored = storedTheme();
  if (stored) return stored;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the choice still applies for this page load.
  }
}

/**
 * The attribute is also written outside React: the pre-paint script follows system changes and other tabs.
 * Subscribing to it keeps every control in step with what is actually on screen.
 */
export function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  media?.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    media?.removeEventListener('change', onChange);
  };
}
