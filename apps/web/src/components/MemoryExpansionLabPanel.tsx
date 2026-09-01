import {
  MEMORY_EXPANSION_Q15_PRESET,
  analyzeMemoryExpansion,
  type MemoryExpansionConfig,
  type MemoryExpansionError,
  type MemoryExpansionStep,
  type MemoryRegionExpansion,
} from '@408os/cpu-core';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StepExplorer, type ExplorerStep } from './StepExplorer';

type ConfigKey = keyof MemoryExpansionConfig;

interface InputSpec {
  readonly param: string;
  readonly key: ConfigKey;
  readonly label: string;
  readonly shortLabel: string;
}

const INPUTS: readonly InputSpec[] = [
  { param: 'totalBytes', key: 'totalMemoryBytes', label: '主存总容量 B', shortLabel: '主存总容量' },
  { param: 'romBytes', key: 'romBytes', label: 'ROM 容量 B', shortLabel: 'ROM 容量' },
  { param: 'romWords', key: 'romChipWords', label: 'ROM 芯片字数', shortLabel: 'ROM 芯片字数' },
  { param: 'romBits', key: 'romChipBits', label: 'ROM 芯片位宽 bit', shortLabel: 'ROM 芯片位宽' },
  { param: 'ramWords', key: 'ramChipWords', label: 'RAM 芯片字数', shortLabel: 'RAM 芯片字数' },
  { param: 'ramBits', key: 'ramChipBits', label: 'RAM 芯片位宽 bit', shortLabel: 'RAM 芯片位宽' },
];

const INTEGER_PATTERN = /^\d+$/u;

function formatCapacity(bytes: number): string {
  if (bytes % 1_024 === 0) return `${bytes / 1_024} KB`;
  return `${bytes} B`;
}

function formatChipGeometry(wordCount: number, wordBits: number): string {
  const words = wordCount % 1_024 === 0 ? `${wordCount / 1_024}K` : String(wordCount);
  return `${words} x ${wordBits} bit`;
}

function coreErrorText(error: MemoryExpansionError): string {
  const messages: Readonly<Record<MemoryExpansionError['code'], string>> = {
    'invalid-config': '存储器扩展参数必须是完整对象。',
    'invalid-total-capacity': '主存总容量必须是大于 0 的安全整数 B。',
    'invalid-rom-capacity': 'ROM 容量必须是大于 0 且小于主存总容量的安全整数 B。',
    'invalid-rom-chip-words': 'ROM 芯片字数必须是大于 0 的安全整数。',
    'invalid-rom-chip-width': 'ROM 芯片位宽必须是大于 0 的安全整数 bit。',
    'invalid-ram-chip-words': 'RAM 芯片字数必须是大于 0 的安全整数。',
    'invalid-ram-chip-width': 'RAM 芯片位宽必须是大于 0 的安全整数 bit。',
    'incompatible-rom-chip-width': 'ROM 芯片位宽必须能整除 8 bit 编址单元。',
    'incompatible-ram-chip-width': 'RAM 芯片位宽必须能整除 8 bit 编址单元。',
    'incompatible-rom-chip-depth': 'ROM 容量必须能被 ROM 芯片字数整除。',
    'incompatible-ram-chip-depth': 'RAM 容量必须能被 RAM 芯片字数整除。',
    'arithmetic-overflow': '当前参数的芯片扩展结果超过安全整数范围。',
  };
  return messages[error.code];
}

function stepValue(step: MemoryExpansionStep): string {
  const unit = step.unit === 'bytes'
    ? formatCapacity(step.value)
    : step.unit === 'chips-wide'
      ? `${step.value} 倍位扩展`
      : step.unit === 'banks-deep'
        ? `${step.value} 倍字扩展`
        : `${step.value} 片`;
  return `${step.formula} = ${unit}`;
}

function MemoryChipMatrix({ region }: { readonly region: MemoryRegionExpansion }) {
  const visibleDepth = Math.min(region.depthExpansionFactor, 32);
  const visibleChipCount = visibleDepth * region.widthExpansionFactor;
  const hiddenChipCount = region.chipCount - visibleChipCount;
  const name = region.kind.toUpperCase();

  return (
    <article className={`memory-chip-region ${region.kind}`} aria-label={`${name} 扩展结果`}>
      <header>
        <div><span>{name}</span><strong>{formatCapacity(region.requiredBytes)}</strong></div>
        <code>{formatChipGeometry(region.chipWordCount, region.chipWordBits)}</code>
      </header>
      <dl className="memory-chip-factors">
        <div><dt>位扩展</dt><dd>{region.widthExpansionFactor}</dd></div>
        <div><dt>字扩展</dt><dd>{region.depthExpansionFactor}</dd></div>
        <div><dt>芯片数</dt><dd>{region.chipCount} 片</dd></div>
      </dl>
      <div
        className="memory-chip-matrix"
        style={{ gridTemplateColumns: `repeat(${region.widthExpansionFactor}, minmax(42px, 1fr))` }}
        aria-label={`${name} ${region.depthExpansionFactor} 行 ${region.widthExpansionFactor} 列芯片矩阵`}
      >
        {Array.from({ length: visibleChipCount }, (_, index) => {
          const row = Math.floor(index / region.widthExpansionFactor) + 1;
          const column = index % region.widthExpansionFactor + 1;
          return <span key={`${row}-${column}`} data-memory-chip><small>{name}</small><strong>{row}.{column}</strong></span>;
        })}
      </div>
      {hiddenChipCount > 0 && <small className="memory-chip-omitted">另有 {hiddenChipCount} 片按相同矩阵规则省略显示</small>}
    </article>
  );
}

