import { useEffect, useState } from 'react';
import type { NoteConflict } from '@408os/domain';
import { useLearning } from '../app/LearningContext';
import { useStudy } from '../app/StudyContext';
import { storage, offlineAssetStatus, repairOfflineAssets } from '../app/storage';
import { useAction } from '../app/useAction';
import { downloadJson } from '../app/download';
import { SERVER_MODE } from '../app/server-mode';

function ConflictEditor({ conflict }: { conflict: NoteConflict }) {
  const { notes, reload } = useStudy();
  const [body, setBody] = useState(conflict.originals.map((note) => note.body).join('\n\n---\n\n'));
  const action = useAction();
  return <section className="study-panel"><h3>历史笔记冲突 · {conflict.questionId}</h3>
    <p>以下原文将一直保留在备份中；合并只更新当前使用的笔记。</p>
    {conflict.originals.map((note) => <details key={note.id}><summary>原文 · {note.updatedAt}</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{note.body}</pre></details>)}
    {conflict.resolvedAt ? <p>已于 {conflict.resolvedAt} 合并，原文档案仍保留。</p> : <form onSubmit={(event) => { event.preventDefault(); void action.run(async () => {
      const current = notes.get(conflict.questionId);
      if (!current) throw new Error('当前笔记不存在，请先重新读取。');
      await storage.reviewRepository.resolveNoteConflict(conflict.id, body, current.updatedAt);
      await reload();
    }); }}>
      <label>合并后的笔记<textarea aria-label={`合并笔记 ${conflict.questionId}`} value={body} onChange={(event) => setBody(event.target.value)} rows={8} /></label>
      <button className="primary-command" disabled={action.busy || !body.trim()}>保存合并结果</button>
    </form>}
    {action.error && <p role="alert">{action.error}</p>}
  </section>;
}
export function LearningDataTools() {
  const { conflicts, pack } = useLearning();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof offlineAssetStatus>>>([]);
  const [statusError, setStatusError] = useState('');
  const action = useAction();
  useEffect(() => {
    let active = true;
    const refresh = () => { void offlineAssetStatus().then((value) => { if (active) setStatus(value); }, (reason) => { if (active) setStatusError(String(reason)); }); };
    refresh(); window.addEventListener('bitatlas-offline-progress', refresh);
    return () => { active = false; window.removeEventListener('bitatlas-offline-progress', refresh); };
  }, []);
  return <>
    <section className="study-panel"><h2>学习内容与离线图片</h2><p>{pack ? `学习包 ${pack.version}：${pack.mappings.length} 条映射、${pack.cards.length} 张卡片，全部待审核。` : '学习包不可用。'}</p>
      <p>题目文字和学习包存于本地数据库；来源图片需单独下载。以下为当前缓存数量，点击补齐会重新核验图片摘要。</p>
      <ul>{status.map((entry) => <li key={entry.year}>{entry.year}：{entry.cached}/{entry.total} 张{entry.cached === entry.total ? '已缓存' : '，尚未补齐'}</li>)}</ul>
      <button className="secondary-command" disabled={action.busy} onClick={() => void action.run(async () => { await repairOfflineAssets(); setStatus(await offlineAssetStatus()); })}>{action.busy ? '校验与下载中…' : '补齐并校验离线图片'}</button>
      {(action.error || statusError) && <p role="alert">{action.error || statusError}</p>}
    </section>
    <section className="study-panel"><h2>升级前恢复副本</h2><p>迁移时在同一事务内保存原始记录。恢复旧快照不含升级后新增记录，{SERVER_MODE ? '请先导出当前账号的 v5 备份，以保留待同步操作和冲突记录。' : '请先另存当前 v4 备份。'}</p>
      <button className="secondary-command" disabled={action.busy} onClick={() => void action.run(async () => {
        const snapshot = await storage.reviewRepository.getSetting('migration.v4.recovery');
        if (!snapshot) throw new Error('本浏览器没有旧版本迁移副本，可能是在新版中首次创建数据。');
        downloadJson(JSON.stringify(snapshot.value, null, 2), 'bitatlas-before-v4-recovery.json');
      })}>导出保存的升级前快照</button></section>
    {conflicts.map((conflict) => <ConflictEditor key={conflict.id} conflict={conflict} />)}
  </>;
}
