import {
  TCP_Q39_PRESET,
  simulateTcpCongestion,
  type TcpCongestionEvent,
  type TcpCongestionRule,
  type TcpCongestionSimulation,
  type TcpCongestionState,
} from '@408os/lab-core';
import {
  ArrowRight,
  BookOpenCheck,
  CircleGauge,
  Gauge,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabExhibit, LabExhibitNotice } from '../components/LabExhibit';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface TcpDraft {
  readonly initialCwndMss: string;
  readonly initialSsthreshMss: string;
  readonly mssKilobytes: string;
  readonly eventScript: string;
}

interface TcpPreset {
  readonly id: string;
  readonly label: string;
  readonly draft: TcpDraft;
}

interface TcpCalculationSuccess {
  readonly ok: true;
  readonly simulation: TcpCongestionSimulation;
  readonly events: readonly TcpCongestionEvent[];
  readonly mssKilobytes: number;
}

interface TcpCalculationFailure {
  readonly ok: false;
  readonly message: string;
}

type TcpCalculation = TcpCalculationSuccess | TcpCalculationFailure;

const eventLabels: Record<TcpCongestionEvent['type'], string> = {
  'rtt-acked': '一个 RTT 成功确认',
  timeout: '发生超时',
  'triple-duplicate-ack': '收到 3 个重复 ACK',
};

const ruleLabels: Record<TcpCongestionRule, string> = {
  'slow-start-double': '慢开始：窗口翻倍',
  'slow-start-reach-threshold': '到达门限：转入拥塞避免',
  'congestion-avoidance-add-one': '拥塞避免：窗口加 1 MSS',
  'timeout-reset': '超时：门限减半，窗口归 1 MSS',
  'triple-duplicate-fast-recovery': '三次重复 ACK：门限减半并快速恢复',
};

const q39Draft: TcpDraft = {
  initialCwndMss: String(TCP_Q39_PRESET.config.initialCwndMss),
  initialSsthreshMss: String(TCP_Q39_PRESET.config.initialSsthreshMss),
  mssKilobytes: String(TCP_Q39_PRESET.mssKilobytes),
  eventScript: ['timeout', 'rtt', 'rtt', 'rtt', 'rtt'].join('\n'),
};

const tcpPresets: readonly TcpPreset[] = [
  { id: 'cn408-2009-q39', label: 'Q39 超时后四轮增长', draft: q39Draft },
  {
    id: 'slow-start',
    label: '慢开始跨越门限',
    draft: { initialCwndMss: '1', initialSsthreshMss: '10', mssKilobytes: '1', eventScript: 'rtt\nrtt\nrtt\nrtt\nrtt' },
  },
  {
    id: 'duplicate-ack',
    label: '三次重复 ACK',
    draft: { initialCwndMss: '16', initialSsthreshMss: '12', mssKilobytes: '1', eventScript: 'dup3\nrtt\nrtt' },
  },
];

