import {
  BINARY_TREE_TRAVERSAL_Q3_PRESET,
  traceBinaryTreeTraversal,
  type BinaryTreeNode,
  type BinaryTreeTraversalStep,
  type BinaryTreeTraversalTrace,
  type TraversalOrder,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, GitBranch, ListTree, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { DataStructuresModuleTabs } from '../components/DataStructuresModuleTabs';
import { LabSectionNav } from '../components/LabSectionNav';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

const MAX_LEVEL_ORDER_SLOTS = 63;
const MAX_PAGE_LABEL_LENGTH = 12;
const traversalOrders: readonly TraversalOrder[] = ['NLR', 'NRL', 'LNR', 'LRN', 'RNL', 'RLN'];

const tokenLabels = {
  N: '根',
  L: '左',
  R: '右',
} as const;

interface ParsedTree {
  readonly nodes: readonly BinaryTreeNode[];
  readonly rootId: string;
  readonly maxDepth: number;
}

interface SuccessfulComputation {
  readonly ok: true;
  readonly tree: ParsedTree;
  readonly trace: BinaryTreeTraversalTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type TreeComputation = SuccessfulComputation | FailedComputation;

function serializeLevelOrder(nodes: readonly BinaryTreeNode[], rootId: string): string {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const slots: Array<string | undefined> = [];
  const place = (nodeId: string, position: number): void => {
    const node = nodeById.get(nodeId);
    if (!node || position > MAX_LEVEL_ORDER_SLOTS) {
      throw new RangeError('Q3 预设无法编码为当前层序格式。');
    }
    slots[position - 1] = node.label;
    if (node.leftId !== null) place(node.leftId, position * 2);
    if (node.rightId !== null) place(node.rightId, position * 2 + 1);
  };
  place(rootId, 1);
  return Array.from({ length: slots.length }, (_, index) => slots[index] ?? '#').join(',');
}

const Q3_LEVEL_ORDER = serializeLevelOrder(
  BINARY_TREE_TRAVERSAL_Q3_PRESET.config.nodes,
  BINARY_TREE_TRAVERSAL_Q3_PRESET.config.rootId,
);

function isTraversalOrder(value: string | null): value is TraversalOrder {
  return value !== null && traversalOrders.some((order) => order === value);
}

function parseLevelOrder(text: string): ParsedTree {
  const rawTokens = text.split(/[,，]/u);
  if (rawTokens.length > MAX_LEVEL_ORDER_SLOTS) {
    throw new RangeError(`层序输入最多 ${MAX_LEVEL_ORDER_SLOTS} 个位置。`);
  }
  const tokens = rawTokens.map((rawToken, index) => {
    const token = rawToken.trim();
    if (!token) throw new RangeError(`层序第 ${index + 1} 个位置不能为空；空结点请写 #。`);
    if (token === '#') return null;
    if (token.length > MAX_PAGE_LABEL_LENGTH) {
      throw new RangeError(`层序第 ${index + 1} 个结点标签最多 ${MAX_PAGE_LABEL_LENGTH} 个字符。`);
    }
    return token;
  });
  if (tokens[0] === null) throw new RangeError('层序根结点不能是 #。');

  const nodes: BinaryTreeNode[] = [];
  let maxDepth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const label = tokens[index];
    if (label === null || label === undefined) continue;
    if (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (tokens[parentIndex] === null || tokens[parentIndex] === undefined) {
        throw new RangeError(`层序第 ${index + 1} 个结点的父结点为空，当前结点不可达。`);
      }
    }
    const leftIndex = index * 2 + 1;
    const rightIndex = index * 2 + 2;
    nodes.push({
      id: String(index + 1),
      label,
      leftId: tokens[leftIndex] ? String(leftIndex + 1) : null,
      rightId: tokens[rightIndex] ? String(rightIndex + 1) : null,
    });
    maxDepth = Math.max(maxDepth, Math.floor(Math.log2(index + 1)));
  }
  if (!nodes.length) throw new RangeError('层序输入至少需要一个结点。');
  return { nodes, rootId: '1', maxDepth };
}

function nodeLabel(trace: BinaryTreeTraversalTrace, nodeId: string | null): string {
  if (nodeId === null) return '';
  return trace.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function visitedLabels(trace: BinaryTreeTraversalTrace, nodeIds: readonly string[]): string[] {
  return nodeIds.map((nodeId) => nodeLabel(trace, nodeId));
}

function stepLabel(step: BinaryTreeTraversalStep, trace: BinaryTreeTraversalTrace): string {
  const label = nodeLabel(trace, step.nodeId);
  switch (step.kind) {
    case 'initial': return `准备按 ${trace.order} 遍历`;
    case 'enter': return `进入结点 ${label}`;
    case 'visit': return `访问结点 ${label}`;
    case 'leave': return `离开结点 ${label}`;
  }
}

function buildExplorerSteps(trace: BinaryTreeTraversalTrace): ExplorerStep[] {
  return trace.steps.map((step) => ({
    id: step.id,
    label: stepLabel(step, trace),
    value: `stack=[${visitedLabels(trace, step.state.callStack).join(', ')}] · visited=[${visitedLabels(trace, step.state.visitedNodeIds).join(', ')}]`,
  }));
}

function computeTree(treeText: string, order: TraversalOrder): TreeComputation {
  try {
    const tree = parseLevelOrder(treeText);
    const trace = traceBinaryTreeTraversal({ nodes: tree.nodes, rootId: tree.rootId, order });
    return { ok: true, tree, trace, explorerSteps: buildExplorerSteps(trace) };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : '二叉树输入无效。' };
  }
}

function treeNodePosition(nodeId: string, width: number): { x: number; y: number } {
  const position = Number(nodeId);
  const depth = Math.floor(Math.log2(position));
  const firstAtDepth = 2 ** depth;
  const offset = position - firstAtDepth;
  return {
    x: ((offset + 0.5) / (2 ** depth)) * width,
    y: 46 + depth * 84,
  };
}

function BinaryTreeView({ tree, trace, step }: {
  tree: ParsedTree;
  trace: BinaryTreeTraversalTrace;
  step: BinaryTreeTraversalStep;
}) {
  const width = Math.max(640, 2 ** tree.maxDepth * 82);
  const height = Math.max(132, 94 + tree.maxDepth * 84);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeById = useMemo(() => new Map(trace.nodes.map((node) => [node.id, node])), [trace.nodes]);
  const visited = new Set(step.state.visitedNodeIds);
  const stack = new Set(step.state.callStack);

  useEffect(() => {
    const container = scrollRef.current;
    const activeNodeId = step.state.activeNodeId ?? trace.rootId;
    if (!container) return;
    const targetX = treeNodePosition(activeNodeId, width).x;
    container.scrollLeft = Math.max(0, targetX - container.clientWidth / 2);
  }, [step.id, step.state.activeNodeId, trace.rootId, width]);

  return (
    <div ref={scrollRef} className="binary-tree-scroll">
      <svg
        className="binary-tree-canvas"
        style={{ width }}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="当前二叉树"
        preserveAspectRatio="xMidYMid meet"
      >
        {trace.nodes.flatMap((node) => [node.leftId, node.rightId].map((childId) => {
          if (childId === null) return null;
          const from = treeNodePosition(node.id, width);
          const to = treeNodePosition(childId, width);
          const active = stack.has(node.id) && stack.has(childId);
          return <line key={`${node.id}-${childId}`} className={active ? 'active' : ''} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        }))}
        {trace.nodes.map((node) => {
          const point = treeNodePosition(node.id, width);
          const active = step.state.activeNodeId === node.id;
          const visiting = step.kind === 'visit' && step.nodeId === node.id;
          const classes = [active ? 'active' : '', visited.has(node.id) ? 'visited' : '', visiting ? 'visiting' : ''].filter(Boolean).join(' ');
          return (
            <g
              key={node.id}
              className={classes}
              data-tree-node-id={node.id}
              transform={`translate(${point.x} ${point.y})`}
              aria-label={`结点 ${node.label}${active ? '，当前递归结点' : ''}${visited.has(node.id) ? '，已访问' : ''}`}
            >
              <circle r="26" />
              <text y="4" textLength={node.label.length > 4 ? 39 : undefined} lengthAdjust={node.label.length > 4 ? 'spacingAndGlyphs' : undefined}>{node.label}</text>
              <title>{nodeById.get(node.id)?.label}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TraversalStatePanel({ computation, step }: {
  computation: SuccessfulComputation;
  step: BinaryTreeTraversalStep;
}) {
  const stackLabels = visitedLabels(computation.trace, step.state.callStack);
  const prefix = visitedLabels(computation.trace, step.state.visitedNodeIds);
  return (
    <section className="lab-control-panel binary-tree-state-panel" aria-labelledby="binary-tree-state-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">TREE / CALL STACK</span><h2 id="binary-tree-state-heading">递归遍历状态</h2></div>
        <GitBranch size={19} aria-hidden="true" />
      </div>
      <BinaryTreeView tree={computation.tree} trace={computation.trace} step={step} />
      <div className="binary-tree-runtime">
        <div aria-label="递归调用栈">
          <small>递归调用栈</small>
          <strong>{stackLabels.length ? stackLabels.join(' → ') : '空'}</strong>
        </div>
        <div aria-label="已访问前缀">
          <small>已访问前缀</small>
          <strong>{prefix.length ? prefix.join(', ') : '空'}</strong>
        </div>
      </div>
    </section>
  );
}

export function BinaryTreeTraversalLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === BINARY_TREE_TRAVERSAL_Q3_PRESET.sourceQuestionId;
  const treeText = presetSelected ? Q3_LEVEL_ORDER : (searchParams.get('tree') ?? Q3_LEVEL_ORDER);
  const requestedOrder = searchParams.get('order');
  const order: TraversalOrder = isTraversalOrder(requestedOrder) ? requestedOrder : 'RNL';
  const computationKey = `${treeText}\u0000${order}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => computeTree(treeText, order), [order, treeText]);
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => (
      current.key === computationKey && current.index === index
        ? current
        : { key: computationKey, index }
    ));
  }, [computationKey]);
  const currentStep = computation.ok
    ? computation.trace.steps[Math.min(activeIndex, computation.trace.steps.length - 1)]!
    : null;
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === BINARY_TREE_TRAVERSAL_Q3_PRESET.sourceQuestionId
    || (candidate.year === 2009 && candidate.number === 3)
  )), [questions]);

  const updateTree = (nextTree: string) => {
    setSearchParams({ module: 'tree-traversal', tree: nextTree, order }, { replace: true });
  };

  const updateOrder = (nextOrder: TraversalOrder) => {
    const nextParams = presetSelected
      ? { module: 'tree-traversal', preset: BINARY_TREE_TRAVERSAL_Q3_PRESET.sourceQuestionId, order: nextOrder }
      : { module: 'tree-traversal', tree: treeText, order: nextOrder };
    setSearchParams(nextParams, { replace: true });
  };

  const restorePreset = () => {
    setSearchParams({
      module: 'tree-traversal',
      preset: BINARY_TREE_TRAVERSAL_Q3_PRESET.sourceQuestionId,
      order: BINARY_TREE_TRAVERSAL_Q3_PRESET.config.order,
    }, { replace: true });
  };

  const practiceQ3 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q3 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page binary-tree-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">DATA STRUCTURES LAB / BINARY TREE</span><h1>二叉树遍历实验室</h1><p>沿递归调用栈重放根、左子树与右子树的六种访问顺序。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ3()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q3'}
        </button>
      </header>
      <LabSectionNav />
      <DataStructuresModuleTabs active="tree-traversal" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="ds-review-band binary-tree-review-band">
        <span><ListTree size={16} aria-hidden="true" />本地练习预设 · Q3</span>
        <strong>{question?.reviewStatus ?? BINARY_TREE_TRAVERSAL_Q3_PRESET.reviewStatus}</strong>
        <small>原卷树形与目标序列仍待人工复核；实验只重放递归遍历，不扩展为二叉搜索树或 Morris 遍历。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q03')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><GitBranch size={18} aria-hidden="true" /><span>2009 第 3 题 · RNL 特殊遍历</span><ListTree size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid binary-tree-lab-grid">
        <div className="binary-tree-workbench">
          <section className="lab-control-panel binary-tree-control-panel" aria-labelledby="binary-tree-input-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">LEVEL ORDER / ORDER</span><h2 id="binary-tree-input-heading">树结构与遍历顺序</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q3 预设</button>
            </div>
            <label className="lab-input-field full">
              <span>层序结点（# 表示空结点）</span>
              <input aria-label="层序结点" spellCheck={false} value={treeText} onChange={(event) => updateTree(event.target.value)} />
            </label>
            <div className="segmented-control binary-tree-order-control" aria-label="遍历顺序">
              {traversalOrders.map((candidate) => (
                <button key={candidate} type="button" className={order === candidate ? 'active' : ''} aria-pressed={order === candidate} onClick={() => updateOrder(candidate)}>{candidate}</button>
              ))}
            </div>
            <div className="binary-tree-order-meaning" aria-label={`${order} 顺序含义`}>
              {order.split('').map((token, index) => (
                <span key={`${index}-${token}`}><small>{index + 1}</small><strong>{tokenLabels[token as keyof typeof tokenLabels]}</strong><code>{token}</code></span>
              ))}
            </div>
            {computation.ok ? (
              <div className="binary-tree-metrics">
                <div><small>结点数</small><strong>{computation.trace.nodes.length}</strong></div>
                <div><small>最大深度</small><strong>{computation.tree.maxDepth + 1}</strong></div>
                <div aria-label="遍历结果"><small>{order} 遍历结果</small><strong>{computation.trace.result.visitedLabels.join(', ')}</strong></div>
              </div>
            ) : <div className="lab-error" role="alert">{computation.message}</div>}
          </section>

          {computation.ok && currentStep && (
            <>
              <div className="binary-tree-current-event" aria-live="polite" aria-atomic="true" aria-label="当前遍历事件">
                <GitBranch size={18} aria-hidden="true" />
                <div><span>当前递归事件</span><strong>{stepLabel(currentStep, computation.trace)}</strong></div>
                <code>stack={currentStep.state.callStack.length} · visited={currentStep.state.visitedNodeIds.length}/{computation.trace.nodes.length}</code>
              </div>
              <TraversalStatePanel computation={computation} step={currentStep} />
            </>
          )}
        </div>

        {computation.ok && (
          <StepExplorer
            key={computationKey}
            className="binary-tree-step-explorer"
            steps={computation.explorerSteps}
            announceChanges={false}
            onActiveIndexChange={setActiveIndex}
          />
        )}
      </div>
    </div>
  );
}
