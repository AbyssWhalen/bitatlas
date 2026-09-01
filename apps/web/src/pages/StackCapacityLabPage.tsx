import {
  STACK_CAPACITY_Q2_PRESET,
  traceStackCapacity,
  type StackCapacityStep,
  type StackCapacityTrace,
} from '@408os/lab-core';
import {
  ArrowRight,
  BookOpenCheck,
  Inbox,
  Layers3,
  ListOrdered,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { DataStructuresModuleTabs } from '../components/DataStructuresModuleTabs';
import { LabSectionNav } from '../components/LabSectionNav';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SuccessfulComputation {
  readonly ok: true;
  readonly inputOrder: readonly string[];
  readonly outputOrder: readonly string[];
  readonly trace: StackCapacityTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type StackCapacityComputation = SuccessfulComputation | FailedComputation;

function parseOrder(text: string): string[] {
  return text.split(/[\s,，]+/u).filter(Boolean);
}

function sequenceText(values: readonly string[]): string {
  return values.length ? values.join(' -> ') : '空';
}

function stackText(values: readonly string[]): string {
  return values.length ? values.join(',') : 'empty';
}

function stepLabel(step: StackCapacityStep): string {
  if (step.action === 'push') return `${step.value} 入栈`;
  if (step.action === 'pop') return `${step.value} 出栈并进入输出序列`;
  return `等待输出 ${step.targetOutput}`;
}

function currentEventLabel(step: StackCapacityStep): string {
  if (step.action === 'push') return `将 ${step.value} 压入栈顶`;
  if (step.action === 'pop') return `将 ${step.value} 从栈顶移至输出`;
  return `准备产生目标输出 ${step.targetOutput}`;
}

function computeStackCapacity(inputText: string, outputText: string): StackCapacityComputation {
  try {
    const inputOrder = parseOrder(inputText);
    const outputOrder = parseOrder(outputText);
    const trace = traceStackCapacity({ inputOrder, outputOrder });
    const explorerSteps = trace.steps.map((step) => ({
      id: step.id,
      label: stepLabel(step),
      value: `stack=[${stackText(step.stack)}] · output=[${stackText(step.produced)}] · peak=${step.peakDepth}`,
    }));
    return { ok: true, inputOrder, outputOrder, trace, explorerSteps };
  } catch (reason) {
    return {
      ok: false,
      message: reason instanceof Error ? reason.message : '无法推导栈最小容量。',
    };
  }
}

function TokenSequence({
  label,
  values,
  emptyText,
  kind,
}: {
  label: string;
  values: readonly string[];
  emptyText: string;
  kind: 'input' | 'output';
}) {
  return (
    <div className="stack-capacity-sequence" aria-label={label} data-sequence-kind={kind}>
      {values.length ? values.map((value, index) => (
        <span key={`${value}:${index}`} data-sequence-value={value}>
          <code>{value}</code>
          {index < values.length - 1 && <ArrowRight size={13} aria-hidden="true" />}
        </span>
      )) : <span className="stack-capacity-empty">{emptyText}</span>}
    </div>
  );
}

function StackStatePanel({
  inputOrder,
  step,
}: {
  inputOrder: readonly string[];
  step: StackCapacityStep;
}) {
  const remainingInput = inputOrder.slice(step.inputIndex);
  const topFirst = [...step.stack].reverse();

  return (
    <section className="lab-control-panel stack-capacity-state-panel" aria-labelledby="stack-capacity-state-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">STACK STATE</span><h2 id="stack-capacity-state-heading">当前确定性状态</h2></div>
        <Layers3 size={19} aria-hidden="true" />
      </div>

      <div className="stack-capacity-flow">
        <div className="stack-capacity-flow-section">
          <div className="stack-capacity-flow-heading"><span>尚未入栈</span><strong>{remainingInput.length}</strong></div>
          <TokenSequence label="尚未入栈的元素" values={remainingInput} emptyText="全部元素均已入栈" kind="input" />
        </div>

        <div className="stack-capacity-stack-section">
          <div className="stack-capacity-flow-heading"><span>栈顶</span><strong aria-label="当前栈深度">{step.depth}</strong></div>
          <div className="stack-capacity-stack" aria-label="当前栈" data-stack-depth={step.depth}>
            {topFirst.length ? topFirst.map((value, index) => (
              <div key={value} data-stack-value={value} data-stack-position={index === 0 ? 'top' : 'body'}>
                <small>{index === 0 ? 'TOP' : `+${index}`}</small><strong>{value}</strong>
              </div>
            )) : <span className="stack-capacity-empty">空栈</span>}
          </div>
          <div className="stack-capacity-base">STACK S</div>
        </div>

        <div className="stack-capacity-flow-section">
          <div className="stack-capacity-flow-heading"><span>已出栈并入队</span><strong>{step.produced.length}</strong></div>
          <TokenSequence label="已出栈并入队的顺序" values={step.produced} emptyText="尚未产生输出" kind="output" />
          <small className="stack-capacity-honesty-note">这里只记录确定的输出前缀，不推断队列驻留时刻或占用量。</small>
        </div>
      </div>
    </section>
  );
}

export function StackCapacityLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetInput = STACK_CAPACITY_Q2_PRESET.config.inputOrder.join(',');
  const presetOutput = STACK_CAPACITY_Q2_PRESET.config.outputOrder.join(',');
  const inputText = searchParams.get('input') ?? presetInput;
  const outputText = searchParams.get('output') ?? presetOutput;
  const computationKey = `${inputText}\u0000${outputText}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(
    () => computeStackCapacity(inputText, outputText),
    [inputText, outputText],
  );
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => (
      current.key === computationKey && current.index === index
        ? current
        : { key: computationKey, index }
    ));
  }, [computationKey]);
  const safeActiveIndex = computation.ok ? Math.min(activeIndex, computation.trace.steps.length - 1) : 0;
  const currentStep = computation.ok ? computation.trace.steps[safeActiveIndex]! : null;
  const question = useMemo(
    () => questions.find((candidate) => (
      candidate.id === STACK_CAPACITY_Q2_PRESET.sourceQuestionId
      || (candidate.year === 2009 && candidate.number === 2)
    )),
    [questions],
  );

  const updateUrl = (nextInput: string, nextOutput: string) => {
    setActiveIndex(0);
    setSearchParams({
      module: 'stack-capacity',
      input: nextInput,
      output: nextOutput,
    }, { replace: true });
  };

  const restorePreset = () => {
    setActiveIndex(0);
    setSearchParams({
      module: 'stack-capacity',
      preset: STACK_CAPACITY_Q2_PRESET.sourceQuestionId,
    }, { replace: true });
  };

  const practiceQ2 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q2 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page stack-capacity-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">DATA STRUCTURES LAB / STACK</span><h1>栈最小容量实验室</h1><p>按目标输出顺序重放入栈与出栈，并用历史最高水位确定所需容量。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ2()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q2'}
        </button>
      </header>
      <LabSectionNav />
      <DataStructuresModuleTabs active="stack-capacity" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="ds-review-band stack-capacity-review-band">
        <span><ShieldAlert size={16} aria-hidden="true" />本地练习预设 · Q2</span>
        <strong>{question?.reviewStatus ?? STACK_CAPACITY_Q2_PRESET.reviewStatus}</strong>
        <small>原题序列来自待人工复核题包；此页只推导栈操作与最小容量，不提升审核状态，也不虚构队列时序。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q02')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><Layers3 size={18} aria-hidden="true" /><span>LIFO · 目标输出 · 历史最高水位</span><ListOrdered size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid stack-capacity-lab-grid">
        <div className="stack-capacity-workbench">
          <section className="lab-control-panel stack-capacity-control-panel" aria-labelledby="stack-capacity-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">INPUT / OUTPUT ORDER</span><h2 id="stack-capacity-control-heading">序列参数</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q2 预设</button>
            </div>
            <div className="stack-capacity-input-grid">
              <label className="lab-input-field"><span>入栈顺序</span><input aria-label="入栈顺序" value={inputText} onChange={(event) => updateUrl(event.target.value, outputText)} /></label>
              <label className="lab-input-field"><span>目标出栈顺序</span><input aria-label="目标出栈顺序" value={outputText} onChange={(event) => updateUrl(inputText, event.target.value)} /></label>
            </div>
            {!computation.ok ? <div className="lab-error" role="alert">{computation.message}</div> : (
              <div className="stack-capacity-metrics" aria-label="栈容量指标">
                <div aria-label="最小栈容量"><small>最小栈容量</small><strong>{computation.trace.result.minimumCapacity}</strong></div>
                <div aria-label="当前峰值深度"><small>当前峰值深度</small><strong>{currentStep?.peakDepth ?? 0}</strong></div>
                <div><small>完整操作数</small><strong>{computation.trace.result.operationCount}</strong></div>
              </div>
            )}
          </section>

          {computation.ok && currentStep && (
            <>
              <div className="stack-capacity-current-event" aria-live="polite" aria-atomic="true">
                <Inbox size={18} aria-hidden="true" />
                <div><span>当前重放事件</span><strong>{currentEventLabel(currentStep)}</strong></div>
                <code>depth={currentStep.depth} · peak={currentStep.peakDepth} · output={sequenceText(currentStep.produced)}</code>
              </div>
              <StackStatePanel inputOrder={computation.inputOrder} step={currentStep} />
            </>
          )}
        </div>

        {computation.ok && (
          <StepExplorer
            key={computationKey}
            steps={computation.explorerSteps}
            onActiveIndexChange={setActiveIndex}
            announceChanges={false}
            className="stack-capacity-step-explorer"
          />
        )}
      </div>
    </div>
  );
}
