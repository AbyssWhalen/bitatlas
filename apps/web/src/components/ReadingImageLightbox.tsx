import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LightboxCrop, LightboxImage } from './readingImageLightboxUtils';

export type { LightboxCrop, LightboxImage };

interface ReadingImageLightboxProps {
  image: LightboxImage | null;
  onClose: () => void;
  getRestoreFocusTarget?: () => HTMLElement | null;
}

const ZOOM_STEPS = [1, 1.5, 2] as const;

export function ReadingImageLightbox({ image, onClose, getRestoreFocusTarget }: ReadingImageLightboxProps) {
  const [zoomState, setZoomState] = useState<{ key: string | null; index: number }>({ key: null, index: 0 });
  const [modeState, setModeState] = useState<{ key: string | null; showFullPage: boolean }>({
    key: null,
    showFullPage: false,
  });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreTargetGetterRef = useRef(getRestoreFocusTarget);

  useEffect(() => {
    restoreTargetGetterRef.current = getRestoreFocusTarget;
  }, [getRestoreFocusTarget]);

  useEffect(() => {
    if (!image) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      const explicitTarget = restoreTargetGetterRef.current?.();
      const target = explicitTarget && explicitTarget.isConnected ? explicitTarget : previousActive;
      if (target && target.isConnected) target.focus();
    };
  }, [image, onClose]);

  if (!image) return null;

  const imageKey = `${image.src}|${image.crop?.top ?? ''}|${image.crop?.left ?? ''}|${image.crop?.width ?? ''}`;
  const zoomIndex = zoomState.key === imageKey ? zoomState.index : 0;
  const showFullPage = !image.crop || (modeState.key === imageKey && modeState.showFullPage);
  const scale = ZOOM_STEPS[zoomIndex] ?? 1;
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_STEPS.length - 1;
  const updateZoom = (index: number) => setZoomState({ key: imageKey, index });

  return (
    <div
      ref={dialogRef}
      className="rl-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="放大查看图片"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="rl-lightbox-bar">
        <span className="rl-lightbox-caption">{image.alt || '图片预览'}</span>
        <div className="rl-lightbox-controls">
          {image.crop && (
            <button
              type="button"
              className="secondary-command rl-secondary-btn rl-lightbox-mode-btn"
              onClick={() => {
                setModeState({ key: imageKey, showFullPage: !showFullPage });
                updateZoom(0);
              }}
            >
              <span>{showFullPage ? '仅看局部题图' : '查看整页原卷'}</span>
            </button>
          )}
          <button
            type="button"
            className="rl-icon-btn"
            disabled={!canZoomOut}
            aria-label="缩小"
            title="缩小"
            onClick={() => updateZoom(Math.max(0, zoomIndex - 1))}
          >
            <ZoomOut size={17} aria-hidden="true" />
          </button>
          <span className="rl-lightbox-scale">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="rl-icon-btn"
            disabled={!canZoomIn}
            aria-label="放大"
            title="放大"
            onClick={() => updateZoom(Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1))}
          >
            <ZoomIn size={17} aria-hidden="true" />
          </button>
          {zoomIndex > 0 && (
            <button
              type="button"
              className="rl-icon-btn"
              aria-label="还原比例"
              title="还原比例"
              onClick={() => updateZoom(0)}
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            className="rl-icon-btn"
            aria-label="关闭大图"
            title="关闭大图"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="rl-lightbox-stage"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {!showFullPage && image.crop ? (
          <div
            className={zoomIndex > 0 ? 'rl-lightbox-crop-frame is-zoomed' : 'rl-lightbox-crop-frame'}
            style={{
              aspectRatio: image.crop.aspectRatio,
              width: `min(92vw, ${Math.round(520 * scale)}px)`,
            }}
            onClick={() => updateZoom((zoomIndex + 1) % ZOOM_STEPS.length)}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="rl-lightbox-crop-img"
              style={{
                position: 'absolute',
                top: image.crop.top,
                left: image.crop.left,
                width: image.crop.width,
                maxWidth: 'none',
                maxHeight: 'none',
              }}
            />
          </div>
        ) : (
          <img
            src={image.src}
            alt={image.alt}
            className={zoomIndex > 0 ? 'rl-lightbox-img is-zoomed' : 'rl-lightbox-img'}
            style={zoomIndex > 0 ? { width: `${Math.round(scale * 100)}%` } : undefined}
            onClick={() => updateZoom((zoomIndex + 1) % ZOOM_STEPS.length)}
          />
        )}
      </div>
    </div>
  );
}
