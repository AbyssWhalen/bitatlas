import {
  formatQ45Action,
  parseQ45Script,
  Q45_BUFFER_PRESET,
  simulateQ45,
  type Q45Action,
  type Q45Event,
  type Q45ProcessId,
  type Q45State,
  type Q45Trace,
  type Q45TraceStep,
} from '@408os/lab-core';
import { BookOpenCheck, Boxes, ListOrdered, LockKeyhole, RotateCcw, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { OsModuleTabs } from '../components/OsModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SuccessfulComputation {
  readonly ok: true;
  readonly trace: Q45Trace;
  readonly snapshots: readonly Q45State[];
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type SemaphoreComputation = SuccessfulComputation | FailedComputation;

const semaphoreIds = ['mutex', 'empty', 'odd', 'even'] as const;
const processIds = ['P1', 'P2', 'P3'] as const;

const semaphoreLabels: Record<(typeof semaphoreIds)[number], string> = {
  mutex: '缓冲区互斥',
  empty: '空槽位许可',
  odd: '可取奇数',
  even: '可取偶数',
};

const processLabels: Record<Q45ProcessId, string> = {
  P1: '生产正整数',
  P2: '取奇数并计数',
  P3: '取偶数并计数',
};

const stageLabels: Record<string, string> = {
  idle: '就绪',
  produced: '已生成，等待空槽',
  'waiting-empty': '阻塞于 empty',
  'has-empty': '已获 empty',
  'waiting-category': '阻塞于类别许可',
  'has-category': '已获类别许可',
  'waiting-mutex': '阻塞于 mutex',
  critical: '持有 mutex',
  put: '已写入，持有 mutex',
  'put-released': '已写入，等待发布类别',
  got: '已取值，持有 mutex',
  'released-mutex': '已取值，等待归还 empty',
  'released-empty': '已归还 empty，等待计数',
};

function parseCapacity(text: string): number {
  if (!/^[1-9][0-9]*$/u.test(text.trim())) throw new Error('缓冲区容量 N 必须是正整数。');
  const capacity = Number(text);
  if (!Number.isSafeInteger(capacity)) throw new Error('缓冲区容量超出安全整数范围。');
  if (capacity > 8) throw new Error('可视化缓冲区容量最多为 8。');
  return capacity;
}

function actionLabel(action: Q45Action, event?: Q45Event): string {
  if (event?.outcome === 'blocked') return `${formatQ45Action(action)} · 阻塞入队`;
  if (event?.outcome === 'woken') return `${formatQ45Action(action)} · 直接唤醒 ${event.wokenProcessId}`;
  return formatQ45Action(action);
}

function stateSummary(state: Q45State, event?: Q45Event): string {
  const values = semaphoreIds.map((id) => `${id}=${state.semaphore.semaphores[id]?.value ?? '?'}`);
  const queues = semaphoreIds
    .map((id) => [id, state.semaphore.semaphores[id]?.blockedQueue ?? []] as const)
    .filter(([, queue]) => queue.length > 0)
    .map(([id, queue]) => `${id}[${queue.join(',')}]`);
  const buffer = state.buffer.map((value) => value ?? '·').join('|');
  const wake = event?.wokenProcessId ? `唤醒=${event.wokenProcessId}` : null;
  return [`buffer=[${buffer}]`, ...values, ...queues, wake].filter(Boolean).join(' · ');
}

function computeSemaphore(capacityText: string, script: string): SemaphoreComputation {
  try {
    const capacity = parseCapacity(capacityText);
    const actions = parseQ45Script(script);
    const trace = simulateQ45(capacity, actions);
    const snapshots = [trace.initialState, ...trace.steps.map((step) => step.state)];
    const explorerSteps: ExplorerStep[] = [
      { id: 'semaphore-initial', label: '初始状态', value: stateSummary(trace.initialState) },
      ...trace.steps.map((step) => ({
        id: `semaphore-step-${step.index}`,
        label: actionLabel(step.action, step.event),
        value: stateSummary(step.state, step.event),
      })),
    ];
    return { ok: true, trace, snapshots, explorerSteps };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : '无法重放 Q45 信号量脚本。' };
  }
}

