export interface LightboxCrop {
  aspectRatio: string;
  top: string;
  left: string;
  width: string;
}

export interface LightboxImage {
  src: string;
  alt: string;
  crop?: LightboxCrop;
}

export function extractLightboxImageFromElement(
  img: HTMLImageElement,
  fallbackAlt = '图片预览',
): LightboxImage | null {
  const src = img.currentSrc || img.getAttribute('src');
  if (!src) return null;

  const cropContainer = img.closest('.source-inline-crop');
  if (cropContainer instanceof HTMLElement) {
    const aspectRatio = cropContainer.style.aspectRatio?.trim();
    const top = img.style.top?.trim();
    const left = img.style.left?.trim();
    const width = img.style.width?.trim();
    if (aspectRatio && top && left && width) {
      return {
        src,
        alt: img.alt || fallbackAlt,
        crop: { aspectRatio, top, left, width },
      };
    }
  }

  return {
    src,
    alt: img.alt || fallbackAlt,
  };
}

export function extractLightboxImageFromScope(
  scope: HTMLElement | null | undefined,
  fallbackAlt = '选项题图',
): LightboxImage | null {
  if (!scope) return null;
  const img = scope.querySelector<HTMLImageElement>('img.source-inline-image, img');
  if (!img) return null;
  return extractLightboxImageFromElement(img, fallbackAlt);
}
