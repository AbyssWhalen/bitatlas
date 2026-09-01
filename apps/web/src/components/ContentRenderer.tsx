import type { AssetRef, ContentBlock } from '@408os/domain';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Fragment, useState } from 'react';
import { useStudy } from '../app/StudyContext';

type ImageBlock = Extract<ContentBlock, { type: 'image' }>;

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const expression = part.slice(1, -1);
          return (
            <span
              key={`${expression}-${index}`}
              className="inline-math"
              dangerouslySetInnerHTML={{ __html: katex.renderToString(expression, { throwOnError: false, trust: false }) }}
            />
          );
        }
        return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
      })}
    </>
  );
}

function ContentImage({ block, asset, compact }: { block: ImageBlock; asset: AssetRef | undefined; compact: boolean }) {
  const [failedPath, setFailedPath] = useState<string | null>(null);

  if (!asset || failedPath === asset.path) {
    return (
      <p
        className="warning-text"
        role="alert"
        data-missing-asset-id={asset ? undefined : block.assetId}
        data-failed-asset-id={asset ? block.assetId : undefined}
      >
        图片资源不可用：{block.alt}
      </p>
    );
  }

  if (!asset.mimeType.startsWith('image/')) {
    return (
      <p className="warning-text" role="alert" data-unsupported-asset-id={block.assetId}>
        资源不是可显示的图片：{block.alt}
      </p>
    );
  }

  if (!block.crop || !asset.width || !asset.height) {
    return (
      <img
        className="source-inline-image"
        src={asset.path}
        alt={block.alt}
        loading="lazy"
        onError={() => setFailedPath(asset.path)}
      />
    );
  }

  const { x, y, width, height } = block.crop;
  return (
    <div
      className="source-inline-crop"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: compact ? 'min(100%, 240px)' : 'min(100%, 760px)',
        aspectRatio: `${asset.width * width} / ${asset.height * height}`,
        margin: compact ? '8px auto' : '18px auto',
        border: '1px solid #d8ddd8',
        background: '#fff',
      }}
    >
      <img
        className="source-inline-image"
        src={asset.path}
        alt={block.alt}
        loading="eager"
        onError={() => setFailedPath(asset.path)}
        style={{
          position: 'absolute',
          top: `${(-y / height) * 100}%`,
          left: `${(-x / width) * 100}%`,
          width: `${100 / width}%`,
          maxWidth: 'none',
          maxHeight: 'none',
          margin: 0,
          border: 0,
        }}
      />
    </div>
  );
}

export function ContentRenderer({ blocks, compact = false }: { blocks: ContentBlock[]; compact?: boolean }) {
  const { assets } = useStudy();
  return (
    <div className={compact ? 'content-blocks compact' : 'content-blocks'}>
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          return <p key={index}>{block.text.split('\n').map((line, lineIndex) => <Fragment key={lineIndex}><InlineText text={line} />{lineIndex < block.text.split('\n').length - 1 && <br />}</Fragment>)}</p>;
        }
        if (block.type === 'math') {
          return <div key={index} className="display-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(block.expression, { displayMode: block.display ?? true, throwOnError: false, trust: false }) }} />;
        }
        if (block.type === 'code') return <pre key={index}><code>{block.code}</code></pre>;
        if (block.type === 'image') return <ContentImage key={index} block={block} asset={assets.get(block.assetId)} compact={compact} />;
        return (
          <div key={index} className="table-wrap"><table><thead><tr>{block.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
        );
      })}
    </div>
  );
}