function parsePositiveInteger(value: string, label: string): number {
  if (!/^[1-9][0-9]*$/u.test(value.trim())) throw new Error(`${label}必须是正整数。`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label}超出安全整数范围。`);
  return parsed;
}

function parseEventScript(value: string): readonly TcpCongestionEvent[] {
  const tokens = value.split(/[\s,，;；]+/u).filter(Boolean);
  if (!tokens.length) throw new Error('请输入至少一个网络事件。');
  return tokens.map((rawToken, index) => {
    const token = rawToken.toLowerCase();
    if (token === 'rtt' || token === 'ack' || token === 'rtt-acked') return { type: 'rtt-acked' };
    if (token === 'timeout' || token === '超时') return { type: 'timeout' };
    if (token === 'dup3' || token === 'triple-duplicate-ack') return { type: 'triple-duplicate-ack' };
    throw new Error(`第 ${index + 1} 个事件“${rawToken}”无效；请使用 rtt、timeout 或 dup3。`);
  });
}

function calculateTcp(draft: TcpDraft): TcpCalculation {
  try {
    const initialCwndMss = parsePositiveInteger(draft.initialCwndMss, '初始 cwnd');
    const initialSsthreshMss = parsePositiveInteger(draft.initialSsthreshMss, '初始 ssthresh');
    const mssKilobytes = parsePositiveInteger(draft.mssKilobytes, 'MSS 大小');
    const events = parseEventScript(draft.eventScript);
    return {
      ok: true,
      events,
      mssKilobytes,
      simulation: simulateTcpCongestion({
        model: 'cn408-classic',
        initialCwndMss,
        initialSsthreshMss,
      }, events),
    };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : '无法完成 TCP 拥塞控制模拟。' };
  }
}

function tcpExplorerSteps(simulation: TcpCongestionSimulation, mssKilobytes: number): readonly ExplorerStep[] {
  return simulation.trace.map((step, index) => ({
    id: step.id,
    label: `${index + 1}. ${eventLabels[step.event.type]}`,
    value: `${ruleLabels[step.rule]}；cwnd ${step.before.cwndMss} -> ${step.after.cwndMss} MSS，ssthresh ${step.before.ssthreshMss} -> ${step.after.ssthreshMss} MSS（${step.after.cwndMss * mssKilobytes} KB）`,
  }));
}

function pointCoordinates(states: readonly TcpCongestionState[]) {
  const maximum = Math.max(1, ...states.flatMap((state) => [state.cwndMss, state.ssthreshMss]));
  const width = 760;
  const height = 188;
  return states.map((state, index) => ({
    state,
    x: states.length === 1 ? 40 : 40 + (index / (states.length - 1)) * width,
    cwndY: 220 - (state.cwndMss / maximum) * height,
    ssthreshY: 220 - (state.ssthreshMss / maximum) * height,
  }));
}

function TcpWindowChart({ simulation, activeStepIndex }: { simulation: TcpCongestionSimulation; activeStepIndex: number }) {
  const states = [simulation.initialState, ...simulation.trace.map((step) => step.after)];
  const points = pointCoordinates(states);
  const visibleCount = Math.min(points.length, activeStepIndex + 2);
  const visiblePoints = points.slice(0, visibleCount);
  const line = (key: 'cwndY' | 'ssthreshY') => visiblePoints.map((point) => `${point.x},${point[key]}`).join(' ');

  return (
    <div className="tcp-chart-viewport">
      <svg className="tcp-window-chart" viewBox="0 0 840 260" role="img" aria-labelledby="tcp-chart-title tcp-chart-description">
        <title id="tcp-chart-title">拥塞窗口与慢开始门限变化</title>
        <desc id="tcp-chart-description">当前显示到第 {activeStepIndex + 1} 个事件，实线为 cwnd，虚线为 ssthresh。</desc>
        {[0, 1, 2, 3, 4].map((lineIndex) => (
          <line key={lineIndex} className="tcp-grid-line" x1="40" x2="800" y1={32 + lineIndex * 47} y2={32 + lineIndex * 47} />
        ))}
        <polyline className="tcp-threshold-line" points={line('ssthreshY')} />
        <polyline className="tcp-cwnd-line" points={line('cwndY')} />
        {visiblePoints.map((point, index) => (
          <g key={point.state.step} className={index === visiblePoints.length - 1 ? 'current' : ''}>
            <circle className="tcp-cwnd-point" cx={point.x} cy={point.cwndY} r="6" />
            <text x={point.x} y="244">{index === 0 ? '初始' : `E${index}`}</text>
            <text className="tcp-value-label" x={point.x} y={Math.max(18, point.cwndY - 11)}>{point.state.cwndMss}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TcpStateSummary({ state, mssKilobytes }: { state: TcpCongestionState; mssKilobytes: number }) {
  return (
    <dl className="tcp-state-summary" aria-label="当前 TCP 拥塞状态" aria-live="polite">
      <div><dt>拥塞窗口 cwnd</dt><dd>{state.cwndMss} MSS<small>{state.cwndMss * mssKilobytes} KB</small></dd></div>
      <div><dt>慢开始门限</dt><dd>{state.ssthreshMss} MSS<small>{state.ssthreshMss * mssKilobytes} KB</small></dd></div>
      <div><dt>当前阶段</dt><dd>{state.phase === 'slow-start' ? '慢开始' : '拥塞避免'}<small>{state.phase}</small></dd></div>
      <div><dt>模型单位</dt><dd>{mssKilobytes} KB / MSS<small>整数 MSS</small></dd></div>
    </dl>
  );
}

export function TcpCongestionLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPreset = tcpPresets.find((candidate) => candidate.id === searchParams.get('preset')) ?? tcpPresets[0]!;
  const [presetId, setPresetId] = useState(requestedPreset.id);
  const [draft, setDraft] = useState<TcpDraft>(requestedPreset.draft);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const calculation = useMemo(() => calculateTcp(draft), [draft]);
  const q39 = questions.find((question) => question.id === 'cn408-2009-q39' || (question.year === 2009 && question.number === 39));
  const q39Id = q39?.id;
  const currentState = calculation.ok
    ? calculation.simulation.trace[Math.min(activeStepIndex, calculation.simulation.trace.length - 1)]?.after
      ?? calculation.simulation.initialState
    : null;

  const patchDraft = (patch: Partial<TcpDraft>) => {
    setPresetId('custom');
    setDraft((current) => ({ ...current, ...patch }));
    setActiveStepIndex(0);
  };

  const selectPreset = (nextId: string) => {
    const preset = tcpPresets.find((candidate) => candidate.id === nextId);
    if (!preset) return;
    setPresetId(preset.id);
    setDraft(preset.draft);
    setActiveStepIndex(0);
    setSearchParams({ module: 'tcp-congestion', preset: preset.id }, { replace: true });
  };

  const practiceQ39 = async () => {
    if (!q39Id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([q39Id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q39 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <LabExhibit
      pageClassName="tcp-lab-page"
      subjectLabel="计算机网络实验 · 传输层"
      title="TCP 拥塞控制实验室"
      description="逐 RTT 重放慢开始、拥塞避免与丢包反馈，观察 cwnd 和 ssthresh。"
      headerAction={(
        <button className="lab-exhibit-keycap" type="button" disabled={!q39Id || starting} onClick={() => void practiceQ39()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q39'}
        </button>
      )}
      navigation={(
        <>
          <LabSectionNav />
          <NetworkModuleTabs active="tcp-congestion" />
        </>
      )}
      alert={startError ? <div className="lab-exhibit-inline-alert" role="alert">{startError}</div> : null}
      notice={(
        <LabExhibitNotice
          icon={<ShieldAlert size={16} aria-hidden="true" />}
          label="408 经典超时模型"
          badge={q39?.reviewStatus ?? TCP_Q39_PRESET.reviewStatus}
          note="这是考研题常用的离散教学模型，不代表所有现代 TCP 实现的唯一行为。"
          action={(
            <button className="lab-exhibit-keycap compact" type="button" onClick={() => navigate('/knowledge?subject=computer-networks&node=topic-2009-q39')}>
              查看知识节点<ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        />
      )}
      subheading={(
        <>
          <Gauge size={18} aria-hidden="true" />
          <span>cwnd / ssthresh · integer MSS</span>
          <CircleGauge size={14} aria-hidden="true" />
        </>
      )}
      controls={(
        <section className="lab-exhibit-control-card" aria-labelledby="tcp-control-title">
          <div className="lab-exhibit-card-head">
            <h2 id="tcp-control-title">初始状态与网络事件</h2>
            <div className="lab-exhibit-card-actions">
              <label className="lab-exhibit-inline-select">
                <span>典型预设</span>
                <select aria-label="TCP 典型预设" value={presetId} onChange={(event) => selectPreset(event.target.value)}>
                  {presetId === 'custom' && <option value="custom">自定义输入</option>}
                  {tcpPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                </select>
              </label>
              <button className="lab-exhibit-keycap compact" type="button" onClick={() => selectPreset('cn408-2009-q39')}>
                <RotateCcw size={15} aria-hidden="true" />恢复 Q39 预设
              </button>
            </div>
          </div>

          <div className="lab-exhibit-input-grid cols-3">
            <label className="lab-exhibit-field">
              <span>初始 cwnd（MSS）</span>
              <input aria-label="初始拥塞窗口" inputMode="numeric" value={draft.initialCwndMss} onChange={(event) => patchDraft({ initialCwndMss: event.target.value })} />
            </label>
            <label className="lab-exhibit-field">
              <span>初始 ssthresh（MSS）</span>
              <input aria-label="初始慢开始门限" inputMode="numeric" value={draft.initialSsthreshMss} onChange={(event) => patchDraft({ initialSsthreshMss: event.target.value })} />
            </label>
            <label className="lab-exhibit-field">
              <span>MSS 大小（KB）</span>
              <input aria-label="MSS 大小" inputMode="numeric" value={draft.mssKilobytes} onChange={(event) => patchDraft({ mssKilobytes: event.target.value })} />
            </label>
          </div>

          <label className="lab-exhibit-field lab-exhibit-field-spaced">
            <span>事件脚本（rtt / timeout / dup3）</span>
            <textarea aria-label="TCP 事件脚本" rows={4} spellCheck={false} value={draft.eventScript} onChange={(event) => patchDraft({ eventScript: event.target.value })} />
          </label>

          {!calculation.ok ? <div className="lab-exhibit-error" role="alert">{calculation.message}</div> : null}
        </section>
      )}
      canvas={calculation.ok && currentState ? (
        <section className="lab-exhibit-stage" aria-labelledby="tcp-stage-heading">
          <div className="lab-exhibit-stage-head">
            <div className="lab-exhibit-stage-title">
              <h2 id="tcp-stage-heading">拥塞窗口与慢开始门限曲线</h2>
              <span className="lab-exhibit-stage-tag">实验画布</span>
            </div>
            <Gauge size={18} aria-hidden="true" />
          </div>
          <TcpWindowChart simulation={calculation.simulation} activeStepIndex={activeStepIndex} />
          <TcpStateSummary state={currentState} mssKilobytes={calculation.mssKilobytes} />
        </section>
      ) : null}
      steps={calculation.ok ? (
        <StepExplorer
          key={`${draft.initialCwndMss}:${draft.initialSsthreshMss}:${draft.eventScript}`}
          steps={tcpExplorerSteps(calculation.simulation, calculation.mssKilobytes)}
          onActiveIndexChange={setActiveStepIndex}
        />
      ) : (
        <section className="lab-exhibit-steps-empty">
          <Gauge size={24} aria-hidden="true" />
          <strong>等待有效事件</strong>
        </section>
      )}
      footer={calculation.ok ? (
        <section className="lab-exhibit-note-card" aria-label="模型边界">
          <strong>本实验的确定性规则</strong>
          <p>慢开始阶段每个完整确认的 RTT 将 cwnd 翻倍，但不越过 ssthresh；拥塞避免阶段每轮增加 1 MSS。</p>
          <p>超时时令 ssthresh = max(1, floor(cwnd / 2))，cwnd 回到 1 MSS，并重新进入慢开始。</p>
          <p>三次重复 ACK 时令 ssthresh 减半、cwnd 等于新门限并进入拥塞避免；本模型不模拟临时增加 3 MSS。</p>
        </section>
      ) : null}
    />
  );
}
