import { useState } from 'react';
import { AccountBackupService } from '@408os/storage';
import { activeAccount, logoutAccount, synchronize } from '../app/account';
import { storage } from '../app/storage';
import { accountCache } from '../app/account-cache';
import { api } from '../app/api';
import { useAction } from '../app/useAction';
import { downloadJson } from '../app/download';
import { useStudy } from '../app/StudyContext';
import type { ContentBlock, SyncConflict, SyncEntity } from '@408os/domain';

function ConflictEditor({ conflict }: { conflict: SyncConflict }) {
  const local = conflict.local as { body?: string; back?: ContentBlock[]; front?: ContentBlock[] } | null;
  const remote = conflict.remote as typeof local;
  const readable = (blocks: ContentBlock[] = []) => blocks.map((block) => block.type === 'text' ? block.text : JSON.stringify(block)).join('\n');
  const [text, setText] = useState(local?.body ?? readable(local?.back));
  const [front, setFront] = useState(readable(local?.front));
  const [saved, setSaved] = useState(false);
  const action = useAction();
  return <details><summary>并发修改：{conflict.kind} · {conflict.entityId}</summary>
    <h4>本机版本</h4><pre>{JSON.stringify(local, null, 2)}</pre><h4>服务器版本</h4><pre>{JSON.stringify(remote, null, 2)}</pre>
    {saved ? <p role="status">已保存处理结果；双方原文仍在完整备份中。</p> : ['notes', 'personalCards'].includes(conflict.kind) ? <>
      {conflict.kind === 'personalCards' && <label>合并后的卡片正面<textarea value={front} onChange={(event) => setFront(event.target.value)} /></label>}
      <label>合并后的正文<textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
      <button className="secondary-command" disabled={action.busy || !text.trim()} onClick={() => void action.run(async () => { await storage.syncRepository.resolveTextConflict(conflict.id, text, front); await synchronize(); setSaved(true); })}>保存合并稿</button></>
      : ['sessions', 'reviewSessions'].includes(conflict.kind) ? <><p>保留本机过程为独立历史轮次，再恢复服务器上的原轮次。</p>
        <button className="secondary-command" disabled={action.busy} onClick={() => void action.run(async () => {
          const latest = await api<{ entities: SyncEntity[] }>('/sync/pull');
          await storage.syncRepository.retainRoundCopy(conflict.id, latest.entities); await synchronize(); setSaved(true);
        })}>保留本机轮次副本</button></>
        : <p>这条记录随关联轮次一同处理；双方过程和原文均保存在完整备份中。</p>}
    {action.error && <p role="alert">{action.error}</p>}
  </details>;
}
export function AccountTools() {
  const { reload } = useStudy();
  const action = useAction();
  const [status, setStatus] = useState('');
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [invite, setInvite] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; username: string; role: string; active: number }>>([]);
  const [legacy, setLegacy] = useState<Awaited<ReturnType<AccountBackupService['previewLegacy']>>>(null);
  const [legacySaved, setLegacySaved] = useState(false);
  const [candidate, setCandidate] = useState<{ kind: 'questions' | 'learning'; content: unknown; digest: string; currentDigest?: string | null; summary: unknown; blockers: string[] } | null>(null);
  return <section className="study-panel sec-account-panel">
    <div className="sec-account-head">
      <h2>账号与同步</h2>
      <span className="sec-account-badge">{activeAccount?.account.username} · {activeAccount?.account.role === 'admin' ? '管理员' : '成员'}</span>
    </div>
    <p>学习记录属于当前账号。备份 v5 包含作答、笔记、个人卡片、复习、冲突与待同步操作；不包含题包、共享 PDF、离线 PDF 或登录密码。</p>
    <div className="command-row"><button type="button" className="secondary-command" disabled={action.busy} onClick={() => void action.run(async () => {
      await synchronize(); await reload(); const current = await storage.syncRepository.status(); setConflicts(current.conflicts);
      const cache = await accountCache.stats(); setStatus(`待同步 ${current.pending} 条，冲突 ${current.conflicts.length} 条；跨账号可替换缓存 ${(cache.replaceable / 1e6).toFixed(1)}/250 MB，固定资料 ${(cache.protected / 1e6).toFixed(1)} MB。`);
    })}>同步并查看状态</button><button type="button" className="secondary-command" onClick={() => void action.run(logoutAccount)} disabled={action.busy}>退出并锁定本地记录</button></div>
    {(action.error || status) && <p className={action.error ? 'sec-inline-alert sec-account-msg' : 'sec-inline-status sec-account-msg'} role="status">{action.error || status}</p>}
    {conflicts.map((conflict) => <ConflictEditor key={conflict.id} conflict={conflict} />)}
    <details className="sec-account-details"><summary>导入原来浏览器里的学习记录</summary><p>先预览并保存备份，再由你选择归入当前账号。原匿名数据库不会被删除。</p>
      <div className="command-row">
        <button type="button" className="secondary-command" disabled={action.busy} onClick={() => void action.run(async () => {
          const service = storage.backupService; if (!(service instanceof AccountBackupService)) return;
          const preview = await service.previewLegacy(); setLegacy(preview); setLegacySaved(false); if (!preview) setStatus('没有可迁移的匿名记录。');
        })}>预览旧记录</button>
      </div>
      {legacy && <div className="sec-account-subbox"><p>{legacy.preview.counts.attempts} 条作答，{legacy.preview.counts.notes} 条笔记，目标账号：{activeAccount?.account.username}</p>
        <div className="command-row">
          <button type="button" className="secondary-command" onClick={() => { downloadJson(legacy.json, 'bitatlas-before-account-migration.json'); setLegacySaved(true); }}>保存迁移前备份</button>
          <button type="button" className="primary-command" disabled={!legacySaved || action.busy} onClick={() => void action.run(async () => {
            await storage.backupService.importJson(legacy.json, 'merge'); setLegacy(null); await reload(); setStatus('旧记录已归入当前账号，等待同步；原匿名记录仍保留。');
          })}>将这些记录归入当前账号</button>
        </div></div>}
    </details>
    {activeAccount?.account.role === 'admin' && <details className="sec-account-details"><summary>管理员：邀请与题包发布</summary>
      <div className="command-row sec-admin-actions">
        <button type="button" className="secondary-command" disabled={action.busy} onClick={() => void action.run(async () => { setInvite((await api<{ invite: string }>('/admin/invitations', { role: 'member', days: 7 })).invite); })}>生成 7 天成员邀请码</button>
        <button type="button" className="secondary-command" disabled={action.busy} onClick={() => void action.run(async () => { setMembers(await api('/admin/accounts')); })}>查看成员</button>
      </div>
      {invite && <label className="sec-invite-box"><span>邀请码（仅使用一次）</span><div className="command-row"><input readOnly value={invite} /><button type="button" className="secondary-command compact-command" onClick={() => void action.run(async () => { await api('/admin/invitations/revoke', { invite }); setInvite(''); })}>撤销该邀请码</button></div></label>}
      {members.length > 0 && <div className="sec-member-list">{members.map((member) => <p className="sec-member-row" key={member.id}><span>{member.username} · {member.role === 'admin' ? '管理员' : '成员'} · {member.active ? '可登录' : '已停用'}</span>
        {member.active && member.id !== activeAccount?.account.id && <button type="button" className="secondary-command compact-command" disabled={action.busy} onClick={() => void action.run(async () => {
          await api(`/admin/accounts/${member.id}/revoke`, {}); setMembers(await api('/admin/accounts'));
        })}>停用 {member.username} 并撤销会话</button>}</p>)}</div>}
      <p className="sec-admin-hint">先在共享资料库上传并发布图片，再预检题包；学习包需要匹配已发布题面版本。</p>
      <div className="sec-file-picker">
        <input aria-label="预检题包或学习包" type="file" accept=".json" disabled={action.busy} onChange={(event) => {
          const file = event.target.files?.[0]; if (!file) return; setCandidate(null);
          void action.run(async () => {
            const content = JSON.parse(await file.text()) as { id?: string };
            const kind = content.id === 'bitatlas-learning' ? 'learning' : 'questions';
            const result = await api<{ digest: string; currentDigest?: string | null; summary: unknown; blockers: string[] }>('/admin/content/preview', { kind, content });
            setCandidate({ kind, content, ...result });
          });
        }} />
      </div>
      {candidate && <div className="sec-account-subbox"><pre>{JSON.stringify(candidate.summary, null, 2)}</pre><p>{candidate.blockers.join('；') || '预检通过，可以发布。'}</p>
        <button type="button" className="primary-command" disabled={Boolean(candidate.blockers.length) || action.busy} onClick={() => void action.run(async () => {
          await api('/admin/content/publish', { kind: candidate.kind, content: candidate.content, expectedDigest: candidate.digest, expectedCurrentDigest: candidate.currentDigest });
          setCandidate(null); setStatus('内容已发布。重新打开页面可安装新版本。');
        })}>发布已预检内容</button></div>}
    </details>}
  </section>;
}