export function MemoryExpansionLabPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const usesPreset = searchParams.get('preset') === MEMORY_EXPANSION_Q15_PRESET.id;
  const rawValues = Object.fromEntries(INPUTS.map((input) => [
    input.param,
    usesPreset
      ? String(MEMORY_EXPANSION_Q15_PRESET.config[input.key])
      : (searchParams.get(input.param) ?? String(MEMORY_EXPANSION_Q15_PRESET.config[input.key])),
  ])) as Record<string, string>;

  let parseError: string | null = null;
  const numericValues: Partial<Record<ConfigKey, number>> = {};
  for (const input of INPUTS) {
    const raw = rawValues[input.param]!.trim();
    if (!raw || !INTEGER_PATTERN.test(raw)) {
      parseError = `${input.shortLabel}必须是正整数。`;
      break;
    }
    numericValues[input.key] = Number(raw);
  }

  const analysis = parseError
    ? null
    : analyzeMemoryExpansion(numericValues as unknown as MemoryExpansionConfig);
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
    next.set('module', 'memory-expansion');
    for (const input of INPUTS) {
      next.set(input.param, input.param === param ? value : rawValues[input.param]!);
    }
    setActiveStepIndex(0);
    setSearchParams(next, { replace: true });
  };

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({
      module: 'memory-expansion',
      preset: MEMORY_EXPANSION_Q15_PRESET.id,
    }, { replace: true });
  };

  return (
    <div className="lab-panel-grid memory-expansion-lab-layout">
      <section className="lab-control-panel memory-expansion-control-panel" aria-labelledby="memory-expansion-heading">
        <div className="lab-control-heading">
          <div>
            <span className="eyebrow">2009 Q15 / MEMORY EXPANSION</span>
            <h2 id="memory-expansion-heading">存储器芯片扩展</h2>
          </div>
          <div className="memory-expansion-heading-actions">
            <span className="review-status-tag">{MEMORY_EXPANSION_Q15_PRESET.reviewStatus}</span>
            <button type="button" className="secondary-command compact-command" onClick={() => navigate('/knowledge?subject=computer-organization&node=topic-2009-q15')}>
              查看知识节点<ArrowRight size={14} aria-hidden="true" />
            </button>
            <button type="button" className="icon-command" onClick={restorePreset} title="恢复 Q15 预设" aria-label="恢复 Q15 预设">
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="memory-expansion-config-grid">
          {INPUTS.map((input) => (
            <label className="lab-input-field" key={input.param}>
              <span>{input.label}</span>
              <input
                type="number"
                aria-label={input.label}
                min="1"
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
          <>
            <div className="memory-capacity-partition" aria-label="容量分区">
              <div className="memory-capacity-track" aria-hidden="true">
                <span className="rom" style={{ flexGrow: trace.result.romBytes }} />
                <span className="ram" style={{ flexGrow: trace.result.ramBytes }} />
              </div>
              <dl>
                <div><dt>主存</dt><dd>{formatCapacity(trace.result.totalMemoryBytes)}</dd></div>
                <div><dt>ROM</dt><dd>{formatCapacity(trace.result.romBytes)}</dd></div>
                <div><dt>RAM</dt><dd>{formatCapacity(trace.result.ramBytes)}</dd></div>
                <div><dt>编址单元</dt><dd>{trace.result.byteWidthBits} bit</dd></div>
              </dl>
            </div>

            <div className="memory-expansion-summary">
              <div><small>ROM 芯片</small><strong>{trace.result.rom.chipCount}</strong><span>片</span></div>
              <div><small>RAM 芯片</small><strong>{trace.result.ram.chipCount}</strong><span>片</span></div>
              <div><small>总芯片数</small><strong aria-label="总芯片数">{trace.result.totalChipCount}</strong><span>片</span></div>
              <div><small>题目答案</small><strong aria-label="题目答案">{usesPreset ? 'D' : '--'}</strong><span>{trace.result.capacityConserved ? '容量守恒' : '容量不守恒'}</span></div>
            </div>

            <div className="memory-expansion-current-event" aria-live="polite" aria-label="当前推导事件">
              <strong>{activeStep?.label}</strong>
              <span>{activeStep?.value}</span>
            </div>

            <div className="memory-chip-regions">
              <MemoryChipMatrix region={trace.result.rom} />
              <MemoryChipMatrix region={trace.result.ram} />
            </div>
          </>
        )}
      </section>

      {trace && (
        <StepExplorer
          key={INPUTS.map((input) => rawValues[input.param]).join(':')}
          className="memory-expansion-step-explorer"
          steps={steps}
          onActiveIndexChange={setActiveStepIndex}
          announceChanges={false}
        />
      )}
    </div>
  );
}
