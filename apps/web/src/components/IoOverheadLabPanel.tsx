import {
  IO_OVERHEAD_Q43_PRESET,
  analyzeIoOverhead,
  type IoOverheadConfig,
  type IoOverheadError,
} from '@408os/cpu-core';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StepExplorer, type ExplorerStep } from './StepExplorer';

type ConfigKey = keyof IoOverheadConfig;

interface InputSpec {
  readonly param: string;
  readonly key: ConfigKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly step?: string;
  readonly min?: string;
}

const INPUTS: readonly InputSpec[] = [
  { param: 'cpu', key: 'cpuFrequencyMHz', label: 'CPU 频率 MHz', shortLabel: 'CPU 频率', step: 'any', min: '0' },
  { param: 'cpi', key: 'cpi', label: '平均 CPI', shortLabel: 'CPI', step: 'any', min: '0' },
  { param: 'irqRate', key: 'interruptDataRateMBps', label: '中断数据率 MB/s', shortLabel: '中断数据率', step: 'any', min: '0' },
  { param: 'irqBits', key: 'interruptTransferBits', label: '每次中断传输 bit', shortLabel: '中断传输位数', step: '1', min: '1' },
  { param: 'irqService', key: 'interruptServiceInstructions', label: '中断服务指令数', shortLabel: '中断服务指令数', step: '1', min: '0' },
  { param: 'irqOther', key: 'interruptOtherInstructions', label: '中断其他开销指令数', shortLabel: '中断其他开销指令数', step: '1', min: '0' },
  { param: 'dmaRate', key: 'dmaDataRateMBps', label: 'DMA 数据率 MB/s', shortLabel: 'DMA 数据率', step: 'any', min: '0' },
  { param: 'dmaBlock', key: 'dmaBlockBytes', label: 'DMA 块大小 B', shortLabel: 'DMA 块大小', step: '1', min: '1' },
  { param: 'dmaCycles', key: 'dmaCpuOverheadCyclesPerBlock', label: 'DMA 每块 CPU 开销 cycles', shortLabel: 'DMA 每块 CPU 开销', step: '1', min: '0' },
];

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu;

function compactNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(12)));
}

function percent(value: number | null): string {
  return value === null ? '--' : `${compactNumber(value)}%`;
}

function coreErrorText(error: IoOverheadError): string {
  const messages: Readonly<Record<IoOverheadError['code'], string>> = {
    'invalid-cpu-frequency': 'CPU 频率必须是大于 0 的有限数。',
    'invalid-cpi': 'CPI 必须是大于 0 的有限数。',
    'invalid-interrupt-rate': '中断数据率必须是非负有限数。',
    'invalid-interrupt-transfer-size': '中断传输位数必须是按字节对齐的正整数。',
    'invalid-interrupt-instructions': '中断指令数必须是非负安全整数。',
    'invalid-dma-rate': 'DMA 数据率必须是非负有限数。',
    'invalid-dma-block-size': 'DMA 块大小必须是正安全整数。',
    'invalid-dma-overhead': 'DMA 每块 CPU 开销必须是非负安全整数。',
    'arithmetic-overflow': '当前参数的推导结果超过有限数值范围。',
  };
  return messages[error.code];
}

function stepValue(step: { readonly formula: string; readonly value: number; readonly unit: string }): string {
  return `${step.formula} = ${compactNumber(step.value)} ${step.unit}`;
}

export function IoOverheadLabPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const usesPreset = searchParams.get('preset') === IO_OVERHEAD_Q43_PRESET.id;
  const rawValues = Object.fromEntries(INPUTS.map((input) => [
    input.param,
    usesPreset
      ? String(IO_OVERHEAD_Q43_PRESET.config[input.key])
      : (searchParams.get(input.param) ?? String(IO_OVERHEAD_Q43_PRESET.config[input.key])),
  ])) as Record<string, string>;

  let parseError: string | null = null;
  const numericValues: Partial<Record<ConfigKey, number>> = {};
  for (const input of INPUTS) {
    const raw = rawValues[input.param]!.trim();
    if (!raw || !NUMBER_PATTERN.test(raw)) {
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
    : analyzeIoOverhead(numericValues as unknown as IoOverheadConfig);
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
    next.set('module', 'io-overhead');
    for (const input of INPUTS) {
      next.set(input.param, input.param === param ? value : rawValues[input.param]!);
    }
    setSearchParams(next, { replace: true });
  };

  const restorePreset = () => {
    const next = new URLSearchParams();
    next.set('module', 'io-overhead');
    next.set('preset', IO_OVERHEAD_Q43_PRESET.id);
    setActiveStepIndex(0);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="lab-panel-grid io-overhead-lab-layout">
      <section className="lab-control-panel" aria-labelledby="io-overhead-heading">
        <div className="lab-control-heading">
          <div>
            <span className="eyebrow">2009 Q43 / I/O OVERHEAD</span>
            <h2 id="io-overhead-heading">中断与 DMA CPU 开销</h2>
          </div>
          <div className="lab-field-row">
            <span className="review-status-tag">{IO_OVERHEAD_Q43_PRESET.reviewStatus}</span>
            <button
              type="button"
              className="icon-command"
              onClick={restorePreset}
              title="恢复 Q43 预设"
              aria-label="恢复 Q43 预设"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="io-overhead-config-grid">
          {INPUTS.map((input) => (
            <label className="lab-input-field" key={input.param}>
              <span>{input.label}</span>
              <input
                type="number"
                aria-label={input.label}
                min={input.min}
                step={input.step}
                value={rawValues[input.param]}
                onChange={(event) => updateInput(input.param, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="io-overhead-boundary">
          <strong>题设边界</strong>
          <span>1 MB = 1,000,000 B</span>
          <small>DMA 与 CPU 无访存冲突</small>
        </div>

        {errorMessage ? (
          <div className="lab-error" role="alert">{errorMessage}</div>
        ) : trace && (
          <>
            <div className="io-overhead-metrics">
              <div>
                <small>中断方式 CPU 占用</small>
                <strong aria-label="中断方式 CPU 占用">{percent(trace.result.interrupt.utilizationPercent)}</strong>
                {!trace.result.interrupt.sustainable && <span>不可持续</span>}
              </div>
              <div>
                <small>DMA 方式 CPU 占用</small>
                <strong aria-label="DMA 方式 CPU 占用">{percent(trace.result.dma.utilizationPercent)}</strong>
                {!trace.result.dma.sustainable && <span>不可持续</span>}
              </div>
              <div>
                <small>CPU 开销相对降低</small>
                <strong aria-label="CPU 开销相对降低">{percent(trace.result.relativeCpuReductionPercent)}</strong>
                <span>相对中断方式</span>
              </div>
            </div>

            <div className="io-overhead-current-event" aria-live="polite" aria-label="当前推导事件">
              <strong>{activeStep?.label}</strong>
              <span>{activeStep?.value}</span>
            </div>
          </>
        )}
      </section>

      {trace && (
        <StepExplorer
          key={INPUTS.map((input) => rawValues[input.param]).join(':')}
          className="io-overhead-step-explorer"
          steps={steps}
          onActiveIndexChange={setActiveStepIndex}
          announceChanges={false}
        />
      )}
    </div>
  );
}
