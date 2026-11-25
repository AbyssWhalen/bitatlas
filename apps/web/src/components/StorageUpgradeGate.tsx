import { useEffect, useState, type ReactNode } from 'react';
import { canonicalSerialize } from '@408os/content-schema';
import { inspectLegacyDatabase, recoveryBackupCandidate, type RecoverySnapshot } from '@408os/storage';
import { storage } from '../app/storage';

import { downloadJson } from '../app/download';

/** Keep the provider unmounted until the legacy snapshot is available. */
export function StorageUpgradeGate({ children, account = false }: { children: ReactNode; account?: boolean }) {
  const databaseName = account ? storage.userDatabase.name : '408-user';
  const targetVersion = account ? 5 : 4;
  const [checked, setChecked] = useState(false);
  const [snapshot, setSnapshot] = useState<RecoverySnapshot | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [tabsClosed, setTabsClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let active = true;
    void inspectLegacyDatabase(databaseName, targetVersion).then((value) => { if (active) { setSnapshot(value); setChecked(true); } },
      (reason: unknown) => { if (active) setError(String(reason)); });
    const onClosed = () => setClosed(true);
    const onBlocked = () => setError('升级正在等待其他 BitAtlas 标签页释放数据库。请先保存并关闭那些页面；本页会继续等待。');
    window.addEventListener('bitatlas-storage-closed', onClosed);
    window.addEventListener('bitatlas-storage-blocked', onBlocked);
    return () => {
      active = false;
      window.removeEventListener('bitatlas-storage-closed', onClosed);
      window.removeEventListener('bitatlas-storage-blocked', onBlocked);
    };
  }, [databaseName, targetVersion]);
  const migrate = async () => {
    if (!snapshot || busy) return;
    setBusy(true); setError('');
    try {
      const latest = await inspectLegacyDatabase(databaseName, targetVersion);
      if (latest && canonicalSerialize(latest.tables) !== canonicalSerialize(snapshot.tables)) {
        setSnapshot(latest); setDownloaded(false);
        throw new Error('另一页面修改了数据。已重新生成快照，请保存新的副本后再升级。');
      }
      await storage.userDatabase.open();
      await storage.contentDatabase.open();
      setSnapshot(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const save = () => {
    if (!snapshot) return;
    downloadJson(JSON.stringify(snapshot, null, 2), `bitatlas-before-v${targetVersion}-recovery.json`);
    // Duplicate legacy notes can make the old backup invalid. The recovery
    // snapshot retains every original and can itself be imported in v4.
    const legacy = JSON.stringify(recoveryBackupCandidate(snapshot), null, 2);
    try { storage.backupService.preflight(legacy); downloadJson(legacy, `bitatlas-before-v${targetVersion}-backup-v${snapshot.databaseVersion}.json`); }
    catch { setError('旧数据存在冲突，旧版备份格式无法完整表达。已下载包含全部原文、带摘要的恢复快照，可在新版数据管理中导入。'); }
    setDownloaded(true);
  };
  if (!checked || snapshot) return <main className="page upgrade-page">
    <h1>保存数据，开始新的学习循环</h1>
    <p>这次升级会新增复习记录并保留原始作答。先保存升级前快照，再继续。</p>
    <p>快照包含作答、笔记、收藏、设置和复习记录；本地 PDF 仍需另行保存。旧应用不能读取 v{targetVersion} 备份，恢复升级前快照也不包含之后的新记录。</p>
    {snapshot && <><p>当前数据库 v{snapshot.databaseVersion} · 摘要 <code>{snapshot.sha256.slice(0, 16)}</code></p>
      <button onClick={save} className="secondary-command">下载升级前快照</button>
      <label><input type="checkbox" checked={tabsClosed} onChange={(event) => setTabsClosed(event.target.checked)} />已保存其他页面的输入并关闭其他 BitAtlas 标签页</label>
      <button className="primary-command" disabled={!downloaded || !tabsClosed || busy} onClick={() => void migrate()}>{busy ? '升级中…' : '开始兼容升级'}</button></>}
    {error && <p role="alert">{error}</p>}
  </main>;
  return <>{closed && <aside className="pwa-update-notice" role="alert"><div><strong>数据库已在另一页面更新</strong>
    <p>当前页面已停止数据库写入。请复制尚未保存的输入，然后重新载入。</p></div>
    <button onClick={() => window.location.reload()}>重新载入</button></aside>}{children}</>;
}
