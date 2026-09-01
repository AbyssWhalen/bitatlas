import {
  BUS_BANDWIDTH_Q20_PRESET,
  analyzeBusBandwidth,
  type BusBandwidthConfig,
  type BusBandwidthError,
  type BusBandwidthStep,
} from '@408os/cpu-core';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StepExplorer, type ExplorerStep } from './StepExplorer';

type ConfigKey = keyof BusBandwidthConfig;

interface InputSpec {
  readonly param: string;
  readonly key: ConfigKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly integer: boolean;
}

const INPUTS: readonly InputSpec[] = [
  { param: 'bytes', key: 'bytesPerBusCycle', label: '每总线周期传输 B', shortLabel: '每总线周期传输字节数', integer: true },
  { param: 'clocks', key: 'clockCyclesPerBusCycle', label: '每总线周期占用时钟数', shortLabel: '每总线周期占用时钟数', integer: true },
  { param: 'frequency', key: 'busFrequencyMHz', label: '总线时钟频率 MHz', shortLabel: '总线时钟频率', integer: false },
];

const INTEGER_PATTERN = /^\d+$/u;
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu;

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '--';
  if (Number.isInteger(value) && Math.abs(value) < 1_000_000_000_000) return value.toLocaleString('en-US');
  return String(Number(value.toPrecision(12)));
}

function duration(seconds: number): string {
  if (seconds >= 1) return `${compactNumber(seconds)} s`;
  if (seconds >= 1e-3) return `${compactNumber(seconds * 1e3)} ms`;
  if (seconds >= 1e-9) return `${compactNumber(seconds * 1e6)} μs`;
  return `${compactNumber(seconds * 1e9)} ns`;
}

function coreErrorText(error: BusBandwidthError): string {
  const messages: Readonly<Record<BusBandwidthError['code'], string>> = {
    'invalid-config': '总线带宽参数必须是完整对象。',
    'invalid-bytes-per-cycle': '每总线周期传输字节数必须是正整数。',
    'invalid-clock-cycles': '每总线周期占用时钟数必须是正整数。',
    'invalid-frequency': '总线时钟频率必须是大于 0 的有限数。',
    'arithmetic-overflow': '当前参数的推导结果超过有限数值范围。',
  };
  return messages[error.code];
}

function stepValue(step: BusBandwidthStep): string {
  if (step.kind === 'clock-period' || step.kind === 'bus-cycle-duration') return duration(step.value);
  if (step.kind === 'frequency-hz') return `${compactNumber(step.value)} Hz`;
  if (step.kind === 'bus-cycles-per-second') return `${compactNumber(step.value)} bus cycles/s`;
  if (step.kind === 'bandwidth-bytes') return `${compactNumber(step.value)} B/s`;
  if (step.kind === 'bandwidth-megabytes') return `${compactNumber(step.value)} MB/s`;
  return `${compactNumber(step.value)} bit/s · ${compactNumber(step.value / 1_000_000)} Mbit/s`;
}

