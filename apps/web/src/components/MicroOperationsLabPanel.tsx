import {
  MICRO_OPERATIONS_Q44_PRESET,
  simulateMicroOperations,
  type MicroOperationError,
  type MicroOperationSchedule,
  type MicroOperationState,
} from '@408os/cpu-core';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StepExplorer, type ExplorerStep } from './StepExplorer';

type WordKey = 'r0' | 'r1' | 'memoryWord';

const WORD_INPUTS: readonly {
  readonly param: string;
  readonly key: WordKey;
  readonly label: string;
}[] = [
  { param: 'r0', key: 'r0', label: 'R0 初值' },
  { param: 'r1', key: 'r1', label: 'R1 地址' },
  { param: 'memoryWord', key: 'memoryWord', label: '目标内存字初值' },
];

const UINT_PATTERN = /^\d+$/u;

function formatWord(value: number | null): string {
  return value === null ? 'unknown' : `0x${value.toString(16).padStart(4, '0')}`;
}

function coreErrorText(error: MicroOperationError): string {
  const messages: Readonly<Record<MicroOperationError['code'], string>> = {
    'invalid-config': '微操作参数必须是完整对象。',
    'invalid-schedule': '方案必须是来源支持的 5 拍并行或 6 拍分步方案。',
    'invalid-r0': 'R0 必须是 0 至 65535 的 16 位无符号整数。',
    'invalid-r1': 'R1 必须是 0 至 65535 的 16 位无符号整数。',
    'invalid-memory-word': '目标内存字必须是 0 至 65535 的 16 位无符号整数。',
    'schedule-invariant': '当前来源方案违反数据通路内部不变量。',
  };
  return messages[error.code];
}

