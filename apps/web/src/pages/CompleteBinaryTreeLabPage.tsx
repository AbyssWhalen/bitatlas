import {
  COMPLETE_BINARY_TREE_MAX_LEAF_LEVEL,
  COMPLETE_BINARY_TREE_Q5_PRESET,
  traceCompleteBinaryTreeMaximum,
  type CompleteBinaryTreeStep,
  type CompleteBinaryTreeTrace,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, Calculator, RotateCcw, ShieldAlert, TreePine } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { DataStructuresModuleTabs } from '../components/DataStructuresModuleTabs';
import { LabSectionNav } from '../components/LabSectionNav';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

const CANONICAL_URL = '/lab/data-structures?module=complete-tree&preset=cn408-2009-q05';
const MAX_VISIBLE_SLOTS = 32;

const stepLabels: Readonly<Record<CompleteBinaryTreeStep['kind'], string>> = {
  initial: '读取题设叶结点约束',
  'fill-upper-levels': '让前 L 层达到最大容量',
  'partition-leaf-level': '划分第 L 层的内部结点与叶结点',
  'bound-height': '由内部结点数量确定最大高度',
  'fill-last-level': '让内部结点各产生两个孩子',
  complete: '汇总最大构型的结点数',
};

function explorerSteps(trace: CompleteBinaryTreeTrace): readonly ExplorerStep[] {
  return trace.steps.map((step) => ({
    id: step.id,
    label: stepLabels[step.kind],
    value: step.kind === 'initial'
      ? `L=${step.state.leafLevel}, k=${step.state.leafCountAtLevel}`
      : step.kind === 'fill-upper-levels'
        ? `capacity=${step.state.leafLevelCapacity}, through=${step.state.nodesThroughLeafLevel}`
        : step.kind === 'partition-leaf-level'
          ? `internal=${step.state.internalNodesAtLeafLevel}, leaves=${step.state.leafCountAtLevel}`
          : step.kind === 'bound-height'
            ? `height=${step.state.maximumHeight}`
            : step.kind === 'fill-last-level'
              ? `last=${step.state.nodesAtLastLevel}`
              : `maximum=${step.state.maximumNodeCount}`,
  }));
}

