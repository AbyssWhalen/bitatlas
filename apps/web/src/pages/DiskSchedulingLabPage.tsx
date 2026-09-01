import {
  DISK_Q29_PRESET,
  simulateDiskSchedule,
  type DiskDirection,
  type DiskRequest,
  type DiskScheduleEvent,
  type DiskScheduleTrace,
  type DiskSchedulingPolicy,
} from '@408os/lab-core';
import {
  ArrowDownUp,
  BookOpenCheck,
  Disc3,
  GitCompareArrows,
  RotateCcw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { OsModuleTabs } from '../components/OsModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

const policyOptions: readonly DiskSchedulingPolicy[] = ['fcfs', 'sstf', 'scan', 'look', 'c-scan'];

interface SimulationSuccess {
  readonly ok: true;
  readonly requests: readonly DiskRequest[];
  readonly initialTrack: number;
  readonly direction: DiskDirection;
  readonly fcfs: DiskScheduleTrace;
  readonly sstf: DiskScheduleTrace;
  readonly scan: DiskScheduleTrace;
  readonly look: DiskScheduleTrace;
  readonly cScan: DiskScheduleTrace | null;
}

interface SimulationFailure {
  readonly ok: false;
  readonly message: string;
}

type SimulationResult = SimulationSuccess | SimulationFailure;

interface TracePoint {
  readonly eventIndex: number;
  readonly track: number;
  readonly label: string;
}

const presetTracksText = DISK_Q29_PRESET.config.requests
  .map((request) => request.track)
  .join(', ');

const directionLabels: Record<DiskDirection, string> = {
  increasing: '磁道号增大方向',
  decreasing: '磁道号减小方向',
};

const policyLabels: Record<DiskSchedulingPolicy, string> = {
  fcfs: 'FCFS',
  sstf: 'SSTF',
  scan: 'SCAN',
  look: 'LOOK',
  'c-scan': 'C-SCAN',
};

function parseNonNegativeInteger(value: string, label: string): number {
  const normalized = value.trim();
  if (!/^[0-9]+$/u.test(normalized)) throw new Error(`${label}必须是非负整数。`);
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label}超出安全整数范围。`);
  return parsed;
}

function parseRequests(value: string): readonly DiskRequest[] {
  const tokens = value.split(/[\s,，;；]+/u).filter(Boolean);
  if (!tokens.length) throw new Error('请输入至少一个待访问磁道。');
  return tokens.map((token, arrivalOrder) => ({
    id: `disk-request-${arrivalOrder + 1}`,
    track: parseNonNegativeInteger(token, `第 ${arrivalOrder + 1} 个磁道`),
    arrivalOrder,
  }));
}

function calculateSimulation(
  tracksText: string,
  initialTrackText: string,
  direction: DiskDirection,
  hasBounds: boolean,
  minTrackText: string,
  maxTrackText: string,
): SimulationResult {
  try {
    const requests = parseRequests(tracksText);
    const initialTrack = parseNonNegativeInteger(initialTrackText, '初始磁头位置');
    const bounds = hasBounds ? {
      minTrack: parseNonNegativeInteger(minTrackText, '最小磁道'),
      maxTrack: parseNonNegativeInteger(maxTrackText, '最大磁道'),
    } : undefined;
    const commonConfig = bounds === undefined
      ? { requests, initialTrack, direction }
      : { requests, initialTrack, direction, bounds };
    return {
      ok: true,
      requests,
      initialTrack,
      direction,
      fcfs: simulateDiskSchedule({ ...commonConfig, policy: 'fcfs' }),
      sstf: simulateDiskSchedule({ ...commonConfig, policy: 'sstf' }),
      scan: simulateDiskSchedule({ ...commonConfig, policy: 'scan' }),
      look: simulateDiskSchedule({ ...commonConfig, policy: 'look' }),
      cScan: bounds === undefined
        ? null
        : simulateDiskSchedule({ ...commonConfig, policy: 'c-scan' }),
    };
  } catch (reason) {
    return {
      ok: false,
      message: reason instanceof Error ? reason.message : '无法完成磁盘调度模拟。',
    };
  }
}

function eventStep(event: DiskScheduleEvent): ExplorerStep {
  switch (event.kind) {
    case 'service':
      return {
        id: event.id,
        label: `服务请求 ${event.requestId.replace('disk-request-', '#')}`,
        value: event.distance === null
          ? `访问磁道 ${event.track}；题设未给物理端点，只能确定访问次序。`
          : `${event.fromTrack} → ${event.track}，移动 ${event.distance} 个磁道。`,
      };
    case 'reach-boundary':
      return {
        id: event.id,
        label: `SCAN 继续扫向${event.boundary === 'max' ? '最大' : '最小'}物理端点`,
        value: event.track === null
          ? '题目没有给出端点磁道号，因此这段移动量未知。'
          : `${event.fromTrack} → ${event.track}，移动 ${event.distance} 个磁道。`,
      };
    case 'reverse':
      return {
        id: event.id,
        label: '磁头反向',
        value: `${directionLabels[event.fromDirection]} → ${directionLabels[event.toDirection]}，反向位置 ${event.atTrack ?? '物理端点（未知）'}。`,
      };
    case 'wrap':
      return {
        id: event.id,
        label: '磁头循环回绕',
        value: `${event.fromTrack} → ${event.toTrack}，移动 ${event.distance} 个磁道。`,
      };
  }
}

function tracePoints(trace: DiskScheduleTrace): readonly TracePoint[] {
  const points: TracePoint[] = [{ eventIndex: -1, track: trace.initialTrack, label: '起点' }];
  trace.events.forEach((event, eventIndex) => {
    if (event.kind === 'service') {
      points.push({ eventIndex, track: event.track, label: `访问 ${event.track}` });
    } else if (event.kind === 'reach-boundary' && event.track !== null) {
      points.push({ eventIndex, track: event.track, label: `到达端点 ${event.track}` });
    } else if (event.kind === 'wrap') {
      points.push({ eventIndex, track: event.toTrack, label: `回绕到 ${event.toTrack}` });
    }
  });
  return points;
}

function reversePosition(trace: DiskScheduleTrace): string {
  const reverse = trace.events.find((event) => event.kind === 'reverse');
  if (!reverse || reverse.kind !== 'reverse') return '无需反向';
  return reverse.atTrack === null ? '物理端点（题设未给磁道号）' : `磁道 ${reverse.atTrack}`;
}

function movementLabel(trace: DiskScheduleTrace): string {
  return trace.totalHeadMovement === null
    ? '无法由题设唯一计算'
    : `${trace.totalHeadMovement} 个磁道`;
}

function DiskTrackFigure({
  trace,
  requests,
  activeEventIndex,
}: {
  trace: DiskScheduleTrace;
  requests: readonly DiskRequest[];
  activeEventIndex: number;
}) {
  const allTracks = [trace.initialTrack, ...requests.map((request) => request.track)];
  if (trace.bounds !== null) allTracks.push(trace.bounds.minTrack, trace.bounds.maxTrack);
  const minimum = Math.min(...allTracks);
  const maximum = Math.max(...allTracks);
  const span = Math.max(1, maximum - minimum);
  const toX = (track: number) => 54 + ((track - minimum) / span) * 592;
  const points = tracePoints(trace);
  const visiblePoints = points.filter((point) => point.eventIndex <= activeEventIndex);
  const currentPoint = visiblePoints.at(-1) ?? points[0]!;
  const chartHeight = Math.max(230, 90 + points.length * 18);
  const axisY = chartHeight - 28;
  const pathPoints = visiblePoints.map((point, index) => (
    `${toX(point.track)},${34 + index * 18}`
  )).join(' ');

  return (
    <div className="table-responsive">
      <svg
        viewBox={`0 0 700 ${chartHeight}`}
        role="img"
        aria-label={`${policyLabels[trace.policy]} 调度轨迹，当前位于磁道 ${currentPoint.track}`}
        data-active-track={currentPoint.track}
        data-active-event={activeEventIndex}
        style={{ display: 'block', width: '100%', minWidth: 620, height: 'auto' }}
      >
        <title>{policyLabels[trace.policy]} 磁头移动轨迹</title>
        <desc>横轴为磁道号，折线按事件顺序显示已执行的磁头移动。</desc>
        <line x1="54" y1={axisY} x2="646" y2={axisY} stroke="var(--line)" strokeWidth="2" />
        <text x="54" y={axisY + 19} fill="var(--muted)" fontSize="11" textAnchor="middle">{minimum}</text>
        <text x="646" y={axisY + 19} fill="var(--muted)" fontSize="11" textAnchor="middle">{maximum}</text>
        {requests.map((request) => (
          <g key={request.id} transform={`translate(${toX(request.track)} ${axisY})`}>
            <circle r="4" fill="var(--surface)" stroke="var(--muted)" strokeWidth="1.5" />
            <title>请求 {request.arrivalOrder + 1}：磁道 {request.track}</title>
          </g>
        ))}
        {visiblePoints.length > 1 && (
          <polyline points={pathPoints} fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {visiblePoints.map((point, index) => (
          <g key={`${point.eventIndex}:${point.track}`} transform={`translate(${toX(point.track)} ${34 + index * 18})`}>
            <circle r={point === currentPoint ? 6 : 4} fill={point === currentPoint ? 'var(--red)' : 'var(--surface)'} stroke="var(--red)" strokeWidth="2" />
            <text x="10" y="4" fill="var(--ink)" fontSize="11">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TraceComparison({ scan, look }: { scan: DiskScheduleTrace; look: DiskScheduleTrace }) {
  return (
    <section className="ds-comparison" aria-labelledby="disk-comparison-title">
      <div className="ds-comparison-heading">
        <div><span className="eyebrow">SCAN / LOOK</span><h2 id="disk-comparison-title">同一请求序列对照</h2></div>
        <GitCompareArrows size={20} aria-hidden="true" />
      </div>
      <div className="table-responsive">
        <table className="table">
          <thead><tr><th scope="col">算法</th><th scope="col">服务顺序</th><th scope="col">反向位置</th><th scope="col">总移动量</th></tr></thead>
          <tbody>
            {[scan, look].map((trace) => (
              <tr key={trace.policy}>
                <th scope="row">{policyLabels[trace.policy]}</th>
                <td><code>{trace.serviceOrder.join(' → ')}</code></td>
                <td>{reversePosition(trace)}</td>
                <td>{movementLabel(trace)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><ArrowDownUp size={15} aria-hidden="true" />SCAN 必须继续移动到物理端点后反向；LOOK 在当前方向的最后一个请求处反向。Q29 未给物理端点，因此 SCAN 的总移动量不能唯一确定。</p>
    </section>
  );
}

export function DiskSchedulingLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tracksText = searchParams.has('tracks') ? (searchParams.get('tracks') ?? '') : presetTracksText;
  const initialTrackText = searchParams.has('head')
    ? (searchParams.get('head') ?? '')
    : String(DISK_Q29_PRESET.config.initialTrack);
  const direction: DiskDirection = searchParams.get('direction') === 'decreasing'
    ? 'decreasing'
    : 'increasing';
  const requestedPolicy = searchParams.get('policy');
  const policy: DiskSchedulingPolicy = policyOptions.includes(requestedPolicy as DiskSchedulingPolicy)
    ? requestedPolicy as DiskSchedulingPolicy
    : 'scan';
  const hasBounds = searchParams.get('bounds') === '1';
  const minTrackText = searchParams.has('min') ? (searchParams.get('min') ?? '') : '0';
  const maxTrackText = searchParams.has('max') ? (searchParams.get('max') ?? '') : '199';
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const simulation = useMemo(() => calculateSimulation(
    tracksText,
    initialTrackText,
    direction,
    hasBounds,
    minTrackText,
    maxTrackText,
  ), [direction, hasBounds, initialTrackText, maxTrackText, minTrackText, tracksText]);
  const activeTrace = simulation.ok
    ? policy === 'c-scan'
      ? simulation.cScan ?? undefined
      : simulation[policy]
    : undefined;
  const activeEvent = activeTrace?.events[Math.min(activeEventIndex, activeTrace.events.length - 1)];
  const q29 = questions.find((question) => (
    question.id === DISK_Q29_PRESET.sourceQuestionId
      || (question.year === 2009 && question.number === 29)
  ));

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('module', 'disk');
    next.set('preset', DISK_Q29_PRESET.sourceQuestionId);
    next.set(key, value);
    setSearchParams(next, { replace: true });
    setActiveEventIndex(0);
  };

  const restorePreset = () => {
    setSearchParams({
      module: 'disk',
      preset: DISK_Q29_PRESET.sourceQuestionId,
      policy: 'scan',
    }, { replace: true });
    setActiveEventIndex(0);
  };

  const practiceQ29 = async () => {
    if (!q29 || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([q29.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q29 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div><span className="eyebrow">OS LAB / DISK SCHEDULING</span><h1>磁盘调度实验室</h1><p>逐步重放磁头移动，并辨认 SCAN 与 LOOK 的反向边界。</p></div>
        <button className="secondary-command" type="button" disabled={!q29 || starting} onClick={() => void practiceQ29()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q29'}
        </button>
      </header>
      <LabSectionNav />
      <OsModuleTabs active="disk" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="vm-review-band">
        <span><Disc3 size={16} aria-hidden="true" />Q29 SCAN 调度预设</span>
        <strong>{q29?.reviewStatus ?? DISK_Q29_PRESET.reviewStatus}</strong>
        <small>题设只确定服务次序，未给出的物理磁道上界不会被实验室臆造。</small>
      </div>

      <div className="lab-module-heading"><Disc3 size={18} aria-hidden="true" /><span>SCAN / LOOK · 非负整数磁道</span><GitCompareArrows size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid ds-lab-grid">
        <section className="lab-control-panel" aria-labelledby="disk-control-title">
          <div className="lab-control-heading">
            <div><span className="eyebrow">INPUT / CONFIG</span><h2 id="disk-control-title">请求序列与磁头状态</h2></div>
            <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q29 预设</button>
          </div>

          <div className="segmented-control disk-policy-switch" aria-label="当前重放算法">
            {policyOptions.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={policy === candidate ? 'active' : ''}
                aria-pressed={policy === candidate}
                onClick={() => updateParam('policy', candidate)}
              >{policyLabels[candidate]}</button>
            ))}
          </div>

          <label className="lab-input-field full">
            <span>待访问磁道（按到达顺序，逗号或空格分隔）</span>
            <input aria-label="待访问磁道" value={tracksText} onChange={(event) => updateParam('tracks', event.target.value)} spellCheck={false} />
          </label>
          <div className="vm-timing-grid">
            <label className="lab-input-field"><span>初始磁头位置</span><input aria-label="初始磁头位置" inputMode="numeric" value={initialTrackText} onChange={(event) => updateParam('head', event.target.value)} /></label>
            <label className="lab-input-field"><span>初始移动方向</span><select aria-label="初始移动方向" value={direction} onChange={(event) => updateParam('direction', event.target.value)}><option value="increasing">磁道号增大</option><option value="decreasing">磁道号减小</option></select></label>
            <label className="pipeline-forwarding-toggle"><input aria-label="使用物理磁道边界" type="checkbox" checked={hasBounds} onChange={(event) => updateParam('bounds', event.target.checked ? '1' : '0')} />使用物理边界</label>
          </div>
          {hasBounds && (
            <div className="vm-timing-grid">
              <label className="lab-input-field"><span>最小磁道</span><input aria-label="最小磁道" inputMode="numeric" value={minTrackText} onChange={(event) => updateParam('min', event.target.value)} /></label>
              <label className="lab-input-field"><span>最大磁道</span><input aria-label="最大磁道" inputMode="numeric" value={maxTrackText} onChange={(event) => updateParam('max', event.target.value)} /></label>
            </div>
          )}

          {!simulation.ok ? <div className="lab-error" role="alert">{simulation.message}</div> : policy === 'c-scan' && !activeTrace ? (
            <div className="lab-error" role="alert">C-SCAN 必须知道物理磁道边界；请启用“使用物理边界”并填写实际范围。</div>
          ) : activeTrace && (
            <>
              <dl className="vm-address-breakdown" aria-live="polite">
                <div><dt>当前算法</dt><dd>{policyLabels[policy]}</dd></div>
                <div><dt>当前事件</dt><dd>{Math.min(activeEventIndex + 1, activeTrace.events.length)} / {activeTrace.events.length}</dd></div>
                <div><dt>反向位置</dt><dd>{reversePosition(activeTrace)}</dd></div>
                <div><dt>总移动量</dt><dd>{movementLabel(activeTrace)}</dd></div>
              </dl>
              <DiskTrackFigure trace={activeTrace} requests={simulation.requests} activeEventIndex={activeEventIndex} />
            </>
          )}
        </section>

        {activeTrace ? (
          <StepExplorer
            key={`${policy}:${tracksText}:${initialTrackText}:${direction}:${hasBounds}:${minTrackText}:${maxTrackText}`}
            steps={activeTrace.events.map(eventStep)}
            onActiveIndexChange={setActiveEventIndex}
          />
        ) : (
          <section className="step-explorer"><Disc3 size={24} aria-hidden="true" /><strong>等待有效输入</strong></section>
        )}
      </div>

      {simulation.ok && <TraceComparison scan={simulation.scan} look={simulation.look} />}
      {activeEvent?.kind === 'reach-boundary' && activeEvent.track === null && (
        <div className="status-message" role="status">当前 SCAN 步骤到达未知物理端点：服务顺序仍确定，但该段移动距离不可计算。</div>
      )}
    </div>
  );
}
