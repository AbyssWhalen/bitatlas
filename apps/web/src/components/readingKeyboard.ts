export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"], [contenteditable=""], input, textarea, select'));
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a[href], summary, [role="button"], [role="link"]'));
}

export function shouldIgnoreReadingShortcut(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  if (event.isComposing || event.keyCode === 229) return true;
  if (event.ctrlKey || event.altKey || event.metaKey) return true;
  return isEditableTarget(event.target);
}
