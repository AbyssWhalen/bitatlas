import {
  FOREST_BINARY_RELATION_Q6_PRESET,
  analyzeQ6ForestBinaryRelations,
  traceForestBinaryRelation,
  type ForestBinaryCaseTrace,
  type ForestBinaryPath,
  type ForestBinaryStep,
  type ForestRelation,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, GitFork, RotateCcw, Workflow } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { DataStructuresModuleTabs } from '../components/DataStructuresModuleTabs';
import { LabExhibit, LabExhibitNotice } from '../components/LabExhibit';
import { LabSectionNav } from '../components/LabSectionNav';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

const paths: readonly ForestBinaryPath[] = ['LL', 'LR', 'RL', 'RR'];
const relationLabels: Readonly<Record<ForestRelation, string>> = {
  'u-is-grandparent-of-v': 'u 是 v 的祖父结点（两层祖先）',
  'u-is-parent-of-v': 'u 是 v 的父结点',
  'u-is-sibling-of-v-parent': 'u 是 v 的父结点的兄弟',
  'u-and-v-are-siblings': 'u、v 是同一父结点下的兄弟',
};

function isPath(value: string | null): value is ForestBinaryPath {
  return value !== null && paths.includes(value as ForestBinaryPath);
}

function edgeText(step: ForestBinaryStep): string {
  if (step.kind === 'initial') return '准备解码二叉路径';
  if (step.kind === 'decode-edge') {
    const link = step.state.decodedLinks.at(-1);
    return link ? `解码第 ${link.edgeIndex + 1} 条边：${link.binarySide} = ${link.forestMeaning === 'first-child' ? '首孩子' : '下一兄弟'}` : '解码二叉边';
  }
  if (step.kind === 'classify') return `分类关系：${relationLabels[step.state.relation!]}`;
  return '完成四案例中的当前证明';
}

function explorerSteps(trace: ForestBinaryCaseTrace): readonly ExplorerStep[] {
  return trace.steps.map((step) => ({
    id: step.id,
    label: edgeText(step),
    value: `path=${trace.path} · decoded=${step.state.decodedLinks.length}/2 · statements=${step.state.matchingStatementIds.join('+') || '--'}`,
  }));
}

function nodePoint(nodeId: string, path: ForestBinaryPath): { x: number; y: number } {
  if (nodeId === 'p') return { x: 310, y: 34 };
  if (nodeId === 'u') return { x: 310, y: 112 };
  if (nodeId === 'k') return path[0] === 'L' ? { x: 188, y: 208 } : { x: 462, y: 112 };
  if (path[1] === 'L') return { x: path[0] === 'L' ? 188 : 462, y: 286 };
  return { x: path[0] === 'L' ? 310 : 584, y: path[0] === 'L' ? 208 : 112 };
}

