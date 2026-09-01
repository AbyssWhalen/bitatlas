import { useEffect, useRef, useState } from 'react';
import { constrainCanvasOutputScale, type PDFDocumentProxy } from '../app/pdf-runtime';

interface PdfPageCanvasProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  fitWidth: boolean;
  zoom: number;
}

export function PdfPageCanvas({ document, pageNumber, fitWidth, zoom }: PdfPageCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const updateWidth = () => setAvailableWidth(Math.max(0, host.clientWidth));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || (fitWidth && availableWidth <= 0)) return;
    let cancelled = false;
    let finished = false;
    let page: Awaited<ReturnType<PDFDocumentProxy['getPage']>> | undefined;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    setRendering(true);
    setError(null);

    const cleanupPage = () => {
      const currentPage = page;
      page = undefined;
      if (!currentPage) return;
      try {
        currentPage.cleanup();
      } catch {
        // PDF.js may already have released the page while its document is closing.
      }
    };

    const renderPage = async () => {
      try {
        page = await document.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = fitWidth
          ? Math.min(3, Math.max(0.25, (availableWidth - 2) / baseViewport.width))
          : zoom / 100;
        const viewport = page.getViewport({ scale });
        const desiredOutputScale = Math.min(window.devicePixelRatio || 1, 2);
        const outputScale = constrainCanvasOutputScale(
          viewport.width,
          viewport.height,
          desiredOutputScale,
        );
        const canvas = canvasRef.current;
        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        renderTask = page.render({
          canvas,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });
        await renderTask.promise;
        if (!cancelled) setRendering(false);
      } catch (reason: unknown) {
        if (cancelled || (reason instanceof Error && reason.name === 'RenderingCancelledException')) return;
        setRendering(false);
        setError(reason instanceof Error ? reason.message : 'PDF 页面渲染失败');
      } finally {
        finished = true;
        if (cancelled) cleanupPage();
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // A closing document can make cancellation synchronous; renderPage owns cleanup.
      }
      if (finished) cleanupPage();
    };
  }, [availableWidth, document, fitWidth, pageNumber, zoom]);

  return (
    <div ref={hostRef} className="pdf-page-canvas">
      {rendering && <div className="pdf-canvas-status" role="status"><span className="loader" />渲染第 {pageNumber} 页</div>}
      {error && <div className="pdf-canvas-status error" role="alert">{error}</div>}
      <canvas ref={canvasRef} role="img" aria-label={`PDF 第 ${pageNumber} 页`} />
    </div>
  );
}
