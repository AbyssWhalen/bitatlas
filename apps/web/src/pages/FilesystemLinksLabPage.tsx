import {
  FILE_LINK_Q31_PRESET,
  traceFileLinks,
  type FileLinkConfig,
  type FileLinkState,
  type FileLinkTrace,
  type FileLinkTraceStepKind,
} from '@408os/lab-core';
import { BookOpenCheck, File, FileSymlink, FolderTree, Link2, ListOrdered, RotateCcw, ShieldAlert } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { OsModuleTabs } from '../components/OsModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SuccessfulComputation {
  readonly ok: true;
  readonly trace: FileLinkTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type FileLinkComputation = SuccessfulComputation | FailedComputation;

const stepLabels: Record<FileLinkTraceStepKind, string> = {
  initial: '建立初始目录项',
  'create-symlink': '建立符号链接',
  'create-hardlink': '建立硬链接',
  'unlink-target': '删除原目录项',
};

function stateSummary(state: FileLinkState): string {
  const target = state.inodes.find((inode) => inode.inodeId === 'inode-target');
  const directory = state.directory.map((entry) => `${entry.name}->${entry.inodeId}`).join(' · ') || '目录为空';
  const symlink = state.resolution.symlink === null
    ? 'symlink=未建立'
    : `symlink=${state.resolution.symlink.dangling ? 'dangling' : 'resolved'}`;
  return `${directory} · target-links=${target?.linkCount ?? 0} · ${symlink}`;
}

function computeTrace(targetName: string, symbolicLinkName: string, hardLinkName: string): FileLinkComputation {
  try {
    const config: FileLinkConfig = {
      ...FILE_LINK_Q31_PRESET.config,
      targetName,
      symbolicLinkName,
      hardLinkName,
    };
    const trace = traceFileLinks(config);
    const explorerSteps: ExplorerStep[] = trace.steps.map((step, index) => ({
      id: `filesystem-links-step-${index}`,
      label: `${stepLabels[step.kind]}${step.kind === 'initial' ? ` · ${targetName}` : ''}`,
      value: stateSummary(step.state),
    }));
    return { ok: true, trace, explorerSteps };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : '无法重放文件链接状态。' };
  }
}

function entryStatus(
  state: FileLinkState,
  name: string,
  symbolicLinkName: string,
): 'present' | 'absent' | 'dangling' {
  if (!state.directory.some((entry) => entry.name === name)) return 'absent';
  if (name === symbolicLinkName && state.resolution.symlink?.dangling === true) return 'dangling';
  return 'present';
}

