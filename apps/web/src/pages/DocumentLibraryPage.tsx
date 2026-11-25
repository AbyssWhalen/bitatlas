import { BookOpen, FileText, FileUp, Pencil, Save, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatFileSize } from '../app/format-file-size';
import {
  CacheDocumentLibrary,
  DocumentLibraryError,
  type LibraryDocument,
} from '../app/document-library';

const documentLibrary = new CacheDocumentLibrary();

function errorMessage(reason: unknown): string {
  if (reason instanceof DocumentLibraryError) return reason.message;
  return reason instanceof Error ? reason.message : '本地资料库操作失败';
}

export function DocumentLibraryPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const capability = documentLibrary.capability();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(capability.supported);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const refresh = async () => {
    setDocuments(await documentLibrary.list());
  };

  useEffect(() => {
    if (!capability.supported) return;
    void Promise.resolve().then(refresh).catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false));
  }, [capability.supported]);

  const importPdf = async (file: File) => {
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const existingIds = new Set(documents.map((document) => document.id));
      const imported = await documentLibrary.importPdf(file);
      await refresh();
      setStatus(existingIds.has(imported.id) ? '该 PDF 已在资料库中' : 'PDF 已导入本地资料库');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const startRename = (document: LibraryDocument) => {
    setEditingId(document.id);
    setEditingName(document.name);
    setStatus(null);
    setError(null);
  };

  const saveRename = async () => {
    if (!editingId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await documentLibrary.rename(editingId, editingName);
      await refresh();
      setEditingId(null);
      setStatus('文档名称已更新');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const removeDocument = async (document: LibraryDocument) => {
    if (!window.confirm(`从当前浏览器移除“${document.name}”？此操作不会影响原文件。`)) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      await documentLibrary.remove(document.id);
      await refresh();
      setStatus('PDF 已从本地资料库移除');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page document-library-page sec-page sec-documents">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>本地资料库</h1>
          <p className="sec-statement">
            已保存 <b>{documents.length}</b> 份 PDF
          </p>
          <p className="sec-subtitle">保存在当前浏览器供离线阅读；不会随学习备份导出。</p>
        </div>
        <div className="sec-header-actions">
          <button type="button" className="primary-command" disabled={!capability.supported || loading || busy} onClick={() => inputRef.current?.click()}>
            <FileUp size={16} aria-hidden="true" />
            <span>{busy ? '处理中' : '导入 PDF'}</span>
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          disabled={loading || busy}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importPdf(file);
            event.currentTarget.value = '';
          }}
        />
      </header>

      {!capability.supported && <div className="sec-inline-alert" role="alert">当前浏览器不支持离线 PDF 资料库。</div>}
      {status && <div className="status-message sec-inline-status" role="status">{status}</div>}
      {error && <div className="sec-inline-alert" role="alert">{error}</div>}

      {loading ? (
        <section className="loading-state sec-empty-box"><span className="loader" /><p>载入本地资料</p></section>
      ) : documents.length === 0 ? (
        <section className="document-empty-state sec-empty-box">
          <FileText size={28} aria-hidden="true" />
          <h2>还没有本地 PDF</h2>
          <p>点击右上角“导入 PDF”即可在浏览器内离线阅读并记住上次页码。</p>
        </section>
      ) : (
        <section className="document-list sec-doc-list" aria-label="本地 PDF">
          {documents.map((document) => (
            <article className="document-row" key={document.id}>
              <span className="sec-doc-icon" aria-hidden="true"><FileText size={20} className="document-file-icon" /></span>
              <div className="document-info">
                {editingId === document.id ? (
                  <label className="document-name-field">
                    <span>文档名称</span>
                    <input aria-label="文档名称" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                  </label>
                ) : (
                  <strong>{document.name}</strong>
                )}
                <span>
                  <span className="sec-mono-num">{formatFileSize(document.byteLength)}</span> · 上次第 <span className="sec-mono-num">{document.lastPage}</span> 页 · {new Date(document.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="document-actions">
                {editingId === document.id ? (
                  <>
                    <button type="button" className="icon-command sec-icon-btn" aria-label="保存名称" disabled={busy} onClick={() => void saveRename()}>
                      <Save size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-command sec-icon-btn" aria-label="取消重命名" onClick={() => setEditingId(null)}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="secondary-command compact-command" aria-label={`阅读 ${document.name}`} onClick={() => navigate(`/documents/${document.id}?page=${document.lastPage}`)}>
                      <BookOpen size={15} aria-hidden="true" />
                      <span>阅读</span>
                    </button>
                    <button type="button" className="icon-command sec-icon-btn" aria-label={`重命名 ${document.name}`} onClick={() => startRename(document)}>
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-command danger sec-icon-btn" aria-label={`移除 ${document.name}`} disabled={busy} onClick={() => void removeDocument(document)}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
