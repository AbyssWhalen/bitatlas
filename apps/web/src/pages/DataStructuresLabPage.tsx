import {
  SHORTEST_PATH_PRESETS,
  simulateDijkstra,
  simulateLocalNearest,
  traceKthFromEnd,
  type KthFromEndTrace,
  type LinkedListPointerStep,
  type ShortestPathPreset,
  type ShortestPathResult,
  type ShortestPathStep,
  type ShortestPathTrace,
} from '@408os/lab-core';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  FlaskConical,
  GitCompareArrows,
  ListTree,
  Network,
  Workflow,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { DataStructuresModuleTabs } from '../components/DataStructuresModuleTabs';
import { LabExhibit, LabExhibitNotice } from '../components/LabExhibit';
import { LabSectionNav } from '../components/LabSectionNav';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';
import { StackCapacityLabPage } from './StackCapacityLabPage';
import { MinHeapInsertLabPage } from './MinHeapInsertLabPage';
import { BinaryTreeTraversalLabPage } from './BinaryTreeTraversalLabPage';
import { ForestBinaryRelationLabPage } from './ForestBinaryRelationLabPage';
import { SortPassAnalysisLabPage } from './SortPassAnalysisLabPage';
import { CompleteBinaryTreeLabPage } from './CompleteBinaryTreeLabPage';

type Algorithm = ShortestPathTrace['algorithm'];

interface Point {
  readonly x: number;
  readonly y: number;
}

const graphPositions: Readonly<Record<string, Point>> = {
  S: { x: 68, y: 130 },
  A: { x: 245, y: 58 },
  B: { x: 245, y: 202 },
  T: { x: 472, y: 130 },
};

const algorithmLabels: Record<Algorithm, string> = {
  'local-nearest': '题设局部最近边',
  dijkstra: 'Dijkstra',
};

const linkedListPresets = [
  { id: 'cn408-2009-q42', name: 'Q42 双指针示例', values: '12, 7, 3, 9, 5, 18', k: '3' },
  { id: 'tail', name: '边界：倒数第 1 个', values: '4, 8, 15, 16, 23, 42', k: '1' },
  { id: 'too-short', name: '边界：链长不足', values: '7, 11', k: '3' },
] as const;

const linkedListPhaseLabels: Record<LinkedListPointerStep['phase'], string> = {
  initialize: '初始化双指针',
  'advance-fast': '快指针先行',
  'advance-together': '双指针同步移动',
  found: '定位目标结点',
  'not-found': '链长不足',
};

const invariantLabels: Record<LinkedListPointerStep['invariant']['name'], string> = {
  'gap-building': '正在建立 k 个结点的间隔',
  'k-node-gap': '快慢指针始终相隔 k 个结点',
  'list-too-short': '快指针到达 NULL 时仍未走满 k 步',
};

function parseLinkedListValues(input: string): number[] {
  const tokens = input.split(/[\s,，]+/u).filter(Boolean);
  if (!tokens.length) return [];
  return tokens.map((token, index) => {
    const value = Number(token);
    if (!Number.isSafeInteger(value)) throw new Error(`第 ${index + 1} 个结点必须是安全整数`);
    return value;
  });
}

function requestedPreset(searchParams: URLSearchParams): ShortestPathPreset {
  const requested = searchParams.get('preset');
  return SHORTEST_PATH_PRESETS.find((preset) => (
    preset.id === requested || preset.sourceQuestionId === requested
  )) ?? SHORTEST_PATH_PRESETS[0]!;
}

function resultPath(result: ShortestPathResult): string {
  if (!result.nodeIds.length) return '无可达路径';
  const path = result.nodeIds.join(' → ');
  return result.reached ? path : `${path}（未到达）`;
}

function resultDistance(result: ShortestPathResult): string {
  return result.distance === null ? '∞' : String(result.distance);
}

function explorerSteps(trace: ShortestPathTrace): readonly ExplorerStep[] {
  return trace.steps.map((step) => ({ id: step.id, label: step.label, value: step.detail }));
}