function DirectoryPanel({ config, state }: { config: FileLinkConfig; state: FileLinkState }) {
  const entries = [
    { name: config.targetName, kind: '普通文件', icon: File },
    { name: config.symbolicLinkName, kind: '符号链接', icon: FileSymlink },
    { name: config.hardLinkName, kind: '硬链接', icon: Link2 },
  ] as const;
  return (
    <section className="lab-control-panel filesystem-directory-panel" aria-labelledby="filesystem-directory-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">DIRECTORY ENTRIES</span><h2 id="filesystem-directory-heading">目录项状态</h2></div>
        <FolderTree size={19} aria-hidden="true" />
      </div>
      <div className="filesystem-entry-list">
        {entries.map(({ name, kind, icon: Icon }) => {
          const status = entryStatus(state, name, config.symbolicLinkName);
          const entry = state.directory.find((candidate) => candidate.name === name);
          return (
            <article key={name} aria-label={`目录项 ${name}`} data-entry-status={status}>
              <Icon size={18} aria-hidden="true" />
              <div><strong>{name}</strong><span>{kind}</span></div>
              <code>{entry?.inodeId ?? (status === 'absent' ? 'not-present' : 'dangling')}</code>
              <small>{status === 'present' ? '可访问' : status === 'dangling' ? `目标 ${config.targetName} 不存在` : '尚未建立或已删除'}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InodePanel({ state }: { state: FileLinkState }) {
  const target = state.inodes.find((inode) => inode.inodeId === 'inode-target');
  return (
    <section className="lab-control-panel filesystem-inode-panel" aria-labelledby="filesystem-inode-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">INODE TABLE</span><h2 id="filesystem-inode-heading">inode 与引用计数</h2></div>
        <strong aria-label="目标 inode 引用计数">{target?.linkCount ?? 0}</strong>
      </div>
      <div className="filesystem-inode-list">
        {state.inodes.map((inode) => (
          <article key={inode.inodeId} data-inode-id={inode.inodeId} data-inode-kind={inode.kind}>
            <div><code>{inode.inodeId}</code><strong>{inode.linkCount}</strong></div>
            <span>{inode.kind === 'regular' ? '普通文件 inode' : '符号链接 inode'}</span>
            <small>{inode.kind === 'regular' ? `content: ${inode.content}` : `target: ${inode.targetName} · ${inode.dangling ? 'dangling' : 'resolved'}`}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function resolutionText(config: FileLinkConfig, state: FileLinkState): string {
  if (state.resolution.symlink?.dangling && state.resolution.hardlink !== null) {
    return `${config.symbolicLinkName} 已悬空；${config.hardLinkName} 仍可访问 ${state.resolution.hardlink.inodeId}。`;
  }
  if (state.resolution.hardlink !== null) {
    return `${config.symbolicLinkName} 可解析到 ${config.targetName}；${config.hardLinkName} 与 ${config.targetName} 共享目标 inode。`;
  }
  if (state.resolution.symlink !== null) {
    return `${config.symbolicLinkName} 保存目标名 ${config.targetName}，当前可以解析。`;
  }
  return `${config.targetName} 是当前唯一目录项。`;
}

export function FilesystemLinksLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetName = searchParams.get('target') ?? FILE_LINK_Q31_PRESET.config.targetName;
  const symbolicLinkName = searchParams.get('symlink') ?? FILE_LINK_Q31_PRESET.config.symbolicLinkName;
  const hardLinkName = searchParams.get('hardlink') ?? FILE_LINK_Q31_PRESET.config.hardLinkName;
  const computationKey = `${targetName}:${symbolicLinkName}:${hardLinkName}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(
    () => computeTrace(targetName, symbolicLinkName, hardLinkName),
    [hardLinkName, symbolicLinkName, targetName],
  );
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => (
      current.key === computationKey && current.index === index ? current : { key: computationKey, index }
    ));
  }, [computationKey]);
  const safeActiveIndex = computation.ok ? Math.min(activeIndex, computation.trace.steps.length - 1) : 0;
  const currentStep = computation.ok ? computation.trace.steps[safeActiveIndex]! : null;
  const config: FileLinkConfig | null = computation.ok
    ? { ...FILE_LINK_Q31_PRESET.config, targetName, symbolicLinkName, hardLinkName }
    : null;
  const questionId = useMemo(
    () => questions.find((question) => (
      question.id === FILE_LINK_Q31_PRESET.sourceQuestionId
      || (question.year === 2009 && question.number === 31)
    ))?.id ?? null,
    [questions],
  );

  const updateUrl = (nextTarget: string, nextSymbolic: string, nextHard: string) => {
    setActiveIndex(0);
    setSearchParams({
      module: 'filesystem-links',
      target: nextTarget,
      symlink: nextSymbolic,
      hardlink: nextHard,
    }, { replace: true });
  };

  const restorePreset = () => {
    setActiveIndex(0);
    setSearchParams({ module: 'filesystem-links', preset: FILE_LINK_Q31_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ31 = async () => {
    if (!questionId || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([questionId], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q31 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page filesystem-links-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">OS LAB / FILE LINKS</span><h1>软硬链接实验室</h1><p>逐步区分目录项、inode 引用计数，以及删除原文件名后的链接解析结果。</p></div>
        <button className="secondary-command" type="button" disabled={!questionId || starting} onClick={() => void practiceQ31()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q31'}
        </button>
      </header>
      <LabSectionNav />
      <OsModuleTabs active="filesystem-links" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="vm-review-band filesystem-review-band">
        <span><ShieldAlert size={16} aria-hidden="true" />本地练习预设 · Q31</span>
        <strong>{FILE_LINK_Q31_PRESET.reviewStatus}</strong>
        <small>原题序列来自待人工复核题包；此页区分软链接自身 inode 与目标 inode，不提升审核状态。</small>
      </div>

      <div className="lab-module-heading"><Link2 size={18} aria-hidden="true" /><span>目录项 · inode · link count · dangling</span><ListOrdered size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid filesystem-links-lab-grid">
        <div className="filesystem-links-workbench">
          <section className="lab-control-panel filesystem-links-control" aria-labelledby="filesystem-links-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">CONFIG / NAMES</span><h2 id="filesystem-links-control-heading">目录项名称</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q31 预设</button>
            </div>
            <div className="filesystem-links-input-grid">
              <label className="lab-input-field"><span>目标文件名</span><input aria-label="目标文件名" value={targetName} onChange={(event) => updateUrl(event.target.value, symbolicLinkName, hardLinkName)} /></label>
              <label className="lab-input-field"><span>符号链接名</span><input aria-label="符号链接名" value={symbolicLinkName} onChange={(event) => updateUrl(targetName, event.target.value, hardLinkName)} /></label>
              <label className="lab-input-field"><span>硬链接名</span><input aria-label="硬链接名" value={hardLinkName} onChange={(event) => updateUrl(targetName, symbolicLinkName, event.target.value)} /></label>
            </div>
            {!computation.ok ? <div className="lab-error" role="alert">{computation.message}</div> : currentStep && config && (
              <div className="filesystem-resolution-status" role="status" aria-label="链接解析状态" data-dangling={currentStep.state.resolution.symlink?.dangling ?? false}>
                {resolutionText(config, currentStep.state)}
              </div>
            )}
          </section>

          {computation.ok && currentStep && config && (
            <>
              <div className="filesystem-current-event">
                <ListOrdered size={18} aria-hidden="true" />
                <div><span>当前重放事件</span><strong>{stepLabels[currentStep.kind]}</strong></div>
                <code>{stateSummary(currentStep.state)}</code>
              </div>
              <DirectoryPanel config={config} state={currentStep.state} />
              <InodePanel state={currentStep.state} />
            </>
          )}
        </div>

        {computation.ok && (
          <StepExplorer
            key={computationKey}
            steps={computation.explorerSteps}
            onActiveIndexChange={setActiveIndex}
            announceChanges={false}
            className="filesystem-links-step-explorer"
          />
        )}
      </div>
    </div>
  );
}
