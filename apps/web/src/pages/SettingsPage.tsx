import { ArrowRight, BookOpen, Database, Download, FileJson, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKUP_DOWNLOAD_PREFIX } from '../app/brand';
import { useStudy } from '../app/StudyContext';

export function SettingsPage() {
  const { packs, questions, attempts, notes, reviewSummary, exportBackup, importBackup, installVerifiedPack } = useStudy();
  const navigate = useNavigate();
  const backupInput = useRef<HTMLInputElement>(null);
  const verifiedPackInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const packStatus = packs.find((candidate) => candidate.year === 2009)?.reviewStatus ?? 'unavailable';

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
    const confirmed = window.confirm(
      '恢复此备份会替换当前浏览器中的作答、进度、笔记、收藏、设置和模考记录。本地 PDF 不受影响。继续恢复？',
    );
    if (!confirmed) {
      setStatus('已取消备份恢复');
      return;
    }
    try {
      await importBackup(await file.text());
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
    <div className="page settings-page">
      <header className="page-header"><div><span className="eyebrow">LOCAL DATA</span><h1>数据管理</h1><p>学习记录只保存在当前浏览器。</p></div></header>
      <section className="data-summary"><article><Database /><span>本地题目</span><strong>{questions.length}</strong></article><article><HardDrive /><span>作答记录</span><strong>{attempts.length}</strong></article><article><FileJson /><span>个人笔记</span><strong>{notes.size}</strong></article></section>
      <section className="backup-band">
        <div><span className="eyebrow">CONTENT REVIEW</span><h2>2009 人工复核</h2><p>当前已通过 {reviewSummary.approved} / {reviewSummary.total}，题包状态为 {packStatus}。</p></div>
        <div className="command-row"><button className="secondary-command" onClick={() => navigate('/review/2009')}><ShieldCheck size={17} />进入复核<ArrowRight size={17} /></button></div>
      </section>
      <section className="backup-band">
        <div><span className="eyebrow">VERIFIED CONTENT</span><h2>激活正式题包</h2><p>仅接受发布工具生成的完整 JSON；安装前会核对题包 hash、47 题状态和全部来源资产。</p></div>
        <div className="command-row"><button className="secondary-command" onClick={() => verifiedPackInput.current?.click()}><Upload size={17} />导入 Verified 题包</button></div>
        <input ref={verifiedPackInput} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleVerifiedPackImport(file); event.currentTarget.value = ''; }} />
      </section>
      <section className="backup-band">
        <div><span className="eyebrow">LOCAL PDF</span><h2>本地资料库</h2><p>PDF 独立保存在当前浏览器，不进入学习备份。</p></div>
        <div className="command-row"><button className="secondary-command" onClick={() => navigate('/documents')}><BookOpen size={17} />打开本地资料库<ArrowRight size={17} /></button></div>
      </section>
      <section className="backup-band"><div><span className="eyebrow">BACKUP V3</span><h2>备份与恢复</h2></div><div className="command-row"><button className="secondary-command" onClick={() => backupInput.current?.click()}><Upload size={17} />导入学习备份</button><button className="primary-command" onClick={() => void downloadBackup()}><Download size={17} />导出备份</button></div><input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); event.currentTarget.value = ''; }} /></section>
      {status && <div className="status-message" role="status">{status}</div>}
      <section className="storage-facts"><div><span>内容数据库</span><strong>408-content</strong></div><div><span>用户数据库</span><strong>408-user</strong></div><div><span>题包状态</span><strong className={packStatus === 'verified' ? 'success-text' : 'warning-text'}>{packStatus}</strong></div><div><span>同步服务</span><strong>disabled</strong></div></section>
    </div>
  );
}