function GraphWorkbench({
  preset,
  step,
}: {
  preset: ShortestPathPreset;
  step: ShortestPathStep;
}) {
  const nodeById = new Map(preset.graph.nodes.map((node) => [node.id, node]));
  const focusEdges = new Set(step.focusPathEdgeIds);
  const settledNodes = new Set(step.settledNodeIds);

  return (
    <section className="lab-exhibit-stage" aria-labelledby="ds-stage-title">
      <div className="lab-exhibit-stage-head"><div className="lab-exhibit-stage-title"><h2 id="ds-stage-title">路径与边权</h2></div><Network size={18} aria-hidden="true" /></div>
      <svg className="ds-graph" viewBox="0 0 540 260" role="img" aria-labelledby="ds-graph-title ds-graph-description">
        <title id="ds-graph-title">{preset.name} 带权无向图</title>
        <desc id="ds-graph-description">当前步骤：{step.label}</desc>
        {preset.graph.edges.map((edge) => {
          const from = graphPositions[edge.from]!;
          const to = graphPositions[edge.to]!;
          const active = step.activeEdgeId === edge.id;
          const onPath = focusEdges.has(edge.id);
          return (
            <g key={edge.id} className={`ds-edge ${onPath ? 'path' : ''} ${active ? 'active' : ''}`} data-edge-id={edge.id}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="18" />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2} dy=".35em">{edge.weight}</text>
            </g>
          );
        })}
        {preset.graph.nodes.map((node) => {
          const point = graphPositions[node.id]!;
          const current = step.currentNodeId === node.id;
          const settled = settledNodes.has(node.id);
          return (
            <g
              key={node.id}
              className={`ds-node ${settled ? 'settled' : ''} ${current ? 'current' : ''} ${node.id === preset.targetNodeId ? 'target' : ''}`}
              data-node-id={node.id}
              transform={`translate(${point.x} ${point.y})`}
            >
              <circle r="25" />
              <text dy=".35em">{node.id}</text>
              <title>{nodeById.get(node.id)?.label}</title>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function DistanceTable({ step }: { step: ShortestPathStep }) {
  return (
    <section className="lab-exhibit-table-card" aria-labelledby="ds-distance-title">
      <div className="lab-exhibit-card-head"><h2 id="ds-distance-title">当前距离与前驱</h2></div>
      <div className="table-responsive ds-distance-table">
        <table className="table">
          <thead><tr><th>顶点</th><th>当前距离</th><th>前驱</th><th>状态</th></tr></thead>
          <tbody>
            {step.distances.map((entry) => (
              <tr key={entry.nodeId} className={entry.nodeId === step.currentNodeId ? 'current' : ''}>
                <td><strong>{entry.nodeId}</strong></td>
                <td><code>{entry.distance === null ? '∞' : entry.distance}</code></td>
                <td>{entry.predecessorNodeId ?? '--'}</td>
                <td>{step.settledNodeIds.includes(entry.nodeId) ? '已确定' : entry.nodeId === step.currentNodeId ? '当前' : '候选'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResultComparison({ local, dijkstra }: { local: ShortestPathTrace; dijkstra: ShortestPathTrace }) {
  const differs = local.result.distance !== dijkstra.result.distance || local.result.reached !== dijkstra.result.reached;
  return (
    <section className="lab-exhibit-table-card ds-comparison" aria-labelledby="ds-comparison-title">
      <div className="lab-exhibit-card-head">
        <h2 id="ds-comparison-title">两种策略的最终结果</h2>
        <strong className="lab-exhibit-badge">{differs ? '反例成立' : '本例一致'}</strong>
      </div>
      <div className="ds-result-grid">
        <article>
          <span>题设局部最近边</span>
          <strong>{resultDistance(local.result)}</strong>
          <code>{resultPath(local.result)}</code>
        </article>
        <GitCompareArrows size={20} aria-hidden="true" />
        <article>
          <span>Dijkstra</span>
          <strong>{resultDistance(dijkstra.result)}</strong>
          <code>{resultPath(dijkstra.result)}</code>
        </article>
      </div>
      <p className="lab-exhibit-table-note"><AlertTriangle size={15} aria-hidden="true" />题设方法不是 Dijkstra：它比较当前边权，Dijkstra 比较从起点出发的全局暂定距离。</p>
    </section>
  );
}

function linkedListExplorerSteps(trace: KthFromEndTrace): readonly ExplorerStep[] {
  return trace.steps.map((step) => ({
    id: step.id,
    label: linkedListPhaseLabels[step.phase],
    value: `p=${step.fastIndex === null ? 'NULL' : step.fastIndex}, q=${step.slowIndex === null ? 'NULL' : step.slowIndex}, lead=${step.lead}; ${invariantLabels[step.invariant.name]}`,
  }));
}

function LinkedListWorkbench({ values, step }: { values: readonly number[]; step: LinkedListPointerStep }) {
  return (
    <div className="linked-list-viewport">
      <div className="linked-list-track" role="img" aria-label={`带表头结点的单链表，快指针位于 ${step.fastIndex ?? 'NULL'}，慢指针位于 ${step.slowIndex ?? 'NULL'}`}>
        <div className="linked-list-node sentinel"><span>HEAD</span><small>表头结点</small></div>
        <ArrowRight className="linked-list-arrow" size={18} aria-hidden="true" />
        {values.map((value, index) => (
          <div className="linked-list-node-group" key={`${index}:${value}`}>
            <div className={`linked-list-node ${step.slowIndex === index ? 'slow' : ''} ${step.fastIndex === index ? 'fast' : ''}`} data-node-index={index}>
              <div className="linked-list-pointers">
                {step.slowIndex === index && <span className="slow-pointer">q</span>}
                {step.fastIndex === index && <span className="fast-pointer">p</span>}
              </div>
              <strong>{value}</strong><small>index {index}</small>
            </div>
            <ArrowRight className="linked-list-arrow" size={18} aria-hidden="true" />
          </div>
        ))}
        <div className={`linked-list-node null-node ${step.fastIndex === null ? 'fast' : ''} ${step.slowIndex === null ? 'slow' : ''}`} data-node-index="null">
          <div className="linked-list-pointers">
            {step.slowIndex === null && <span className="slow-pointer">q</span>}
            {step.fastIndex === null && <span className="fast-pointer">p</span>}
          </div>
          <strong>NULL</strong><small>链尾</small>
        </div>
      </div>
    </div>
  );
}

function LinkedListLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = linkedListPresets.find((preset) => preset.id === searchParams.get('preset')) ?? linkedListPresets[0];
  const [presetId, setPresetId] = useState<string>(requested.id);
  const [valuesText, setValuesText] = useState<string>(requested.values);
  const [kText, setKText] = useState<string>(requested.k);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => {
    try {
      const values = parseLinkedListValues(valuesText);
      const trace = traceKthFromEnd({ values, k: Number(kText) });
      return { values, trace, error: null };
    } catch (reason) {
      return { values: [] as number[], trace: null, error: reason instanceof Error ? reason.message : '输入无效' };
    }
  }, [kText, valuesText]);
  const activeStep = computation.trace?.steps[Math.min(activeStepIndex, computation.trace.steps.length - 1)];
  const q42 = questions.find((question) => question.id === 'cn408-2009-q42' || (question.year === 2009 && question.number === 42));
  const q42Id = q42?.id;

  const selectPreset = (nextId: string) => {
    const preset = linkedListPresets.find((candidate) => candidate.id === nextId);
    if (!preset) return;
    setPresetId(preset.id);
    setValuesText(preset.values);
    setKText(preset.k);
    setActiveStepIndex(0);
    setSearchParams({ module: 'linked-list', preset: preset.id }, { replace: true });
  };

  const updateValues = (nextValue: string) => {
    setPresetId('custom');
    setValuesText(nextValue);
    setActiveStepIndex(0);
  };

  const updateK = (nextValue: string) => {
    setPresetId('custom');
    setKText(nextValue);
    setActiveStepIndex(0);
  };

  const practiceQ42 = async () => {
    if (!q42Id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([q42Id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q42 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <LabExhibit
      pageClassName="ds-lab-page linked-list-lab-page"
      subjectLabel="数据结构 · 线性表"
      title="单链表双指针实验室"
      description="一趟扫描定位倒数第 k 个数据结点，并持续检查指针间隔。"
      headerAction={(
        <button className="lab-exhibit-keycap" type="button" disabled={!q42Id || starting} onClick={() => void practiceQ42()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q42'}
        </button>
      )}
      navigation={<><LabSectionNav /><DataStructuresModuleTabs active="linked-list" /></>}
      alert={startError && <div className="lab-exhibit-inline-alert" role="alert">{startError}</div>}
      notice={<LabExhibitNotice icon={<ListTree size={16} aria-hidden="true" />} label="Q42 一趟扫描双指针" badge={q42?.reviewStatus ?? 'unavailable'}
        note="表头结点不计入数据结点；实验只重放确定性纯逻辑，不修改输入链表。"
        action={<button className="lab-exhibit-keycap compact" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q42')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>}
      />}
      subheading={<><ListTree size={18} aria-hidden="true" /><span>带表头结点的单链表 · O(n) / O(1)</span><FlaskConical size={14} aria-hidden="true" /></>}
      mobileOrder="canvas-first"
      controls={(
        <section className="lab-exhibit-control-card" aria-labelledby="linked-list-control-title">
          <div className="lab-exhibit-card-head">
            <h2 id="linked-list-control-title">链表与目标位置</h2>
            <label className="lab-exhibit-field">
              <span>典型题预设</span>
              <select aria-label="单链表典型题预设" value={presetId} onChange={(event) => selectPreset(event.target.value)}>
                {presetId === 'custom' && <option value="custom">自定义输入</option>}
                {linkedListPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
              </select>
            </label>
          </div>
          <div className="lab-exhibit-input-grid cols-wide-narrow">
            <label className="lab-exhibit-field"><span>数据结点（逗号或空格分隔）</span><input aria-label="单链表数据结点" value={valuesText} onChange={(event) => updateValues(event.target.value)} /></label>
            <label className="lab-exhibit-field"><span>倒数第 k 个</span><input aria-label="倒数位置 k" inputMode="numeric" value={kText} onChange={(event) => updateK(event.target.value)} /></label>
          </div>
          {computation.error && <div className="lab-exhibit-error" role="alert">{computation.error}</div>}
        </section>
      )}
      status={activeStep && (
        <div className="lab-exhibit-status-card linked-list-invariant" data-holds={activeStep.invariant.holds}>
          <ListTree size={18} aria-hidden="true" /><div><span>当前不变量</span><strong>{invariantLabels[activeStep.invariant.name]}</strong></div>
          <code>{activeStep.invariant.actualLead} / {activeStep.invariant.expectedLead}</code>
        </div>
      )}
      canvas={activeStep && (
        <section className="lab-exhibit-stage" aria-labelledby="linked-list-stage-title">
          <div className="lab-exhibit-stage-head"><div className="lab-exhibit-stage-title"><h2 id="linked-list-stage-title">快慢指针位置</h2></div></div>
          <LinkedListWorkbench values={computation.values} step={activeStep} />
        </section>
      )}
      steps={computation.trace ? (
        <StepExplorer key={`${valuesText}:${kText}`} steps={linkedListExplorerSteps(computation.trace)} onActiveIndexChange={setActiveStepIndex} />
      ) : <section className="lab-exhibit-steps-empty"><ListTree size={24} aria-hidden="true" /><strong>等待有效输入</strong></section>}
      footer={computation.trace && (
        <div className="lab-exhibit-metrics rollout-three-metrics" aria-live="polite">
          <div><small>查找结果</small><strong>{computation.trace.result ? `data = ${computation.trace.result.value}` : '未找到'}</strong><small>{computation.trace.result ? `数据结点 index ${computation.trace.result.index}` : `链长 ${computation.trace.length} 小于 k=${computation.trace.k}`}</small></div>
          <div><small>时间复杂度</small><strong>O(n)</strong><small>只扫描一趟</small></div>
          <div><small>额外空间</small><strong>{computation.trace.complexity.extraSpace}</strong><small>仅使用两个指针</small></div>
        </div>
      )}
    />
  );
}

function ShortestPathLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPreset = requestedPreset(searchParams);
  const [presetId, setPresetId] = useState(initialPreset.id);
  const [algorithm, setAlgorithm] = useState<Algorithm>('local-nearest');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const preset = SHORTEST_PATH_PRESETS.find((candidate) => candidate.id === presetId) ?? SHORTEST_PATH_PRESETS[0]!;
  const localTrace = useMemo(
    () => simulateLocalNearest(preset.graph, preset.startNodeId, preset.targetNodeId),
    [preset],
  );
  const dijkstraTrace = useMemo(
    () => simulateDijkstra(preset.graph, preset.startNodeId, preset.targetNodeId),
    [preset],
  );
  const trace = algorithm === 'local-nearest' ? localTrace : dijkstraTrace;
  const activeStep = trace.steps[Math.min(activeStepIndex, trace.steps.length - 1)]!;
  const q41 = questions.find((question) => (
    question.id === preset.sourceQuestionId || (question.year === 2009 && question.number === 41)
  ));
  const q41Id = q41?.id;

  const selectPreset = (nextPresetId: string) => {
    setPresetId(nextPresetId);
    setSearchParams({ preset: nextPresetId }, { replace: true });
    setActiveStepIndex(0);
  };

  const selectAlgorithm = (nextAlgorithm: Algorithm) => {
    setAlgorithm(nextAlgorithm);
    setActiveStepIndex(0);
  };

  const practiceQ41 = async () => {
    if (!q41Id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([q41Id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q41 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <LabExhibit
      pageClassName="ds-lab-page shortest-path-lab-page"
      subjectLabel="数据结构 · 图"
      title="最短路径实验室"
      description="对照局部最近边策略与 Dijkstra 的全局距离更新。"
      headerAction={(
        <button className="lab-exhibit-keycap" type="button" disabled={!q41Id || starting} onClick={() => void practiceQ41()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q41'}
        </button>
      )}
      navigation={<><LabSectionNav /><DataStructuresModuleTabs active="shortest-path" /></>}
      alert={startError && <div className="lab-exhibit-inline-alert" role="alert">{startError}</div>}
      notice={<LabExhibitNotice icon={<Workflow size={16} aria-hidden="true" />} label="Q41 等价教学反例" badge={q41?.reviewStatus ?? preset.reviewStatus}
        note="题包与解析仍待人工复核；本图用于演示同类反例，不替代来源页原图。"
        action={<button className="lab-exhibit-keycap compact" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q41')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>}
      />}
      subheading={<><Network size={18} aria-hidden="true" /><span>带权无向图 · 非负权值</span><FlaskConical size={14} aria-hidden="true" /></>}
      mobileOrder="canvas-first"
      controls={(
        <section className="lab-exhibit-control-card" aria-labelledby="ds-control-title">
          <div className="lab-exhibit-card-head">
            <h2 id="ds-control-title">反例与算法</h2>
            <label className="lab-exhibit-field">
              <span>典型题预设</span>
              <select aria-label="典型题预设" value={preset.id} onChange={(event) => selectPreset(event.target.value)}>
                {SHORTEST_PATH_PRESETS.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
              </select>
            </label>
          </div>

          <div className="segmented-control ds-algorithm-switch" aria-label="最短路径算法">
            {(Object.keys(algorithmLabels) as Algorithm[]).map((candidate) => (
              <button key={candidate} type="button" className={algorithm === candidate ? 'active' : ''} aria-pressed={algorithm === candidate} onClick={() => selectAlgorithm(candidate)}>{algorithmLabels[candidate]}</button>
            ))}
          </div>
          <p className="lab-exhibit-lead-copy">{preset.description}</p>
        </section>
      )}
      canvas={<GraphWorkbench preset={preset} step={activeStep} />}
      steps={(
        <StepExplorer
          key={`${preset.id}:${algorithm}`}
          steps={explorerSteps(trace)}
          onActiveIndexChange={setActiveStepIndex}
        />
      )}
      footer={(
        <div className="lab-exhibit-footer-stack">
          <DistanceTable step={activeStep} />
          <ResultComparison local={localTrace} dijkstra={dijkstraTrace} />
        </div>
      )}
    />
  );
}

export function DataStructuresLabPage() {
  const [searchParams] = useSearchParams();
  const module = searchParams.get('module');
  if (module === 'complete-tree') return <CompleteBinaryTreeLabPage />;
  if (module === 'sort-pass') return <SortPassAnalysisLabPage />;
  if (module === 'tree-traversal') return <BinaryTreeTraversalLabPage />;
  if (module === 'forest-conversion') return <ForestBinaryRelationLabPage />;
  if (module === 'min-heap') return <MinHeapInsertLabPage />;
  if (module === 'stack-capacity') return <StackCapacityLabPage />;
  if (module === 'linked-list') return <LinkedListLabPage />;
  if (module === 'shortest-path') return <ShortestPathLabPage />;
  const preset = searchParams.get('preset');
  if (module === null && preset === 'cn408-2009-q05') return <CompleteBinaryTreeLabPage />;
  if (module === null && preset === 'cn408-2009-q10') return <SortPassAnalysisLabPage />;
  if (module === null && preset === 'cn408-2009-q03') return <BinaryTreeTraversalLabPage />;
  if (module === null && preset === 'cn408-2009-q06') return <ForestBinaryRelationLabPage />;
  if (module === null && preset === 'cn408-2009-q09') return <MinHeapInsertLabPage />;
  if (module === null && preset === 'cn408-2009-q02') return <StackCapacityLabPage />;
  if (module === null && preset === 'cn408-2009-q42') return <LinkedListLabPage />;
  return <ShortestPathLabPage />;
}