function BufferView({ state }: { state: Q45State }) {
  return (
    <section className="lab-control-panel semaphore-buffer-panel" aria-labelledby="semaphore-buffer-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">BOUNDED BUFFER</span><h2 id="semaphore-buffer-heading">容量 N 缓冲区</h2></div>
        <strong>{state.buffer.filter((value) => value !== null).length} / {state.capacity}</strong>
      </div>
      <div className="semaphore-buffer-viewport">
        <div className="semaphore-buffer-slots" data-buffer-capacity={state.capacity}>
          {state.buffer.map((value, index) => (
            <div
              className={`semaphore-buffer-slot ${value === null ? 'empty' : value % 2 === 1 ? 'odd' : 'even'}`}
              data-buffer-slot={index}
              data-buffer-value={value ?? ''}
              key={index}
            >
              <small>slot {index}</small>
              <strong>{value ?? '空'}</strong>
              <span>{value === null ? 'empty' : value % 2 === 1 ? '奇数' : '偶数'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="semaphore-counts" aria-label="消费计数">
        <span><small>P2 countodd</small><strong>{state.counts.odd}</strong></span>
        <span><small>P3 counteven</small><strong>{state.counts.even}</strong></span>
      </div>
    </section>
  );
}

function SemaphoreStateView({ state }: { state: Q45State }) {
  return (
    <section className="lab-control-panel semaphore-state-panel" aria-labelledby="semaphore-state-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">AVAILABLE PERMITS</span><h2 id="semaphore-state-heading">四个信号量</h2></div>
        <LockKeyhole size={19} aria-hidden="true" />
      </div>
      <div className="semaphore-value-grid">
        {semaphoreIds.map((id) => {
          const semaphore = state.semaphore.semaphores[id]!;
          return (
            <article key={id} data-semaphore-id={id} data-semaphore-value={semaphore.value}>
              <div><code>{id}</code><strong>{semaphore.value}</strong></div>
              <span>{semaphoreLabels[id]}</span>
              <div className="semaphore-queue" aria-label={`${id} FIFO 阻塞队列`}>
                <small>FIFO</small>
                {semaphore.blockedQueue.length > 0
                  ? semaphore.blockedQueue.map((processId) => <b key={processId}>{processId}</b>)
                  : <em>队列空</em>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProcessStateView({ state }: { state: Q45State }) {
  return (
    <section className="lab-control-panel semaphore-process-panel" aria-labelledby="semaphore-process-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">PROCESS STATE</span><h2 id="semaphore-process-heading">进程与许可阶段</h2></div>
        <Users size={19} aria-hidden="true" />
      </div>
      <div className="semaphore-process-list">
        {processIds.map((processId) => {
          const process = state.semaphore.processes[processId]!;
          const local = state.locals[processId];
          const pendingValue = processId === 'P1'
            ? state.locals.P1.pendingValue
            : processId === 'P2'
              ? state.locals.P2.extractedValue
              : state.locals.P3.extractedValue;
          return (
            <article key={processId} data-process-id={processId} data-process-status={process.status}>
              <strong>{processId}</strong>
              <div><span>{processLabels[processId]}</span><small>{stageLabels[local.stage]}</small></div>
              <code>{process.blockedOn ?? (pendingValue === null ? 'ready' : `value=${pendingValue}`)}</code>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CurrentEvent({ step }: { step: Q45TraceStep | undefined }) {
  return (
    <section className="semaphore-current-event" aria-live="polite" data-event-outcome={step?.event.outcome ?? 'initial'}>
      <ListOrdered size={18} aria-hidden="true" />
      <div>
        <span>当前原子操作</span>
        <strong>{step ? actionLabel(step.action, step.event) : '尚未执行动作'}</strong>
      </div>
      <code>{step?.event.wokenProcessId
        ? `许可直接移交给 ${step.event.wokenProcessId}；${step.event.semaphoreId} 保持 ${step.event.semaphoreEvent?.valueAfter}`
        : step ? `outcome=${step.event.outcome}` : 'initial state'}</code>
    </section>
  );
}

export function SemaphoreLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const capacityText = searchParams.get('capacity') ?? String(Q45_BUFFER_PRESET.capacity);
  const script = searchParams.get('script') ?? Q45_BUFFER_PRESET.script;
  const computationKey = `${capacityText}:${script}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => computeSemaphore(capacityText, script), [capacityText, script]);
  const questionId = useMemo(
    () => questions.find((question) => (
      question.id === Q45_BUFFER_PRESET.sourceQuestionId
      || (question.year === 2009 && question.number === 45)
    ))?.id ?? null,
    [questions],
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
  const activeStep = computation.ok && safeActiveIndex > 0
    ? computation.trace.steps[safeActiveIndex - 1]
    : undefined;

  const updateCustomUrl = (nextCapacity: string, nextScript: string) => {
    setSearchParams({
      module: 'semaphore',
      preset: Q45_BUFFER_PRESET.sourceQuestionId,
      capacity: nextCapacity,
      script: nextScript,
    }, { replace: true });
  };

  const restorePreset = () => {
    setActiveIndex(0);
    setSearchParams({ module: 'semaphore', preset: Q45_BUFFER_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ45 = async () => {
    if (!questionId || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([questionId], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q45 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page semaphore-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">OS LAB / SEMAPHORE</span><h1>信号量同步实验室</h1><p>重放奇偶生产者-消费者的缓冲区、许可转移与阻塞队列。</p></div>
        <button className="secondary-command" type="button" disabled={!questionId || starting} onClick={() => void practiceQ45()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q45'}
        </button>
      </header>
      <LabSectionNav />
      <OsModuleTabs active="semaphore" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="vm-review-band">
        <span><Boxes size={16} aria-hidden="true" />本地练习预设 · Q45</span>
        <strong>{Q45_BUFFER_PRESET.reviewStatus}</strong>
        <small>参数来自待人工复核题包；FIFO 是本实验的确定性教学调度约定。</small>
      </div>

      <div className="lab-module-heading"><LockKeyhole size={18} aria-hidden="true" /><span>容量同步 · 类别同步 · 缓冲区互斥</span><ListOrdered size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid semaphore-lab-grid">
        <div className="semaphore-workbench">
          <section className="lab-control-panel semaphore-control-panel" aria-labelledby="semaphore-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">CONFIG / SCRIPT</span><h2 id="semaphore-control-heading">容量与操作序列</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q45 预设</button>
            </div>
            <label className="lab-input-field semaphore-capacity-field" htmlFor="semaphore-capacity">
              <span>缓冲区容量 N</span>
              <input
                id="semaphore-capacity"
                aria-label="缓冲区容量 N"
                inputMode="numeric"
                value={capacityText}
                onChange={(event) => {
                  setActiveIndex(0);
                  updateCustomUrl(event.target.value, script);
                }}
              />
            </label>
            <label className="lab-input-field full semaphore-script-field" htmlFor="semaphore-action-script">
              <span>Q45 操作脚本</span>
              <textarea
                id="semaphore-action-script"
                aria-label="Q45 操作脚本"
                rows={14}
                spellCheck={false}
                value={script}
                onChange={(event) => {
                  setActiveIndex(0);
                  updateCustomUrl(capacityText, event.target.value);
                }}
              />
            </label>
            {computation.ok
              ? <div className="semaphore-script-status" role="status"><ListOrdered size={16} aria-hidden="true" />{computation.trace.steps.length} 条原子操作 · {computation.snapshots.length} 个可重放状态</div>
              : <div className="lab-error semaphore-error" role="alert">{computation.message}</div>}
          </section>

          {computation.ok && currentState && (
            <>
              <CurrentEvent step={activeStep} />
              <BufferView state={currentState} />
              <SemaphoreStateView state={currentState} />
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
            className="semaphore-step-explorer"
          />
        )}
      </div>
    </div>
  );
}
