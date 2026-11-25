import { useEffect, useState } from 'react';
import { BookOpen, CloudOff, Download, FileText, FileUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { documents } from '../app/documents';
import { activeAccount } from '../app/account';
import { api } from '../app/api';
import { useAction } from '../app/useAction';
import type { LibraryDocument } from '../app/document-library';
import { formatFileSize } from '../app/format-file-size';

export function ServerDocumentsPage() {
  const [items, setItems] = useState<LibraryDocument[]>([]);
  const [offline, setOffline] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const action = useAction();
  const refresh = async () => {
    const values = await documents.list(); setItems(values);
    setOffline(new Set((await Promise.all(values.map(async (value) => await documents.isOffline(value.id) ? value.id : null))).filter((id): id is string => Boolean(id))));
  };
  useEffect(() => { void Promise.resolve().then(refresh).catch((reason) => setMessage(String(reason))); }, []);
  const offlineCount = items.filter((item) => offline.has(item.id)).length;
  return <div className="page document-library-page sec-page sec-documents">
    <header className="sec-header">
      <div className="sec-header-main">
        <h1>共享资料库</h1>
        <p className="sec-statement">共 <b>{items.length}</b> 份资料{items.length > 0 && <> · 离线 <span className="sec-mono-num">{offlineCount}</span></>}</p>
        <p className="sec-subtitle">在线按需阅读；需要断网使用的资料可以单独保存。</p>
      </div>
    </header>
    {(action.error || message) && <div className="status-message sec-inline-status" role="status">{action.error || message}</div>}
    {activeAccount?.account.role === 'admin' && <section className="study-panel server-upload" aria-labelledby="server-upload-title">
      <h2 id="server-upload-title">上传资料</h2>
      <p>单份 PDF 不超过 128MiB。中断后重新选择同一文件即可续传，完成后再发布给成员。</p>
      <div className="command-row">
        <label className="secondary-command server-upload-pick"><FileUp size={16} aria-hidden="true" /><span>选择文件</span>
          <input aria-label="上传资料文件" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={action.busy} className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0]; if (!file) return;
            setUploaded(null); void action.run(async () => { setUploaded(await documents.upload(file, setProgress)); });
          }} />
        </label>
        {uploaded && <button className="primary-command" disabled={action.busy} onClick={() => void action.run(async () => {
          await api(`/admin/files/${uploaded}/publish`, {}); setUploaded(null); setMessage('资料已发布，成员可阅读。'); await refresh();
        })}>发布这份资料</button>}
      </div>
      {progress !== null && <div className="server-upload-progress"><div className="task-meter" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div><p role="status">上传进度 {progress}%</p></div>}
    </section>}
    {items.length ? <section className="document-list sec-doc-list" aria-label="共享 PDF">{items.map((item) => <article className="document-row" key={item.id}>
      <span className="sec-doc-icon" aria-hidden="true"><FileText size={20} className="document-file-icon" /></span>
      <div className="document-info"><strong>{item.name}</strong>
        <span><span className="sec-mono-num">{formatFileSize(item.byteLength)}</span> · 上次第 <span className="sec-mono-num">{item.lastPage}</span> 页 · {offline.has(item.id) ? <span className="server-offline-mark">已保存离线副本</span> : '按需读取'}</span></div>
      <div className="document-actions">
        <Link className="secondary-command compact-command" to={`/documents/${item.id}?page=${item.lastPage}`}><BookOpen size={15} aria-hidden="true" />阅读</Link>
        <button className="secondary-command compact-command" disabled={action.busy} onClick={() => void action.run(async () => {
          if (offline.has(item.id)) await documents.removeOffline(item.id); else await documents.download(item.id); await refresh();
        })}>{offline.has(item.id) ? <><CloudOff size={15} aria-hidden="true" />移除离线副本</> : <><Download size={15} aria-hidden="true" />保存供离线阅读</>}</button>
      </div>
    </article>)}</section>
      : <section className="document-empty-state sec-empty-box"><FileText size={28} aria-hidden="true" /><h2>还没有共享资料</h2><p>管理员上传并发布后会显示在这里。</p></section>}
  </div>;
}