function positiveInteger(text: string, label: string): number {
  if (!/^\d+$/u.test(text)) throw new RangeError(`${label}必须是正整数`);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${label}必须是正安全整数`);
  return value;
}

function stateSummary(step: CompleteBinaryTreeStep): string {
  const { state } = step;
  if (step.kind === 'initial') return `第 ${state.leafLevel} 层有 ${state.leafCountAtLevel} 个叶结点`;
  if (step.kind === 'fill-upper-levels') return `第 ${state.leafLevel} 层容量 ${state.leafLevelCapacity}，前 ${state.leafLevel} 层共 ${state.nodesThroughLeafLevel} 个结点`;
  if (step.kind === 'partition-leaf-level') return `该层 ${state.internalNodesAtLeafLevel} 个内部结点，${state.leafCountAtLevel} 个叶结点`;
  if (step.kind === 'bound-height') return `最大高度 ${state.maximumHeight}`;
  if (step.kind === 'fill-last-level') return state.nodesAtLastLevel === 0
    ? `无需新增第 ${state.leafLevel + 1} 层`
    : `第 ${state.leafLevel + 1} 层新增 ${state.nodesAtLastLevel} 个结点`;
  return `${state.nodesThroughLeafLevel} + ${state.nodesAtLastLevel} = ${state.maximumNodeCount}`;
}

function LevelPartition({ step }: { step: CompleteBinaryTreeStep }) {
  const capacity = step.state.leafLevelCapacity;
  const internal = step.state.internalNodesAtLeafLevel;
  if (capacity === null || internal === null) {
    return <div className="complete-tree-partition pending" aria-label="目标层容量分区">等待容量与分区推导</div>;
  }
  const leaves = step.state.leafCountAtLevel;
  const canShowSlots = capacity <= MAX_VISIBLE_SLOTS;
  return (
    <div className="complete-tree-partition" role="img" aria-label={`目标层容量分区：第 ${step.state.leafLevel} 层 ${capacity} 个位置，前 ${internal} 个内部结点，后 ${leaves} 个叶结点`}>
      <div className="complete-tree-partition-bar">
        <span className={`internal${internal === 0 ? ' empty' : ''}`} style={{ flexGrow: internal }}><strong>{internal} 个内部结点</strong></span>
        {leaves > 0 && <span className="leaf" style={{ flexGrow: leaves }}><strong>{leaves} 个叶结点</strong></span>}
      </div>
      {canShowSlots && (
        <div className="complete-tree-slots" aria-hidden="true">
          {Array.from({ length: capacity }, (_, index) => (
            <span key={index} data-kind={index < internal ? 'internal' : 'leaf'} title={`位置 ${index + 1} · ${index < internal ? '内部结点' : '叶结点'}`}>{index + 1}</span>
          ))}
        </div>
      )}
      {!canShowSlots && <p>容量超过 {MAX_VISIBLE_SLOTS} 时使用比例聚合，不生成指数规模的结点图。</p>}
    </div>
  );
}

export function CompleteBinaryTreeLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPreset = searchParams.get('preset');
  const useDefaultInput = requestedPreset !== null;
  const sourcePresetMode = requestedPreset === COMPLETE_BINARY_TREE_Q5_PRESET.sourceQuestionId;
  const initialLevel = useDefaultInput ? String(COMPLETE_BINARY_TREE_Q5_PRESET.config.leafLevel) : (searchParams.get('leafLevel') ?? '6');
  const initialCount = useDefaultInput ? String(COMPLETE_BINARY_TREE_Q5_PRESET.config.leafCountAtLevel) : (searchParams.get('leafCount') ?? '8');
  const computationKey = `${initialLevel}:${initialCount}:${sourcePresetMode ? 'source' : 'custom'}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => {
    try {
      const leafLevel = positiveInteger(initialLevel, '叶结点所在层');
      const leafCountAtLevel = positiveInteger(initialCount, '该层叶结点数');
      return { ok: true as const, trace: traceCompleteBinaryTreeMaximum({ leafLevel, leafCountAtLevel }) };
    } catch (reason) {
      return { ok: false as const, message: reason instanceof Error ? reason.message : '输入无效' };
    }
  }, [initialCount, initialLevel]);
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => current.key === computationKey && current.index === index
      ? current
      : { key: computationKey, index });
  }, [computationKey]);
  const safeIndex = computation.ok ? Math.min(activeIndex, computation.trace.steps.length - 1) : 0;
  const currentStep = computation.ok ? computation.trace.steps[safeIndex]! : null;
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === COMPLETE_BINARY_TREE_Q5_PRESET.sourceQuestionId || (candidate.year === 2009 && candidate.number === 5)
  )), [questions]);

  const updateCustom = (field: 'leafLevel' | 'leafCount', value: string) => {
    setActiveIndex(0);
    const next = {
      module: 'complete-tree',
      leafLevel: field === 'leafLevel' ? value : initialLevel,
      leafCount: field === 'leafCount' ? value : initialCount,
    };
    setSearchParams(next, { replace: true });
  };
  const restorePreset = () => {
    setActiveIndex(0);
    setSearchParams({ module: 'complete-tree', preset: COMPLETE_BINARY_TREE_Q5_PRESET.sourceQuestionId }, { replace: true });
  };
  const practiceQ5 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q5 练习创建失败');
      setStarting(false);
    }
  };
  const isComplete = currentStep?.kind === 'complete';

  return (
    <div className="page complete-tree-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">DATA STRUCTURES LAB / COMPLETE TREE</span><h1>完全二叉树最大结点实验室</h1><p>从指定层的叶结点数量，构造满足条件的最大规模。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ5()}><BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q5'}</button>
      </header>
      <LabSectionNav />
      <DataStructuresModuleTabs active="complete-tree" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}
      <div className="ds-review-band">
        <span><ShieldAlert size={16} aria-hidden="true" />本地练习预设 · Q5</span>
        <strong>{question?.reviewStatus ?? COMPLETE_BINARY_TREE_Q5_PRESET.reviewStatus}</strong>
        <small>来源仍待人工复核；本页只推导最大构型，不生成或判定任意完全二叉树。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q05')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><TreePine size={18} aria-hidden="true" /><span>层容量 · 叶/内部结点分区 · 最大构型</span><Calculator size={14} aria-hidden="true" /></div>
      <div className="complete-tree-lab-grid">
        <div className="complete-tree-workbench">
          <section className="lab-control-panel complete-tree-control-panel" aria-labelledby="complete-tree-control-title">
            <div className="lab-control-heading"><div><span className="eyebrow">SOURCE CONSTRAINT</span><h2 id="complete-tree-control-title">叶结点约束</h2></div><button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q5 预设</button></div>
            <div className="complete-tree-input-grid">
              <label className="lab-input-field"><span>叶结点所在层 L</span><input aria-label="叶结点所在层 L" type="number" min="1" max={COMPLETE_BINARY_TREE_MAX_LEAF_LEVEL} value={initialLevel} onChange={(event) => updateCustom('leafLevel', event.target.value)} /></label>
              <label className="lab-input-field"><span>该层叶结点数 k</span><input aria-label="该层叶结点数 k" type="number" min="1" value={initialCount} onChange={(event) => updateCustom('leafCount', event.target.value)} /></label>
            </div>
            <small className="complete-tree-input-boundary">支持 L=1..{COMPLETE_BINARY_TREE_MAX_LEAF_LEVEL}，且 1 ≤ k ≤ 2^(L-1)。</small>
            {!computation.ok && <div className="lab-error" role="alert">{computation.message}</div>}
          </section>

          {currentStep && (
            <>
              <section className="complete-tree-current-event" aria-live="polite" aria-atomic="true" aria-label="当前推导状态"><TreePine size={18} aria-hidden="true" /><div><span>当前推导</span><strong>{stateSummary(currentStep)}</strong></div><code>{currentStep.kind}</code></section>
              <section className="complete-tree-state-panel" aria-label="最大构型聚合图">
                <div className="lab-control-heading"><div><span className="eyebrow">LEVEL PARTITION</span><h2>目标层容量与末层</h2></div></div>
                <LevelPartition step={currentStep} />
                <div className="complete-tree-metrics" aria-label="最大构型指标">
                  <div role="group"><small>前 L 层</small><strong>{currentStep.state.nodesThroughLeafLevel ?? '--'}</strong></div>
                  <div role="group"><small>最大高度</small><strong>{currentStep.state.maximumHeight ?? '--'}</strong></div>
                  <div role="group"><small>L+1 层新增</small><strong>{currentStep.state.nodesAtLastLevel ?? '--'}</strong></div>
                </div>
              </section>
              <section className="complete-tree-conclusion" aria-label="当前最大结点结论" data-complete={isComplete ? 'true' : 'false'}>
                <div><small>当前结论</small><strong>{isComplete ? `最大结点数 ${currentStep.state.maximumNodeCount}` : '待推导'}</strong></div>
                <p>{isComplete ? `${currentStep.state.nodesThroughLeafLevel} + ${currentStep.state.nodesAtLastLevel} = ${currentStep.state.maximumNodeCount}，这是当前输入的最大构型。${sourcePresetMode ? ' 来源选项 C。' : ''}` : '完成全部因果步骤后再汇总，不提前投射来源答案。'}</p>
              </section>
            </>
          )}
        </div>
        {computation.ok && <StepExplorer key={computationKey} steps={explorerSteps(computation.trace)} onActiveIndexChange={setActiveIndex} announceChanges={false} className="complete-tree-step-explorer" />}
      </div>
    </div>
  );
}

export { CANONICAL_URL as COMPLETE_TREE_Q5_CANONICAL_URL };
