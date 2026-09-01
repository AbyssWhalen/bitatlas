import {
  MIN_HEAP_INSERT_Q9_PRESET,
  traceMinHeapInsert,
  type MinHeapInsertStep,
  type MinHeapInsertTrace,
} from '@408os/lab-core';
import {
  ArrowRight,
  BookOpenCheck,
  GitBranch,
  ListOrdered,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { DataStructuresModuleTabs } from '../components/DataStructuresModuleTabs';
import { LabSectionNav } from '../components/LabSectionNav';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SuccessfulComputation {
  readonly ok: true;
  readonly trace: MinHeapInsertTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type MinHeapComputation = SuccessfulComputation | FailedComputation;

function parseHeap(text: string): number[] {
  const tokens = text.split(/[\s,，]+/u).filter(Boolean);
  return tokens.map((token, index) => {
    const value = Number(token);
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`第 ${index + 1} 个堆元素必须是安全整数`);
    }
    return value;
  });
}

function parseInsertedValue(text: string): number {
  if (!text.trim()) throw new RangeError('插入关键字必须是安全整数');
  const value = Number(text);
  if (!Number.isSafeInteger(value)) throw new RangeError('插入关键字必须是安全整数');
  return value;
}

function stepLabel(step: MinHeapInsertStep, insertedValue: number): string {
  if (step.kind === 'initial') return '校验初始小根堆';
  if (step.kind === 'append') return `追加关键字 ${insertedValue}`;
  if (step.kind === 'swap') return `${insertedValue} 与父结点 ${step.comparedValue} 交换`;
  if (step.kind === 'compare') return `${insertedValue} 不小于父结点 ${step.comparedValue}`;
  return `上浮完成，停在索引 ${step.focusIndex}`;
}

function computeMinHeap(heapText: string, valueText: string): MinHeapComputation {
  try {
    const trace = traceMinHeapInsert({
      initialHeap: parseHeap(heapText),
      insertedValue: parseInsertedValue(valueText),
    });
    const explorerSteps = trace.steps.map((step) => ({
      id: step.id,
      label: stepLabel(step, trace.result.insertedValue),
      value: `heap=[${step.heap.join(', ')}] · focus=${step.focusIndex ?? '--'} · parent=${step.parentIndex ?? '--'}`,
    }));
    return { ok: true, trace, explorerSteps };
  } catch (reason) {
    return {
      ok: false,
      message: reason instanceof Error ? reason.message : '无法重放小根堆插入。',
    };
  }
}

function nodePosition(index: number, viewWidth: number) {
  const depth = Math.floor(Math.log2(index + 1));
  const levelStart = 2 ** depth - 1;
  const levelCount = 2 ** depth;
  const position = index - levelStart;
  return {
    x: (position + 1) * (viewWidth / (levelCount + 1)),
    y: 42 + depth * 78,
  };
}

function compactNodeValue(value: number): string {
  const text = String(value);
  return text.length <= 7 ? text : value.toExponential(2);
}