function BinaryRelationView({ trace, step }: { trace: ForestBinaryCaseTrace; step: ForestBinaryStep }) {
  const decoded = new Set(step.state.decodedLinks.map((link) => `${link.fromId}-${link.toId}`));
  const active = step.activeEdgeIndex === null ? null : step.state.decodedLinks.at(-1);
  const width = trace.path === 'RR' ? 640 : 520;
  const height = trace.path === 'LL' ? 350 : 310;
  const edges = trace.binaryView.nodes.flatMap((node) => (
    ([['L', node.leftId], ['R', node.rightId]] as const)
      .filter(([, childId]) => childId !== null)
      .map(([side, childId]) => ({ node, side, childId }))
  ));

  return (
    <section className="forest-binary-view-panel" aria-label="二叉树视图">
      <div className="forest-binary-view-heading"><strong>二叉树 · 路径 {trace.path}</strong><small>L = 左孩子，R = 右孩子</small></div>
      <svg className="forest-binary-svg" role="img" aria-label="二叉树图形" viewBox={`0 0 ${width} ${height}`}>
        <title>二叉树视图</title>
        <desc>从 u 经过中间结点 k 到 v 的 {trace.path} 路径，p 是保持兄弟关系合法的上层上下文结点。</desc>
        {edges.map(({ node, side, childId }) => {
          const from = nodePoint(node.id, trace.path);
          const to = nodePoint(childId!, trace.path);
          const isPathEdge = (node.id === 'u' && childId === 'k') || (node.id === 'k' && childId === 'v');
          const isDecoded = decoded.has(`${node.id}-${childId}`);
          const isActive = active?.fromId === node.id && active.toId === childId;
          return <line key={`${node.id}-${side}`} className={`${isPathEdge && isDecoded ? 'decoded' : ''} ${isActive ? 'active' : ''}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
        {trace.binaryView.nodes.map((node) => {
          const point = nodePoint(node.id, trace.path);
          return (
            <g key={node.id} className={`forest-binary-node ${node.id === 'p' ? 'context' : ''}`} transform={`translate(${point.x} ${point.y})`}>
              <circle r="25" />
              <text dy=".35em">{node.id}</text>
              <title>{node.id === 'p' ? '上层上下文结点' : `结点 ${node.id}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="forest-binary-edge-list" aria-label="二叉边语义">
        {trace.path.split('').map((side, index) => (
          <span key={`${side}-${index}`} data-decoded={step.state.decodedLinks.length > index ? 'true' : 'false'}><code>{index === 0 ? 'u→k' : 'k→v'}</code><strong>{side}</strong><small>{side === 'L' ? '首孩子' : '下一兄弟'}</small></span>
        ))}
      </div>
      <small className="forest-binary-context-note">p 仅用于固定合法的共同上层关系，不参与题干两边路径判定。</small>
    </section>
  );
}

function ForestRelationView({ trace, step }: { trace: ForestBinaryCaseTrace; step: ForestBinaryStep }) {
  const parentByChild = new Map<string, string>();
  for (const node of trace.forestView.nodes) for (const child of node.childIds) parentByChild.set(child, node.id);
  return (
    <section className="forest-binary-view-panel" aria-label="森林视图">
      <div className="forest-binary-view-heading"><strong>森林 · 左孩子右兄弟还原</strong><small>同一父结点下的孩子按顺序排列</small></div>
      <div className="forest-binary-forest-rows">
        {trace.forestView.nodes.map((node) => (
          <div className={`forest-binary-forest-row ${node.id === 'p' ? 'context' : ''}`} key={node.id} data-forest-node-id={node.id}>
            <strong>{node.id}</strong>
            <span>{node.id === 'p' ? '上层上下文' : `parent=${parentByChild.get(node.id) ?? 'root'}`}</span>
            <code>children=[{node.childIds.join(', ') || '--'}]</code>
          </div>
        ))}
      </div>
      <div className="forest-binary-forest-callout"><GitFork size={15} aria-hidden="true" /><span>{step.state.relation === null ? '等待两条边解码后判定' : relationLabels[step.state.relation]}</span></div>
    </section>
  );
}

function Statements({ selected }: { selected: readonly string[] }) {
  const entries = [
    ['I', 'u、v 是父子关系'],
    ['II', 'u、v 是兄弟关系'],
    ['III', 'u 的父结点与 v 的父结点是兄弟'],
  ] as const;
  return (
    <div className="forest-binary-statements" aria-label="题干命题判定">
      {entries.map(([id, label]) => <div key={id} data-possible={selected.includes(id) ? 'true' : 'false'}><strong>{id}</strong><span>{label}</span><em>{selected.includes(id) ? '可能' : '本四案例不成立'}</em></div>)}
    </div>
  );
}

export function ForestBinaryRelationLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPath = searchParams.get('path');
  const computationKey = requestedPath ?? 'invalid';
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => {
    if (requestedPath !== null && !isPath(requestedPath)) {
      return { ok: false as const, message: 'path 必须是 LL、LR、RL 或 RR。' };
    }
    const path = isPath(requestedPath) ? requestedPath : 'LR';
    try {
      const trace = traceForestBinaryRelation(path);
      return { ok: true as const, path, trace, analysis: analyzeQ6ForestBinaryRelations() };
    } catch (reason) {
      return { ok: false as const, message: reason instanceof Error ? reason.message : 'Q6 路径无效。' };
    }
  }, [requestedPath]);
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => current.key === computationKey && current.index === index ? current : { key: computationKey, index });
  }, [computationKey]);
  const currentStep = computation.ok ? computation.trace.steps[Math.min(activeIndex, computation.trace.steps.length - 1)]! : null;
  const question = useMemo(() => questions.find((candidate) => candidate.id === 'cn408-2009-q06' || (candidate.year === 2009 && candidate.number === 6)), [questions]);

  const selectPath = (path: ForestBinaryPath) => {
    setActiveIndex(0);
    setSearchParams({ module: 'forest-conversion', preset: FOREST_BINARY_RELATION_Q6_PRESET.sourceQuestionId, path }, { replace: true });
  };
  const restorePreset = () => selectPath('LR');
  const practiceQ6 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q6 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <LabExhibit
      pageClassName="forest-binary-lab-page"
      subjectLabel="数据结构实验 · 森林与二叉树"
      title="森林与二叉树转换实验室"
      description="用左孩子右兄弟规则逐边解码 Q6 的四种路径，核对题干中的关系命题。"
      headerAction={(
        <button className="lab-exhibit-keycap" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ6()}><BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q6'}</button>
      )}
      navigation={(
        <>
          <LabSectionNav />
          <DataStructuresModuleTabs active="forest-conversion" />
        </>
      )}
      alert={startError && <div className="lab-exhibit-inline-alert" role="alert">{startError}</div>}
      notice={(
        <LabExhibitNotice
          icon={<Workflow size={16} aria-hidden="true" />}
          label="本地练习预设 · Q6"
          badge={question?.reviewStatus ?? FOREST_BINARY_RELATION_Q6_PRESET.reviewStatus}
          note="题包与来源解析仍待人工复核；实验只证明四条局部路径，不提升审核状态。"
          action={(
            <button className="lab-exhibit-keycap compact" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q06')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
          )}
        />
      )}
      subheading={(
        <>
          <GitFork size={18} aria-hidden="true" />
          <span>左孩子右兄弟 · 四案例闭集 · 关系判定</span>
          <Workflow size={14} aria-hidden="true" />
        </>
      )}
      controls={!computation.ok ? (
        <section className="lab-exhibit-error forest-binary-invalid" role="alert"><strong>无法解码当前路径</strong><p>{computation.message}</p><button className="lab-exhibit-keycap compact" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q6 预设</button></section>
      ) : currentStep && (
        <section className="lab-exhibit-control-card" aria-labelledby="forest-binary-control-heading">
          <div className="lab-exhibit-card-head">
            <h2 id="forest-binary-control-heading">选择二叉路径</h2>
            <button className="lab-exhibit-keycap compact" type="button" onClick={restorePreset}>
              <RotateCcw size={16} aria-hidden="true" />恢复 Q6 预设
            </button>
          </div>
          <div className="forest-binary-path-control rollout-options" aria-label="二叉路径">
            {paths.map((path) => <button key={path} type="button" className="lab-exhibit-keycap compact" aria-pressed={path === computation.path} onClick={() => selectPath(path)}>{path}</button>)}
          </div>
          <p className="forest-binary-path-explanation">路径从 <code>u</code> 出发，经过 <code>k</code> 到达 <code>v</code>；每个字母只描述二叉树中的一条边。</p>
          <div className="lab-exhibit-metrics rollout-three-metrics" aria-label="当前关系">
            <div><small>当前关系</small><strong>{currentStep.state.relation === null ? '待判定' : relationLabels[currentStep.state.relation]}</strong></div>
            <div><small>匹配题干命题</small><strong>{currentStep.state.relation === null ? '待判定' : currentStep.state.matchingStatementIds.join('、') || '无'}</strong></div>
            <div><small>四案例总览</small><strong>I、II 可能 · III 不成立 · 选 B</strong></div>
          </div>
        </section>
      )}
      status={computation.ok && currentStep && (
        <div className="forest-binary-current-event lab-exhibit-status-card" aria-live="polite" aria-atomic="true" aria-label="当前证明步骤">
          <Workflow size={18} aria-hidden="true" />
          <div><span>当前证明步骤</span><strong>{edgeText(currentStep)}</strong></div>
          <code>path={computation.path} · decoded={currentStep.state.decodedLinks.length}/2</code>
        </div>
      )}
      canvas={computation.ok && currentStep && (
        <section className="forest-binary-state-panel lab-exhibit-stage" aria-labelledby="forest-binary-state-heading">
          <div className="lab-exhibit-stage-head">
            <div className="lab-exhibit-stage-title"><h2 id="forest-binary-state-heading">两种表示同步对照</h2></div>
            <GitFork size={19} aria-hidden="true" />
          </div>
          <div className="forest-binary-dual-view">
            <BinaryRelationView trace={computation.trace} step={currentStep} />
            <ForestRelationView trace={computation.trace} step={currentStep} />
          </div>
          <Statements selected={computation.analysis.result.possibleStatementIds} />
        </section>
      )}
      steps={computation.ok && currentStep && (
        <StepExplorer key={computationKey} steps={explorerSteps(computation.trace)} onActiveIndexChange={setActiveIndex} announceChanges={false} className="forest-binary-step-explorer" />
      )}
    />
  );
}
