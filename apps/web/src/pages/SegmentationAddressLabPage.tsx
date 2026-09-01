import {
  SEGMENTATION_Q27_PRESET,
  SEGMENTATION_MAX_ADDRESS_BITS,
  traceSegmentationAddress,
  type SegmentationAddressConfig,
  type SegmentationAddressStep,
  type SegmentationAddressTrace,
} from '@408os/lab-core';
import { ArrowRight, Binary, BookOpenCheck, MemoryStick, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { OsModuleTabs } from '../components/OsModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SegmentationDraft {
  readonly addressBits: string;
  readonly segmentBits: string;
}

interface SuccessfulComputation {
  readonly ok: true;
  readonly trace: SegmentationAddressTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type Computation = SuccessfulComputation | FailedComputation;

const q27Draft: SegmentationDraft = {
  addressBits: String(SEGMENTATION_Q27_PRESET.config.addressBits),
  segmentBits: String(SEGMENTATION_Q27_PRESET.config.segmentBits),
};

const stepLabels: Record<SegmentationAddressStep['kind'], string> = {
  initial: '读取地址格式',
  'segment-field': '划分段号字段',
  'offset-field': '计算段内位移位数',
  capacity: '计算最大段长',
  complete: '得到最大段长',
};

function parseBits(value: string, label: string): number {
  const normalized = value.trim();
  if (!/^[0-9]+$/u.test(normalized)) throw new Error(`${label}必须是整数。`);
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label}超出安全整数范围。`);
  return parsed;
}

function formatBytes(value: number): string {
  return value.toLocaleString('zh-CN', { useGrouping: false });
}

function formatPowerOfTwo(value: number): string {
  return `2^${Math.log2(value)}`;
}

function errorText(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/addressBits/iu.test(message)) return `地址总位数必须是 2 到 ${SEGMENTATION_MAX_ADDRESS_BITS} 之间的整数。`;
  if (/segmentBits/iu.test(message)) return '段号位数必须是正整数，并且小于地址总位数。';
  return message || '无法完成分段地址推导。';
}

function stepValue(step: SegmentationAddressStep): string {
  const state = step.state;
  if (step.kind === 'initial') return `地址 ${state.addressBits} 位 · 段号 ${state.segmentBits} 位`;
  if (step.kind === 'segment-field') return `段号字段占 ${state.segmentBits} 位`;
  if (step.kind === 'offset-field') return `段内位移 = ${state.addressBits} - ${state.segmentBits} = ${state.offsetBits} 位`;
  return `最大段长 = 2^${state.offsetBits} B`;
}

function compute(draft: SegmentationDraft): Computation {
  try {
    const config: SegmentationAddressConfig = {
      addressBits: parseBits(draft.addressBits, '地址总位数'),
      segmentBits: parseBits(draft.segmentBits, '段号位数'),
    };
    const trace = traceSegmentationAddress(config);
    return {
      ok: true,
      trace,
      explorerSteps: trace.steps.map((step) => ({
        id: step.id,
        label: stepLabels[step.kind],
        value: stepValue(step),
      })),
    };
  } catch (reason) {
    return { ok: false, message: errorText(reason) };
  }
}

function fieldWidth(bits: number, total: number): string {
  return `${(bits / total) * 100}%`;
}

function CurrentStep({ step, trace }: { step: SegmentationAddressStep; trace: SegmentationAddressTrace }) {
  return (
    <section className="segmentation-current-event" aria-live="polite" aria-atomic="true" aria-label="当前分段地址推导步骤">
      <Binary size={18} aria-hidden="true" />
      <div><span>当前推导步骤</span><strong>{stepLabels[step.kind]}</strong><small>{stepValue(step)}</small></div>
      <code>{step.kind === 'complete' ? `${formatBytes(trace.result.maxSegmentLengthBytes)} B` : '等待下一步'}</code>
    </section>
  );
}

function AddressFieldDiagram({ trace }: { trace: SegmentationAddressTrace }) {
  const { addressBits, segmentBits, offsetBits } = trace.result;
  return (
    <section className="lab-control-panel segmentation-field-panel" aria-labelledby="segmentation-field-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">ADDRESS FORMAT / FIELDS</span><h2 id="segmentation-field-heading">地址字段拆分</h2></div>
        <MemoryStick size={19} aria-hidden="true" />
      </div>
      <div className="segmentation-field-ruler" role="img" aria-label={`${addressBits} 位地址由 ${segmentBits} 位段号和 ${offsetBits} 位段内位移组成`}>
        <div className="segmentation-field-segment" style={{ width: fieldWidth(segmentBits, addressBits) }} aria-hidden="true" />
        <div className="segmentation-field-offset" style={{ width: fieldWidth(offsetBits, addressBits) }} aria-hidden="true" />
      </div>
      <div className="segmentation-field-facts">
        <span><small>地址总宽</small><strong>{addressBits} bit</strong></span>
        <span><small>段号字段</small><strong>{segmentBits} bit</strong></span>
        <span><small>段内位移</small><strong>{offsetBits} bit</strong></span>
      </div>
    </section>
  );
}

export function SegmentationAddressLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === SEGMENTATION_Q27_PRESET.sourceQuestionId;
  const draft = useMemo<SegmentationDraft>(() => (presetSelected ? q27Draft : {
    addressBits: searchParams.get('addressBits') ?? q27Draft.addressBits,
    segmentBits: searchParams.get('segmentBits') ?? q27Draft.segmentBits,
  }), [presetSelected, searchParams]);
  const [activePosition, setActivePosition] = useState({ key: `${draft.addressBits}:${draft.segmentBits}`, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => compute(draft), [draft]);
  const computationKey = `${draft.addressBits}:${draft.segmentBits}`;
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => current.key === computationKey && current.index === index ? current : { key: computationKey, index });
  }, [computationKey]);
  const safeActiveIndex = computation.ok ? Math.min(activeIndex, computation.trace.steps.length - 1) : 0;
  const currentStep = computation.ok ? computation.trace.steps[safeActiveIndex]! : null;
  const question = useMemo(() => questions.find((question) => (
    question.id === SEGMENTATION_Q27_PRESET.sourceQuestionId || (question.year === 2009 && question.number === 27)
  )), [questions]);

  const updateUrl = (addressBits: string, segmentBits: string) => {
    setActivePosition({ key: `${addressBits}:${segmentBits}`, index: 0 });
    setSearchParams({ module: 'segmentation-address', addressBits, segmentBits }, { replace: true });
  };

  const restorePreset = () => {
    setActivePosition({ key: `${q27Draft.addressBits}:${q27Draft.segmentBits}`, index: 0 });
    setSearchParams({ module: 'segmentation-address', preset: SEGMENTATION_Q27_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ27 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q27 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page segmentation-address-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">OS LAB / SEGMENTATION</span><h1>分段地址字段实验室</h1><p>把逻辑地址中的段号与段内位移拆开，直接看出最大段长的位数依据。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ27()}><BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q27'}</button>
      </header>
      <LabSectionNav />
      <OsModuleTabs active="segmentation-address" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="vm-review-band segmentation-review-band">
        <span><Binary size={16} aria-hidden="true" />本地练习预设 · Q27</span>
        <strong>{question?.reviewStatus ?? SEGMENTATION_Q27_PRESET.reviewStatus}</strong>
        <small>原题只提供地址总宽与段号宽度；页面只推导段内位移和最大段长，不模拟段表、物理地址或保护机制。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=operating-systems&node=topic-2009-q27')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><Binary size={18} aria-hidden="true" /><span>2009 第 27 题 · 32 位分段地址</span></div>
      <div className="lab-panel-grid segmentation-address-lab-grid">
        <div className="segmentation-address-workbench">
          <section className="lab-control-panel segmentation-address-control" aria-labelledby="segmentation-address-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">CONFIG / ADDRESS WIDTH</span><h2 id="segmentation-address-control-heading">地址参数</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q27 预设</button>
            </div>
            <div className="segmentation-address-input-grid">
              <label className="lab-input-field"><span>地址总位数</span><input aria-label="地址总位数" type="number" min="2" max={SEGMENTATION_MAX_ADDRESS_BITS} step="1" value={draft.addressBits} onChange={(event) => updateUrl(event.target.value, draft.segmentBits)} /></label>
              <label className="lab-input-field"><span>段号位数</span><input aria-label="段号位数" type="number" min="1" value={draft.segmentBits} onChange={(event) => updateUrl(draft.addressBits, event.target.value)} /></label>
            </div>
            {!computation.ok ? <div className="lab-error" role="alert">{computation.message}</div> : (
              <div className="segmentation-address-equation" aria-label="最大段长公式">
                <code>段内位移 = {computation.trace.result.addressBits} - {computation.trace.result.segmentBits}</code><ArrowRight size={18} aria-hidden="true" /><code>{computation.trace.result.offsetBits} bit</code><ArrowRight size={18} aria-hidden="true" /><strong>{formatPowerOfTwo(computation.trace.result.maxSegmentLengthBytes)} B</strong>
              </div>
            )}
          </section>

          {computation.ok && currentStep && <CurrentStep step={currentStep} trace={computation.trace} />}
          {computation.ok && <AddressFieldDiagram trace={computation.trace} />}
        </div>
        {computation.ok ? <StepExplorer key={computationKey} steps={computation.explorerSteps} onActiveIndexChange={setActiveIndex} announceChanges={false} className="segmentation-address-step-explorer" /> : <section className="step-explorer segmentation-address-step-explorer segmentation-address-empty"><Binary size={24} aria-hidden="true" /><strong>等待有效地址参数</strong></section>}
      </div>
    </div>
  );
}