export function BusBandwidthLabPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const usesPreset = searchParams.get('preset') === BUS_BANDWIDTH_Q20_PRESET.id;
  const rawValues = Object.fromEntries(INPUTS.map((input) => [
    input.param,
    usesPreset
      ? String(BUS_BANDWIDTH_Q20_PRESET.config[input.key])
      : (searchParams.get(input.param) ?? String(BUS_BANDWIDTH_Q20_PRESET.config[input.key])),
  ])) as Record<string, string>;

  let parseError: string | null = null;
  const numericValues: Partial<Record<ConfigKey, number>> = {};
  for (const input of INPUTS) {
    const raw = rawValues[input.param]!.trim();
    if (!raw || (input.integer ? !INTEGER_PATTERN.test(raw) : !NUMBER_PATTERN.test(raw))) {
      parseError = `${input.shortLabel}必须是有效数字。`;
      break;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      parseError = `${input.shortLabel}必须是有限数。`;
      break;
    }
    numericValues[input.key] = value;
  }

  const analysis = parseError
    ? null
    : analyzeBusBandwidth(numericValues as unknown as BusBandwidthConfig);
  const errorMessage = parseError ?? (analysis && !analysis.ok ? coreErrorText(analysis.error) : null);
  const trace = analysis?.ok ? analysis.value : null;
  const steps: readonly ExplorerStep[] = trace?.steps.map((step) => ({
    id: step.id,
    label: step.label,
    value: stepValue(step),
  })) ?? [];
  const safeActiveStepIndex = Math.min(activeStepIndex, Math.max(0, steps.length - 1));
  const activeStep = steps[safeActiveStepIndex];

  const updateInput = (param: string, value: string) => {
    const next = new URLSearchParams();
    next.set('module', 'bus-bandwidth');
    for (const input of INPUTS) {
      next.set(input.param, input.param === param ? value : rawValues[input.param]!);
    }
    setActiveStepIndex(0);
    setSearchParams(next, { replace: true });
  };

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({
      module: 'bus-bandwidth',
      preset: BUS_BANDWIDTH_Q20_PRESET.id,
    }, { replace: true });
  };

  return (
    <div className="lab-panel-grid bus-bandwidth-lab-layout">
      <section className="lab-control-panel bus-bandwidth-control-panel" aria-labelledby="bus-bandwidth-heading">
        <div className="bus-bandwidth-review-band" aria-label="Q20 来源边界">
          <strong>来源边界</strong>
          <span>Q20 公式与参数</span>
          <small>可编辑的是教学示例，不是总线事务时序重放</small>
        </div>

        <div className="lab-control-heading">
          <div>
            <span className="eyebrow">2009 Q20 / BUS BANDWIDTH</span>
            <h2 id="bus-bandwidth-heading">总线带宽</h2>
          </div>
          <div className="bus-bandwidth-heading-actions">
            <span className="review-status-tag">{BUS_BANDWIDTH_Q20_PRESET.reviewStatus}</span>
            <button
              type="button"
              className="secondary-command compact-command"
              onClick={() => navigate('/knowledge?subject=computer-organization&node=topic-2009-q20')}
            >
              查看知识节点<ArrowRight size={14} aria-hidden="true" />
            </button>
            <button type="button" className="icon-command" onClick={restorePreset} title="恢复 Q20 预设" aria-label="恢复 Q20 预设">
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="bus-bandwidth-config-grid">
          {INPUTS.map((input) => (
            <label className="lab-input-field" key={input.param}>
              <span>{input.label}</span>
              <input
                type="number"
                aria-label={input.label}
                min="0"
                step={input.integer ? '1' : 'any'}
                value={rawValues[input.param]}
                onChange={(event) => updateInput(input.param, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="bus-bandwidth-boundary">
          <strong>单位约定</strong>
          <span>1 MHz = 1,000,000 Hz · 1 MB = 1,000,000 B</span>
          <small>不计等待、仲裁、编码和协议开销</small>
        </div>

        {errorMessage ? (
          <div className="lab-error" role="alert">{errorMessage}</div>
        ) : trace && (
          <>
            <div className="bus-bandwidth-equation" aria-label="总线带宽公式">
              <code>{trace.config.bytesPerBusCycle} B ÷ ({trace.config.clockCyclesPerBusCycle} × {duration(trace.result.clockPeriodSeconds)})</code>
              <span>=</span>
              <strong>{compactNumber(trace.result.bandwidthMegabytesPerSecond)} MB/s</strong>
            </div>

            <dl className="bus-bandwidth-metrics">
              <div>
                <dt>时钟周期</dt>
                <dd>{duration(trace.result.clockPeriodSeconds)}</dd>
              </div>
              <div>
                <dt>总线周期</dt>
                <dd>{duration(trace.result.busCycleDurationSeconds)}</dd>
              </div>
              <div aria-label="总线带宽 MB/s">
                <dt>总线带宽</dt>
                <dd>{compactNumber(trace.result.bandwidthMegabytesPerSecond)} MB/s</dd>
              </div>
              <div aria-label="总线带宽 Mbit/s">
                <dt>换算吞吐</dt>
                <dd>{compactNumber(trace.result.bandwidthMegabitsPerSecond)} Mbit/s</dd>
              </div>
              <div aria-label="题目答案">
                <dt>题目答案</dt>
                <dd>{usesPreset ? 'B' : '--'}</dd>
              </div>
            </dl>

            <div className="bus-bandwidth-current-event" aria-live="polite" aria-label="当前推导事件">
              <strong>{activeStep?.label}</strong>
              <span>{activeStep?.value}</span>
            </div>
          </>
        )}
      </section>

      {trace && (
        <StepExplorer
          key={INPUTS.map((input) => rawValues[input.param]).join(':')}
          className="bus-bandwidth-step-explorer"
          steps={steps}
          onActiveIndexChange={setActiveStepIndex}
          announceChanges={false}
        />
      )}
    </div>
  );
}