function RegisterState({ state }: { readonly state: MicroOperationState }) {
  const entries = [
    ['R0', state.r0],
    ['R1', state.r1],
    ['A', state.a],
    ['AC', state.ac],
    ['MAR', state.mar],
    ['MDR', state.mdr],
    ['M[R1]', state.memoryWord],
  ] as const;

  return (
    <dl className="micro-operations-registers" aria-label="当前寄存器状态">
      {entries.map(([label, value]) => (
        <div key={label} data-known={value !== null}>
          <dt>{label}</dt>
          <dd>{formatWord(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function BusState({
  label,
  ariaLabel,
  driver,
  value,
}: {
  readonly label: string;
  readonly ariaLabel: string;
  readonly driver: string | null;
  readonly value: number | null;
}) {
  return (
    <article aria-label={ariaLabel} data-active={driver !== null}>
      <span>{label}</span>
      <strong>{driver ?? 'idle'}</strong>
      <code>{driver === null ? '--' : formatWord(value)}</code>
    </article>
  );
}

export function MicroOperationsLabPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const usesPreset = searchParams.get('preset') === MICRO_OPERATIONS_Q44_PRESET.id;
  const rawSchedule = searchParams.get('schedule') ?? MICRO_OPERATIONS_Q44_PRESET.config.schedule;
  const schedule = rawSchedule === 'parallel-5' || rawSchedule === 'split-6'
    ? rawSchedule
    : null;
  const rawValues = Object.fromEntries(WORD_INPUTS.map((input) => [
    input.param,
    usesPreset
      ? String(MICRO_OPERATIONS_Q44_PRESET.config[input.key])
      : (searchParams.get(input.param) ?? String(MICRO_OPERATIONS_Q44_PRESET.config[input.key])),
  ])) as Record<string, string>;

  let parseError = schedule === null ? '方案必须是来源支持的 5 拍并行或 6 拍分步方案。' : null;
  const words: Partial<Record<WordKey, number>> = {};
  if (!parseError) {
    for (const input of WORD_INPUTS) {
      const raw = rawValues[input.param]!.trim();
      if (!raw || !UINT_PATTERN.test(raw)) {
        parseError = `${input.label}必须是 0 至 65535 的 16 位无符号整数。`;
        break;
      }
      words[input.key] = Number(raw);
    }
  }

  const simulation = parseError || schedule === null
    ? null
    : simulateMicroOperations({
        schedule,
        r0: words.r0!,
        r1: words.r1!,
        memoryWord: words.memoryWord!,
      });
  const errorMessage = parseError ?? (simulation && !simulation.ok ? coreErrorText(simulation.error) : null);
  const trace = simulation?.ok ? simulation.value : null;
  const steps: readonly ExplorerStep[] = trace?.steps.map((step) => ({
    id: step.id,
    label: `C${step.cycle} ${step.microOperations.join(' / ')}`,
    value: step.controlSignals.join(', '),
  })) ?? [];
  const safeActiveStepIndex = Math.min(activeStepIndex, Math.max(0, steps.length - 1));
  const activeStep = trace?.steps[safeActiveStepIndex];

  const setSchedule = (nextSchedule: MicroOperationSchedule) => {
    setActiveStepIndex(0);
    if (usesPreset) {
      setSearchParams({
        module: 'micro-operations',
        preset: MICRO_OPERATIONS_Q44_PRESET.id,
        schedule: nextSchedule,
      }, { replace: true });
      return;
    }
    setSearchParams({
      module: 'micro-operations',
      schedule: nextSchedule,
      r0: rawValues.r0!,
      r1: rawValues.r1!,
      memoryWord: rawValues.memoryWord!,
    }, { replace: true });
  };

  const updateInput = (param: string, value: string) => {
    const next = new URLSearchParams();
    next.set('module', 'micro-operations');
    next.set('schedule', rawSchedule);
    for (const input of WORD_INPUTS) {
      next.set(input.param, input.param === param ? value : rawValues[input.param]!);
    }
    setActiveStepIndex(0);
    setSearchParams(next, { replace: true });
  };

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({
      module: 'micro-operations',
      preset: MICRO_OPERATIONS_Q44_PRESET.id,
      schedule: MICRO_OPERATIONS_Q44_PRESET.config.schedule,
    }, { replace: true });
  };

  return (
    <div className="lab-panel-grid micro-operations-lab-layout">
      <section className="lab-control-panel micro-operations-control" aria-labelledby="micro-operations-heading">
        <div className="lab-control-heading">
          <div>
            <span className="eyebrow">2009 Q44 / EXECUTION C5+</span>
            <h2 id="micro-operations-heading">数据通路微操作调度</h2>
          </div>
          <div className="micro-operations-heading-actions">
            <span className="review-status-tag">{MICRO_OPERATIONS_Q44_PRESET.reviewStatus}</span>
            <button type="button" className="secondary-command compact-command" onClick={() => navigate('/knowledge?subject=computer-organization&node=topic-2009-q44')}>
              查看知识节点<ArrowRight size={14} aria-hidden="true" />
            </button>
            <button type="button" className="icon-command" onClick={restorePreset} title="恢复 Q44 预设" aria-label="恢复 Q44 预设">
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="segmented-control micro-operations-schedule" aria-label="来源支持方案">
          <button type="button" className={schedule === 'parallel-5' ? 'active' : ''} aria-pressed={schedule === 'parallel-5'} onClick={() => setSchedule('parallel-5')}>5 拍并行方案</button>
          <button type="button" className={schedule === 'split-6' ? 'active' : ''} aria-pressed={schedule === 'split-6'} onClick={() => setSchedule('split-6')}>6 拍分步方案</button>
        </div>

        <div className="micro-operations-input-grid">
          {WORD_INPUTS.map((input) => (
            <label className="lab-input-field" key={input.param}>
              <span>{input.label}</span>
              <input
                type="number"
                aria-label={input.label}
                min="0"
                max="65535"
                step="1"
                value={rawValues[input.param]}
                onChange={(event) => updateInput(input.param, event.target.value)}
              />
            </label>
          ))}
        </div>

        {errorMessage ? (
          <div className="lab-error" role="alert">{errorMessage}</div>
        ) : trace && (
          <dl className="micro-operations-result" aria-label="架构可见结果">
            <div><dt>目标地址</dt><dd>{formatWord(trace.result.address)}</dd></div>
            <div><dt>读入值</dt><dd>{formatWord(trace.result.valueRead)}</dd></div>
            <div><dt>写回值</dt><dd>{formatWord(trace.result.valueWritten)}</dd></div>
            <div><dt>方案关系</dt><dd>地址与写回结果一致<small>暂存 A 可能不同</small></dd></div>
          </dl>
        )}
      </section>

      {activeStep && (
        <>
          <div className="micro-operations-current-event" aria-live="polite" aria-label="当前微操作">
            <strong>C{activeStep.cycle}</strong>
            <div>{activeStep.microOperations.map((operation) => <code key={operation}>{operation}</code>)}</div>
            <span>{trace?.schedule === 'parallel-5' && activeStep.cycle === 6 ? 'DB 与内总线并行' : '单拍数据传送'}</span>
          </div>

          <section className="lab-control-panel micro-operations-state-panel" aria-label="微操作状态">
            <div className="lab-control-heading">
              <div><span className="eyebrow">CYCLE STATE</span><h2>寄存器与总线</h2></div>
              <span className="micro-operations-cycle-badge">C{activeStep.cycle}</span>
            </div>
            <RegisterState state={activeStep.after} />
            <div className="micro-operations-buses">
              <BusState label="AB" ariaLabel="AB 地址总线" driver={activeStep.buses.address.driver} value={activeStep.buses.address.value} />
              <BusState label="DB" ariaLabel="DB 数据总线" driver={activeStep.buses.data.driver} value={activeStep.buses.data.value} />
              <BusState label="INTERNAL" ariaLabel="CPU 内总线" driver={activeStep.buses.internal.driver} value={activeStep.buses.internal.value} />
            </div>
            <div className="micro-operations-signals" aria-label="有效控制信号">
              {activeStep.controlSignals.map((signal) => <code key={signal}>{signal}</code>)}
            </div>
          </section>
        </>
      )}

      {trace && (
        <StepExplorer
          key={`${trace.schedule}:${rawValues.r0}:${rawValues.r1}:${rawValues.memoryWord}`}
          className="micro-operations-step-explorer"
          steps={steps}
          onActiveIndexChange={setActiveStepIndex}
          announceChanges={false}
        />
      )}
    </div>
  );
}
