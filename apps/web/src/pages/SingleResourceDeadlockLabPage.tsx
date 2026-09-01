import {
  analyzeSingleResourceDeadlock,
  SINGLE_RESOURCE_Q25_PRESET,
  type SingleResourceDeadlockAnalysis,
  type SingleResourceDeadlockState,
  type SingleResourceDeadlockStepKind,
  type SingleResourceProcessState,
} from '@408os/lab-core';
import { BookOpenCheck, ListOrdered, RotateCcw, ShieldAlert, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { OsModuleTabs } from '../components/OsModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SuccessfulComputation {
  readonly ok: true;
  readonly analysis: SingleResourceDeadlockAnalysis;
  readonly snapshots: readonly SingleResourceDeadlockState[];
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type DeadlockComputation = SuccessfulComputation | FailedComputation;

const MAX_VISUAL_RESOURCES = 64;
const MAX_VISUAL_PROCESSES = 32;

const statusLabels: Record<SingleResourceProcessState['status'], string> = {
  waiting: '等待资源',
  ready: '可完成',
  running: '已获资源，执行中',
  completed: '已完成并释放',
  'not-participating': '未参与死锁子集',
};

const stepLabels: Record<SingleResourceDeadlockStepKind, string> = {
  grant: '向进程发放剩余资源',
  complete: '进程完成并释放全部资源',
  'deadlock-detected': '检测到死锁状态',
};

function parsePositiveInteger(text: string, label: string, maximum: number): number {
  const normalized = text.trim();
  if (!/^[1-9][0-9]*$/u.test(normalized)) throw new Error(`${label}必须是正整数。`);
  const value = Number(normalized);
  if (!Number.isSafeInteger(value)) throw new Error(`${label}超出安全整数范围。`);
  if (value > maximum) throw new Error(`${label}最多为 ${maximum}。`);
  return value;
}

function processSummary(process: SingleResourceProcessState): string {
  return `${process.id}[hold=${process.allocatedResources}, need=${process.remainingNeed}, ${statusLabels[process.status]}]`;
}

function stateSummary(state: SingleResourceDeadlockState): string {
  return [
    `available=${state.availableResources}`,
    ...state.processes.map(processSummary),
  ].join(' · ');
}

function stepSummary(state: SingleResourceDeadlockState, processId: string | undefined): string {
  const process = processId === undefined
    ? undefined
    : state.processes.find((candidate) => candidate.id === processId);
  return process === undefined
    ? stateSummary(state)
    : `${process.id}: hold=${process.allocatedResources}, need=${process.remainingNeed} · available=${state.availableResources}`;
}

function computeDeadlock(
  resourcesText: string,
  processesText: string,
  maxDemandText: string,
): DeadlockComputation {
  try {
    const totalResources = parsePositiveInteger(resourcesText, '资源总数 R', MAX_VISUAL_RESOURCES);
    const processCount = parsePositiveInteger(processesText, '进程数量 K', MAX_VISUAL_PROCESSES);
    const maxDemandPerProcess = parsePositiveInteger(maxDemandText, '单进程最大需求 M', MAX_VISUAL_RESOURCES);
    const analysis = analyzeSingleResourceDeadlock({ totalResources, processCount, maxDemandPerProcess });
    const snapshots = [analysis.trace.initialState, ...analysis.trace.steps.map((step) => step.state)];
    const explorerSteps: ExplorerStep[] = [
      {
        id: 'deadlock-initial',
        label: analysis.deadlockPossible ? '构造极端资源分配' : '构造可安全完成的初态',
        value: stateSummary(analysis.trace.initialState),
      },
      ...analysis.trace.steps.map((step) => ({
        id: `deadlock-step-${step.sequence}`,
        label: `${stepLabels[step.kind]}${step.processId === undefined ? '' : ` · ${step.processId}`}`,
        value: stepSummary(step.state, step.processId),
      })),
    ];
    return { ok: true, analysis, snapshots, explorerSteps };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : '无法完成单类资源死锁分析。' };
  }
}