function HeapTree({ step }: { step: MinHeapInsertStep }) {
  const maxDepth = step.heap.length ? Math.floor(Math.log2(step.heap.length)) : 0;
  const viewWidth = Math.max(640, 2 ** maxDepth * 64);
  const viewHeight = Math.max(120, 84 + maxDepth * 78);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const targetIndex = step.focusIndex ?? 0;
    const targetX = nodePosition(targetIndex, viewWidth).x;
    container.scrollLeft = Math.max(0, targetX - container.clientWidth / 2);
  }, [step.id, step.focusIndex, viewWidth]);
  return (
    <div ref={scrollRef} className="min-heap-tree-scroll">
      <svg
        className="min-heap-tree"
        style={{ width: viewWidth }}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label="当前堆树"
        preserveAspectRatio="xMidYMid meet"
      >
        {step.heap.map((_value, index) => {
          if (index === 0) return null;
          const parentIndex = Math.floor((index - 1) / 2);
          const from = nodePosition(parentIndex, viewWidth);
          const to = nodePosition(index, viewWidth);
          const active = (
            step.childIndex === index
            && step.parentIndex === parentIndex
          );
          return <line key={`edge-${index}`} className={active ? 'active' : ''} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
        {step.heap.map((value, index) => {
          const position = nodePosition(index, viewWidth);
          const focus = step.focusIndex === index;
          const compared = step.parentIndex === index && step.childIndex !== null;
          return (
            <g
              key={`${index}:${value}`}
              data-heap-index={index}
              className={`${focus ? 'focus' : ''} ${compared ? 'compared' : ''}`}
              transform={`translate(${position.x} ${position.y})`}
            >
              <circle r="24" />
              <text y="4">{compactNodeValue(value)}</text>
              <title>索引 {index}，值 {value}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HeapState({ step }: { step: MinHeapInsertStep }) {
  return (
    <section className="lab-control-panel min-heap-state-panel" aria-labelledby="min-heap-state-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">COMPLETE BINARY TREE</span><h2 id="min-heap-state-heading">完全二叉树状态</h2></div>
        <GitBranch size={19} aria-hidden="true" />
      </div>
      <HeapTree step={step} />
      <div className="min-heap-array" aria-label="当前层序数组">
        {step.heap.map((value, index) => (
          <div key={`${index}:${value}`} data-active={step.focusIndex === index ? 'true' : 'false'}>
            <small>{index}</small><code>{value}</code>
          </div>
        ))}
      </div>
      <div className="min-heap-root" aria-label="当前根结点">
        <span>当前根结点</span><strong>{step.heap[0] ?? '空'}</strong>
        <small>数组索引 0 · 每个父结点不大于子结点</small>
      </div>
    </section>
  );
}

export function MinHeapInsertLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetHeap = MIN_HEAP_INSERT_Q9_PRESET.config.initialHeap.join(',');
  const presetValue = String(MIN_HEAP_INSERT_Q9_PRESET.config.insertedValue);
  const heapText = searchParams.get('preset') === MIN_HEAP_INSERT_Q9_PRESET.sourceQuestionId
    ? presetHeap
    : (searchParams.get('heap') ?? presetHeap);
  const valueText = searchParams.get('preset') === MIN_HEAP_INSERT_Q9_PRESET.sourceQuestionId
    ? presetValue
    : (searchParams.get('value') ?? presetValue);
  const computationKey = `${heapText}\u0000${valueText}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => computeMinHeap(heapText, valueText), [heapText, valueText]);
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
      candidate.id === MIN_HEAP_INSERT_Q9_PRESET.sourceQuestionId
      || (candidate.year === 2009 && candidate.number === 9)
    )),
    [questions],
  );

  const updateUrl = (nextHeap: string, nextValue: string) => {
    setActiveIndex(0);
    setSearchParams({ module: 'min-heap', heap: nextHeap, value: nextValue }, { replace: true });
  };

  const restorePreset = () => {
    setActiveIndex(0);
    setSearchParams({
      module: 'min-heap',
      preset: MIN_HEAP_INSERT_Q9_PRESET.sourceQuestionId,
    }, { replace: true });
  };

  const practiceQ9 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q9 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page min-heap-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">DATA STRUCTURES LAB / MIN HEAP</span><h1>小根堆插入实验室</h1><p>把新关键字追加到完全二叉树末端，再沿父链逐次比较和上浮。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ9()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q9'}
        </button>
      </header>
      <LabSectionNav />
      <DataStructuresModuleTabs active="min-heap" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="ds-review-band min-heap-review-band">
        <span><ShieldAlert size={16} aria-hidden="true" />本地练习预设 · Q9</span>
        <strong>{question?.reviewStatus ?? MIN_HEAP_INSERT_Q9_PRESET.reviewStatus}</strong>
        <small>原题序列来自待人工复核题包；此页只重放一次插入与上浮，不扩展为建堆、删除或复杂度结论。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q09')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><GitBranch size={18} aria-hidden="true" /><span>完全二叉树 · 父子比较 · 自底向上调整</span><ListOrdered size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid min-heap-lab-grid">
        <div className="min-heap-workbench">
          <section className="lab-control-panel min-heap-control-panel" aria-labelledby="min-heap-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">ARRAY / INSERT KEY</span><h2 id="min-heap-control-heading">堆参数</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q9 预设</button>
            </div>
            <div className="min-heap-input-grid">
              <label className="lab-input-field"><span>初始小根堆</span><input aria-label="初始小根堆" value={heapText} onChange={(event) => updateUrl(event.target.value, valueText)} /></label>
              <label className="lab-input-field"><span>插入关键字</span><input aria-label="插入关键字" type="number" step="1" value={valueText} onChange={(event) => updateUrl(heapText, event.target.value)} /></label>
            </div>
            {!computation.ok ? <div className="lab-error" role="alert">{computation.message}</div> : (
              <div className="min-heap-metrics" aria-label="小根堆插入指标">
                <div aria-label="交换次数"><small>交换次数</small><strong>{computation.trace.result.swapCount}</strong></div>
                <div><small>最终索引</small><strong>{computation.trace.result.finalIndex}</strong></div>
                <div aria-label="最终层序"><small>最终层序</small><strong>{computation.trace.finalHeap.join(', ')}</strong></div>
              </div>
            )}
          </section>

          {computation.ok && currentStep && (
            <>
              <div className="min-heap-current-event" aria-live="polite" aria-atomic="true" aria-label="当前堆事件">
                <GitBranch size={18} aria-hidden="true" />
                <div><span>当前重放事件</span><strong>{stepLabel(currentStep, computation.trace.result.insertedValue)}</strong></div>
                <code>focus={currentStep.focusIndex ?? '--'} · parent={currentStep.parentIndex ?? '--'} · size={currentStep.heap.length}</code>
              </div>
              <HeapState step={currentStep} />
            </>
          )}
        </div>

        {computation.ok && (
          <StepExplorer
            key={computationKey}
            steps={computation.explorerSteps}
            onActiveIndexChange={setActiveIndex}
            announceChanges={false}
            className="min-heap-step-explorer"
          />
        )}
      </div>
    </div>
  );
}
