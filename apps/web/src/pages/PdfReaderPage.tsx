import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CacheDocumentLibrary, DocumentLibraryError, type LibraryDocument } from '../app/document-library';
import { getDocument, type PDFDocumentLoadingTask, type PDFDocumentProxy } from '../app/pdf-runtime';
import { PdfPageCanvas } from '../components/PdfPageCanvas';

const documentLibrary = new CacheDocumentLibrary();
const zoomSteps = [60, 80, 100, 125, 150, 175, 200];

function errorMessage(reason: unknown): string {
  if (reason instanceof DocumentLibraryError) return reason.message;
  return reason instanceof Error ? reason.message : 'PDF 阅读器载入失败';
}

function requestedPage(searchParams: URLSearchParams): number | null {
  const raw = searchParams.get('page');
  if (!raw || !/^\d+$/u.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

export function PdfReaderPage() {
  const { documentId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [metadata, setMetadata] = useState<LibraryDocument | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [fitWidth, setFitWidth] = useState(true);
  const [zoom, setZoom] = useState(100);
  const positionQueue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    void Promise.resolve().then(() => {
      if (cancelled) return undefined;
      setLoading(true);
      setError(null);
      setMetadata(null);
      setPdf(null);
      return documentLibrary.get(documentId);
    }).then(async (stored) => {
      if (!stored) {
        if (cancelled) return;
        throw new DocumentLibraryError('not-found', '本地 PDF 不存在或已被移除。');
      }
      // Keep the reader shell usable while PDF.js prepares the document. This
      // makes the title and navigation context available before the canvas is
      // ready, which is especially important for large or offline documents.
      setMetadata(stored);
      const data = await documentLibrary.getBytes(documentId);
      if (cancelled) return;
      loadingTask = await getDocument({ data });
      if (cancelled) {
        await loadingTask.destroy().catch(() => undefined);
        return;
      }
      const loaded = await loadingTask.promise;
      if (cancelled) {
        await loadingTask.destroy().catch(() => undefined);
        return;
      }
      setPdf(loaded);
    }).catch((reason) => {
      if (!cancelled) setError(errorMessage(reason));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      void loadingTask?.destroy().catch(() => undefined);
    };
  }, [documentId]);

  const pageNumber = useMemo(() => {
    if (!metadata) return 1;
    const requested = requestedPage(searchParams) ?? metadata.lastPage;
    return pdf ? Math.min(pdf.numPages, Math.max(1, requested)) : Math.max(1, requested);
  }, [metadata, pdf, searchParams]);

  useEffect(() => {
    if (!pdf || !metadata) return;
    if (searchParams.get('page') !== String(pageNumber)) {
      setSearchParams({ page: String(pageNumber) }, { replace: true });
    }
  }, [metadata, pageNumber, pdf, searchParams, setSearchParams]);

  useEffect(() => {
    if (!pdf || !metadata) return;
    let active = true;
    positionQueue.current = positionQueue.current
      .catch(() => undefined)
      .then(() => documentLibrary.updateLastPage(documentId, pageNumber))
      .then(() => undefined)
      .catch((reason) => {
        if (active) setPositionError(errorMessage(reason));
      });
    return () => { active = false; };
  }, [documentId, metadata, pageNumber, pdf]);

  const goToPage = (nextPage: number) => {
    if (!pdf) return;
    const target = Math.min(pdf.numPages, Math.max(1, nextPage));
    setSearchParams({ page: String(target) });
    setPositionError(null);
  };

  const zoomOut = () => {
    const current = fitWidth ? 100 : zoom;
    const next = [...zoomSteps].reverse().find((step) => step < current) ?? zoomSteps[0]!;
    setFitWidth(false);
    setZoom(next);
  };

  const zoomIn = () => {
    const current = fitWidth ? 100 : zoom;
    const next = zoomSteps.find((step) => step > current) ?? zoomSteps.at(-1)!;
    setFitWidth(false);
    setZoom(next);
  };

  if (loading && !metadata) return <section className="loading-state"><span className="loader" /><p>载入本地 PDF</p></section>;
  if (error || !metadata) {
    return <div className="page pdf-reader-error"><div className="status-message error" role="alert">{error ?? 'PDF 阅读器载入失败'}</div><Link className="secondary-command" to="/documents">返回资料库</Link></div>;
  }

  return (
    <div className="pdf-reader-page">
      <header className="pdf-reader-header">
        <Link className="secondary-command compact-command" to="/documents" aria-label="返回资料库"><ChevronLeft size={16} />资料库</Link>
        <div><span className="eyebrow">LOCAL PDF</span><h1>{metadata.name}</h1></div>
        <div className="pdf-reader-position">
          <button className="icon-command" aria-label="上一页" disabled={!pdf || pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}><ChevronLeft size={18} /></button>
          <label><span className="sr-only">页码</span><input
            key={pageNumber}
            aria-label="页码"
            type="number"
            min={1}
            max={pdf?.numPages}
            defaultValue={pageNumber}
            disabled={!pdf}
            onBlur={(event) => goToPage(Number(event.currentTarget.value))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          /></label>
          <span>{pdf ? `${pageNumber} / ${pdf.numPages}` : '载入中…'}</span>
          <button className="icon-command" aria-label="下一页" disabled={!pdf || pageNumber >= pdf.numPages} onClick={() => goToPage(pageNumber + 1)}><ChevronRight size={18} /></button>
        </div>
        <div className="pdf-zoom-controls">
          <button className="icon-command" aria-label="缩小" onClick={zoomOut}><ZoomOut size={17} /></button>
          <button className={`secondary-command compact-command ${fitWidth ? 'selected' : ''}`} aria-pressed={fitWidth} onClick={() => setFitWidth(true)}><Maximize2 size={15} />适宽</button>
          <button className="icon-command" aria-label="放大" onClick={zoomIn}><ZoomIn size={17} /></button>
          <span>{fitWidth ? '适宽' : `${zoom}%`}</span>
        </div>
      </header>
      {positionError && <div className="pdf-position-error" role="alert">{positionError}</div>}
      <main className="pdf-reader-stage">
        {pdf ? <PdfPageCanvas document={pdf} pageNumber={pageNumber} fitWidth={fitWidth} zoom={zoom} /> : (
          <section className="loading-state pdf-reader-loading"><span className="loader" /><p>解析 PDF 页面</p></section>
        )}
      </main>
    </div>
  );
}
