import { ArrowRight, BookOpen, Database, Download, FileJson, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKUP_DOWNLOAD_PREFIX } from '../app/brand';
import { activeAccount } from '../app/account';
import { useStudy } from '../app/StudyContext';
import { getSourceAudit } from '../app/sourceAudit';
import { useAction } from '../app/useAction';
import { storage } from '../app/storage';
import { LearningDataTools } from '../components/LearningDataTools';
import { AccountTools } from '../components/AccountTools';
import { SERVER_MODE } from '../app/server-mode';

export function SettingsPage() {
  const { packs, questions, attempts, notes, reviewSummary, contentIssues, exportBackup, importBackup, installVerifiedPack } = useStudy();
  const navigate = useNavigate();
  const backupInput = useRef<HTMLInputElement>(null);
  const verifiedPackInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const action = useAction();
  const manifest = packs.find((candidate) => candidate.year === 2009);
  const packStatus = manifest?.reviewStatus ?? 'unavailable';
  const sourceAudit = getSourceAudit(manifest);
  const canManageContent = !SERVER_MODE || activeAccount?.account.role === 'admin';

  const downloadBackup = async () => {
    const json = await exportBackup();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${BACKUP_DOWNLOAD_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('备份已导出');
  };

  const handleImport = async (file: File) => {
    setStatus(null);
    let json: string;
    try {
      json = await file.text();
      const preview = storage.backupService.preflight(json);
      setStatus(`预检通过：备份 v${preview.schemaVersion}，${preview.counts.attempts} 条作答、${preview.counts.notes} 条笔记。`);
    } catch (reason) {
      setStatus(`预检失败：${reason instanceof Error ? reason.message : String(reason)}。当前数据未更改。`);
      return;
    }
    const confirmed = window.confirm(
      '预检已通过。恢复此备份会替换当前浏览器中的作答、进度、笔记、收藏、设置、模考、每日计划、个人卡片和复习记录。本地 PDF 不受影响。请先保存当前备份。继续恢复？',
    );
    if (!confirmed) {
      setStatus('已取消备份恢复');
      return;
    }
    try {
      await importBackup(json);
      setStatus('备份已恢复');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : '导入失败');
    }
  };

  const handleVerifiedPackImport = async (file: File) => {
    try {
      await installVerifiedPack(await file.text());
      setStatus('Verified 题包已校验并激活');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Verified 题包导入失败');
    }
  };

  return (
    <div className="page settings-page sec-page sec-settings">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>数据管理</h1>
          <p className="sec-statement">
            {SERVER_MODE ? '账号同步与学习备份' : '本机学习数据与备份'}
          </p>
          <p className="sec-subtitle">
            {SERVER_MODE ? '账号记录可同步，未同步内容保留在本机。' : '学习记录只保存在当前浏览器。'}
          </p>
        </div>
      </header>

      {SERVER_MODE && <AccountTools />}

      <section className="data-summary sec-metric-grid" aria-label="数据概览">
        <article>
          <div className="sec-metric-label"><Database size={16} aria-hidden="true" /><span>{SERVER_MODE ? '可用题目' : '本地题目'}</span></div>
          <strong className="sec-mono-num">{questions.length}</strong>
        </article>
        <article>
          <div className="sec-metric-label"><HardDrive size={16} aria-hidden="true" /><span>作答记录</span></div>
          <strong className="sec-mono-num">{attempts.length}</strong>
        </article>
        <article>
          <div className="sec-metric-label"><FileJson size={16} aria-hidden="true" /><span>个人笔记</span></div>
          <strong className="sec-mono-num">{notes.size}</strong>
        </article>
      </section>

      {action.error && <p className="sec-inline-alert" role="alert">{action.error}</p>}
      {status && <div className="status-message sec-inline-status" role="status">{status}</div>}

      {sourceAudit && (
        <section className="backup-band sec-band">
          <div className="sec-band-copy">
            <h2>2009 来源核对</h2>
            <p>AI 已完成 {sourceAudit.questionCount} / {sourceAudit.questionCount} 题的来源核对与校订（{sourceAudit.completedAt}），可用于日常练习。</p>
            <p>人工审核进度单独记录，正式模考仍需通过人工审核。</p>
          </div>
        </section>
      )}

      {canManageContent && <section className="backup-band sec-band">
        <div className="sec-band-copy">
          <h2>2009 人工复核</h2>
          <p>当前已通过 {reviewSummary.approved} / {reviewSummary.total}，题包状态为 {packStatus}。</p>
        </div>
        <div className="command-row sec-band-actions">
          <button type="button" className="secondary-command" onClick={() => navigate('/review/2009')}>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>进入复核</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>}

      {canManageContent && <section className="backup-band sec-band">
        <div className="sec-band-copy">
          <h2>激活正式题包</h2>
          <p>仅接受发布工具生成的完整 JSON；安装前会核对题包 hash、47 题状态和全部来源资产。</p>
        </div>
        <div className="command-row sec-band-actions">
          <button type="button" className="secondary-command" disabled={action.busy} onClick={() => verifiedPackInput.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            <span>导入 Verified 题包</span>
          </button>
        </div>
        <input
          ref={verifiedPackInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void action.run(() => handleVerifiedPackImport(file));
            event.currentTarget.value = '';
          }}
        />
      </section>}

      {contentIssues.length > 0 && (
        <section className="backup-band sec-band sec-band-alert" role="alert">
          <div className="sec-band-copy">
            <h2>扩展题包安装提示</h2>
            <p>以下可选题包安装失败，其余功能不受影响：</p>
            <ul>{contentIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          </div>
        </section>
      )}

      <section className="backup-band sec-band">
        <div className="sec-band-copy">
          <h2>{SERVER_MODE ? '共享资料库' : '本地资料库'}</h2>
          <p>
            {SERVER_MODE
              ? '资料由服务器保存，主动下载后可离线阅读；PDF 不进入账号学习备份。'
              : 'PDF 独立保存在当前浏览器，不进入学习备份。'}
          </p>
        </div>
        <div className="command-row sec-band-actions">
          <button type="button" className="secondary-command" onClick={() => navigate('/documents')}>
            <BookOpen size={16} aria-hidden="true" />
            <span>{SERVER_MODE ? '打开共享资料库' : '打开本地资料库'}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="backup-band sec-band">
        <div className="sec-band-copy">
          <div className="sec-band-title-row">
            <h2>备份与恢复</h2>
            <span className="sec-schema-tag">{SERVER_MODE ? 'BACKUP V5' : 'BACKUP V4'}</span>
          </div>
          <p>
            包含作答、进度、笔记及冲突原文、收藏、设置、模考、每日计划、个人卡片和评分历史。不包含本地 PDF、题包与图片缓存。
            {SERVER_MODE
              ? '另含冲突、待同步操作和恢复档案；接受合法 v1–v4 和同账号 v5 备份，旧应用不能读取 v5。'
              : '接受合法 v1–v3 备份和升级前恢复快照；旧应用不能读取 v4。'}
          </p>
        </div>
        <div className="command-row sec-band-actions">
          <button type="button" className="secondary-command" disabled={action.busy} onClick={() => backupInput.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            <span>导入学习备份</span>
          </button>
          <button type="button" className="primary-command" disabled={action.busy} onClick={() => void action.run(downloadBackup)}>
            <Download size={16} aria-hidden="true" />
            <span>导出备份</span>
          </button>
        </div>
        <input
          ref={backupInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void action.run(() => handleImport(file));
            event.currentTarget.value = '';
          }}
        />
      </section>

      <LearningDataTools />

      <section className="storage-facts sec-facts-list" aria-label="存储信息">
        <div><span>内容数据库</span><strong className="sec-mono-num">408-content</strong></div>
        <div><span>用户数据库</span><strong className="sec-mono-num">408-user</strong></div>
        <div><span>题包状态</span><strong className={packStatus === 'verified' ? 'success-text' : 'warning-text'}>{packStatus}</strong></div>
        <div><span>同步服务</span><strong>{SERVER_MODE ? '账号同步已启用' : '仅本机保存'}</strong></div>
      </section>
    </div>
  );
}
