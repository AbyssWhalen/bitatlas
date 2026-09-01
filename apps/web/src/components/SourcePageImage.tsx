import { sourcePageAssetId, type SourcePageDocument } from '@408os/domain';
import { ImageOff } from 'lucide-react';
import { useState, type ImgHTMLAttributes } from 'react';
import { useStudy } from '../app/StudyContext';

interface SourcePageImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
  packId: string;
  document: SourcePageDocument;
  page: number;
  alt: string;
}

function SourcePageImageError({ assetId, message, detail }: { assetId: string; message: string; detail: string }) {
  return (
    <div className="source-page-image-error" role="alert" data-source-asset-id={assetId}>
      <ImageOff size={22} aria-hidden="true" />
      <strong>{message}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function SourcePageImage({ packId, document, page, alt, onError, ...imageProps }: SourcePageImageProps) {
  const { assets } = useStudy();
  const assetId = sourcePageAssetId(packId, document, page);
  const asset = assets.get(assetId);
  const [failedPath, setFailedPath] = useState<string | null>(null);

  if (!asset) return <SourcePageImageError assetId={assetId} message={`来源图片未登记：${alt}`} detail={assetId} />;
  if (!asset.mimeType.startsWith('image/')) {
    return <SourcePageImageError assetId={assetId} message={`来源资源不是图片：${alt}`} detail={asset.path} />;
  }
  if (failedPath === asset.path) {
    return <SourcePageImageError assetId={assetId} message={`来源图片加载失败：${alt}`} detail={asset.path} />;
  }

  return (
    <img
      {...imageProps}
      src={asset.path}
      alt={alt}
      onError={(event) => {
        setFailedPath(asset.path);
        onError?.(event);
      }}
    />
  );
}