function ResourcePool({ state }: { state: SingleResourceDeadlockState }) {
  return (
    <section className="lab-control-panel deadlock-pool-panel" aria-labelledby="deadlock-pool-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">RESOURCE POOL</span><h2 id="deadlock-pool-heading">资源分配总览</h2></div>
        <strong>{state.availableResources} / {state.availableResources + state.processes.reduce((total, process) => total + process.allocatedResources, 0)} 可用</strong>
      </div>
      <div className="deadlock-resource-track" aria-label="当前资源分配条" role="img">
        {state.processes.flatMap((process) => Array.from({ length: process.allocatedResources }, (_, index) => (
          <span className="allocated" data-resource-owner={process.id} key={`${process.id}-${index}`} title={`${process.id} 已占用`} />
        )))}
        {Array.from({ length: state.availableResources }, (_, index) => (
          <span className="available" data-resource-available key={`available-${index}`} title="可用资源" />
        ))}
      </div>
      <div className="deadlock-pool-facts">
        <span><small>当前可用</small><strong>{state.availableResources}</strong></span>
        <span><small>已分配</small><strong>{state.processes.reduce((total, process) => total + process.allocatedResources, 0)}</strong></span>
      </div>
    </section>
  );
}

function ProcessStateView({ state }: { state: SingleResourceDeadlockState }) {
  return (
    <section className="lab-control-panel deadlock-process-panel" aria-labelledby="deadlock-process-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">PROCESS STATE</span><h2 id="deadlock-process-heading">进程资源状态</h2></div>
        <Users size={19} aria-hidden="true" />
      </div>
      <div className="deadlock-process-list">
        {state.processes.map((process) => (
          <article
            key={process.id}
            aria-label={`进程 ${process.id}`}
            data-process-id={process.id}
            data-process-status={process.status}
          >
            <strong>{process.id}</strong>
            <div>
              <span>{statusLabels[process.status]}</span>
              <small>已占 {process.allocatedResources} · 还需 {process.remainingNeed}</small>
            </div>
            <code>{process.status === 'waiting' ? 'hold-and-wait' : process.status === 'completed' ? 'released' : 'ready'}</code>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metrics({ analysis, state }: { analysis: SingleResourceDeadlockAnalysis; state: SingleResourceDeadlockState }) {
  return (
    <>
      <div className="deadlock-status" role="status" aria-label="死锁状态" data-deadlock={analysis.deadlockPossible}>
        {analysis.deadlockPossible
          ? `当前 K=${analysis.config.processCount} 已达到最小死锁进程数，可能发生死锁。`
          : `当前 K=${analysis.config.processCount} 低于死锁阈值，可按安全序列完成。`}
      </div>
      <div className="deadlock-metrics" aria-label="死锁阈值指标">
      <div aria-label="最小死锁进程数"><small>最小死锁进程数</small><strong>{analysis.minimumProcessCountForDeadlock ?? '不可能'}</strong></div>
      <div aria-label="当前可用资源"><small>当前可用资源</small><strong>{state.availableResources}</strong></div>
      <div><small>当前死锁参与数</small><strong>{analysis.deadlockParticipantCount || '无'}</strong></div>
      <div><small>保证安全所需资源</small><strong>{analysis.guaranteedSafeResourceCount}</strong></div>
      </div>
    </>
  );
}

export function SingleResourceDeadlockLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const resourcesText = searchParams.get('resources') ?? String(SINGLE_RESOURCE_Q25_PRESET.config.totalResources);
  const processesText = searchParams.get('processes') ?? String(SINGLE_RESOURCE_Q25_PRESET.config.processCount);
  const maxDemandText = searchParams.get('max-demand') ?? String(SINGLE_RESOURCE_Q25_PRESET.config.maxDemandPerProcess);
  const computationKey = `${resourcesText}:${processesText}:${maxDemandText}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(
    () => computeDeadlock(resourcesText, processesText, maxDemandText),
    [maxDemandText, processesText, resourcesText],
  );
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => (
      current.key === computationKey && current.index === index
        ? current
        : { key: computationKey, index }
    ));
  }, [computationKey]);
  const safeActiveIndex = computation.ok ? Math.min(activeIndex, computation.snapshots.length - 1) : 0;
  const currentState = computation.ok ? computation.snapshots[safeActiveIndex]! : null;
  const activeStep = computation.ok && safeActiveIndex > 0 ? computation.analysis.trace.steps[safeActiveIndex - 1] : undefined;
  const questionId = useMemo(
    () => questions.find((question) => (
      question.id === SINGLE_RESOURCE_Q25_PRESET.sourceQuestionId
      || (question.year === 2009 && question.number === 25)
    ))?.id ?? null,
    [questions],
  );

  const updateUrl = (nextResources: string, nextProcesses: string, nextMaxDemand: string) => {
    setActiveIndex(0);
    setSearchParams({
      module: 'deadlock',
      resources: nextResources,
      processes: nextProcesses,
      'max-demand': nextMaxDemand,
    }, { replace: true });
  };

  const restorePreset = () => {
    setActiveIndex(0);
    setSearchParams({ module: 'deadlock', preset: SINGLE_RESOURCE_Q25_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ25 = async () => {
    if (!questionId || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([questionId], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q25 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page deadlock-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">OS LAB / DEADLOCK</span><h1>单类资源死锁实验室</h1><p>逐步观察资源分配、进程完成与“占有并等待”如何跨过死锁阈值。</p></div>
        <button className="secondary-command" type="button" disabled={!questionId || starting} onClick={() => void practiceQ25()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q25'}
        </button>
      </header>
      <LabSectionNav />
      <OsModuleTabs active="deadlock" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="vm-review-band deadlock-review-band">
        <span><ShieldAlert size={16} aria-hidden="true" />本地练习预设 · Q25</span>
        <strong>{SINGLE_RESOURCE_Q25_PRESET.reviewStatus}</strong>
        <small>参数来自待人工复核题包；此页只演示单类资源的确定性极端分配，不提升审核状态。</small>
      </div>

      <div className="lab-module-heading"><ShieldAlert size={18} aria-hidden="true" /><span>资源守恒 · 安全序列 · 死锁检测</span><ListOrdered size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid deadlock-lab-grid">
        <div className="deadlock-workbench">
          <section className="lab-control-panel deadlock-control-panel" aria-labelledby="deadlock-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">CONFIG / MODEL</span><h2 id="deadlock-control-heading">资源与进程参数</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q25 预设</button>
            </div>
            <div className="deadlock-input-grid">
              <label className="lab-input-field"><span>资源总数 R</span><input aria-label="资源总数 R" inputMode="numeric" value={resourcesText} onChange={(event) => updateUrl(event.target.value, processesText, maxDemandText)} /></label>
              <label className="lab-input-field"><span>进程数量 K</span><input aria-label="进程数量 K" inputMode="numeric" value={processesText} onChange={(event) => updateUrl(resourcesText, event.target.value, maxDemandText)} /></label>
              <label className="lab-input-field"><span>单进程最大需求 M</span><input aria-label="单进程最大需求 M" inputMode="numeric" value={maxDemandText} onChange={(event) => updateUrl(resourcesText, processesText, event.target.value)} /></label>
            </div>
            {!computation.ok ? <div className="lab-error" role="alert">{computation.message}</div> : currentState && (
              <Metrics analysis={computation.analysis} state={currentState} />
            )}
          </section>

          {computation.ok && currentState && (
            <>
              <div className="deadlock-current-event">
                <ListOrdered size={18} aria-hidden="true" />
                <div><span>当前重放事件</span><strong>{activeStep ? `${stepLabels[activeStep.kind]}${activeStep.processId === undefined ? '' : ` · ${activeStep.processId}`}` : '初始资源分配'}</strong></div>
                <code>{activeStep ? `available=${currentState.availableResources}` : stateSummary(currentState)}</code>
              </div>
              <ResourcePool state={currentState} />
              <ProcessStateView state={currentState} />
            </>
          )}
        </div>

        {computation.ok && (
          <StepExplorer
            key={computationKey}
            steps={computation.explorerSteps}
            onActiveIndexChange={setActiveIndex}
            announceChanges={false}
            className="deadlock-step-explorer"
          />
        )}
      </div>
    </div>
  );
}
