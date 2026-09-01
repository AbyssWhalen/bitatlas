import {
  GBN_Q35_PRESET,
  simulateGbn,
  type GbnAction,
  type GbnEvent,
  type GbnState,
  type GbnTrace,
  type GbnTraceStep,
} from '@408os/lab-core';
import { BookOpenCheck, CircleDot, Inbox, RadioTower, RotateCcw, Send, TimerReset } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SuccessfulComputation {
  ok: true;
  trace: GbnTrace;
  explorerSteps: ExplorerStep[];
  snapshots: readonly GbnState[];
}

interface FailedComputation {
  ok: false;
  message: string;
}

type GbnComputation = SuccessfulComputation | FailedComputation;

interface GbnDraft {
  readonly sequenceSpace: string;
  readonly windowSize: string;
  readonly script: string;
}

interface LocalRejectedDraft {
  readonly locationKey: string;
  readonly draft: GbnDraft;
}

const MAX_VISUAL_SEQUENCE_SPACE = 32;
const MAX_SCRIPT_LENGTH = 16_384;
const MAX_ACTIONS = 128;
const MAX_URL_SEARCH_LENGTH = 8_000;

function actionText(action: GbnAction): string {
  switch (action.type) {
    case 'send':
    case 'timeout':
      return action.type;
    case 'frame-arrive':
    case 'drop-frame':
      return `${action.type} ${action.sequenceNumber}`;
    case 'ack-arrive':
    case 'drop-ack':
      return `${action.type} ${action.ackNumber}`;
  }
}

const Q35_SCRIPT = GBN_Q35_PRESET.actions.map(actionText).join('\n');

function parseInteger(text: string, label: string): number {
  const trimmed = text.trim();
  if (!/^(?:0|[1-9][0-9]*)$/u.test(trimmed)) throw new RangeError(`${label}必须是十进制整数。`);
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label}超出安全整数范围。`);
  return value;
}

function parseConfig(sequenceSpaceText: string, windowSizeText: string) {
  const sequenceSpace = parseInteger(sequenceSpaceText, '序号空间');
  if (sequenceSpace < 2 || sequenceSpace > MAX_VISUAL_SEQUENCE_SPACE) {
    throw new RangeError(`序号空间必须是 2 至 ${MAX_VISUAL_SEQUENCE_SPACE}。`);
  }
  const windowSize = parseInteger(windowSizeText, '发送窗口');
  if (windowSize < 1) throw new RangeError('发送窗口必须至少为 1。');
  if (windowSize >= sequenceSpace) throw new RangeError('发送窗口必须小于序号空间。');
  return { sequenceSpace, windowSize, initialSequenceNumber: 0 } as const;
}

function parseSequenceNumber(token: string | undefined, lineNumber: number, sequenceSpace: number): number {
  if (token === undefined || !/^(?:0|[1-9][0-9]*)$/u.test(token)) {
    throw new RangeError(`第 ${lineNumber} 行：序号必须是十进制整数。`);
  }
  const value = Number(token);
  if (!Number.isSafeInteger(value) || value >= sequenceSpace) {
    throw new RangeError(`第 ${lineNumber} 行：序号必须位于 0 至 ${sequenceSpace - 1}。`);
  }
  return value;
}

function validateScriptBounds(script: string): void {
  if (script.length > MAX_SCRIPT_LENGTH) {
    throw new RangeError(`脚本文本最多 ${MAX_SCRIPT_LENGTH} 个字符。`);
  }
  const actionCount = script.split(/\r?\n/u).filter((line) => line.trim().length > 0).length;
  if (actionCount > MAX_ACTIONS) throw new RangeError(`动作最多 ${MAX_ACTIONS} 条。`);
}

function parseActions(script: string, sequenceSpace: number): GbnAction[] {
  validateScriptBounds(script);

  const actions: GbnAction[] = [];
  for (const [index, rawLine] of script.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    const [command, argument, extra] = line.split(/\s+/u);
    const lineNumber = index + 1;
    if (command === 'send' || command === 'timeout') {
      if (argument !== undefined) throw new RangeError(`第 ${lineNumber} 行：${command} 不接受序号。`);
      actions.push({ type: command });
      continue;
    }
    if (extra !== undefined) throw new RangeError(`第 ${lineNumber} 行：动作只能带一个序号。`);
    const sequenceNumber = parseSequenceNumber(argument, lineNumber, sequenceSpace);
    if (command === 'frame-arrive' || command === 'drop-frame') {
      actions.push({ type: command, sequenceNumber });
    } else if (command === 'ack-arrive' || command === 'drop-ack') {
      actions.push({ type: command, ackNumber: sequenceNumber });
    } else {
      throw new RangeError(`第 ${lineNumber} 行：未知动作 ${command ?? ''}。`);
    }
  }
  if (actions.length === 0) throw new RangeError('动作脚本至少需要一条有效动作。');
  return actions;
}

function sequenceList(values: readonly number[]): string {
  return values.length ? values.join(', ') : '无';
}

function eventLabel(step: GbnTraceStep): string {
  const { action, event } = step;
  switch (action.type) {
    case 'send':
      return event.outcome === 'sent'
        ? `发送 frame ${event.transmittedSequenceNumbers[0]}`
        : '发送窗口已满';
    case 'frame-arrive':
      return event.outcome === 'frame-accepted'
        ? `接收 frame ${action.sequenceNumber}`
        : `丢弃乱序 frame ${action.sequenceNumber}`;
    case 'ack-arrive':
      return event.outcome === 'ack-advanced'
        ? `累计确认 ACK ${action.ackNumber}`
        : `忽略 ACK ${action.ackNumber}`;
    case 'drop-frame':
      return `链路丢失 frame ${action.sequenceNumber}`;
    case 'drop-ack':
      return `链路丢失 ACK ${action.ackNumber}`;
    case 'timeout':
      return event.outcome === 'retransmitted' ? '发送端超时并回退重传' : '空窗口超时';
  }
}

function stateText(state: GbnState, event?: GbnEvent): string {
  const parts = [
    `base=${state.base}`,
    `next=${state.nextSeq}`,
    `expected=${state.receiverExpected}`,
    `in-flight=[${state.inFlight.join(', ')}]`,
    `timer=${state.timerOwner ?? 'off'}`,
  ];
  if (event?.generatedAckNumber !== null && event?.generatedAckNumber !== undefined) {
    parts.push(`生成 ACK ${event.generatedAckNumber}`);
  }
  if (event?.transmittedSequenceNumbers.length) {
    parts.push(`发送 [${event.transmittedSequenceNumbers.join(', ')}]`);
  }
  return parts.join(' · ');
}

function buildExplorerSteps(trace: GbnTrace): ExplorerStep[] {
  return [
    {
      id: 'gbn-initial',
      label: '初始化发送方与接收方',
      value: stateText(trace.initialState),
    },
    ...trace.steps.map((step) => ({
      id: `gbn-${String(step.index + 1).padStart(2, '0')}-${step.action.type}`,
      label: eventLabel(step),
      value: stateText(step.state, step.event),
    })),
  ];
}

function computeGbn(sequenceSpaceText: string, windowSizeText: string, script: string): GbnComputation {
  try {
    validateScriptBounds(script);
    if (new URLSearchParams(buildParams(sequenceSpaceText, windowSizeText, script)).toString().length > MAX_URL_SEARCH_LENGTH) {
      throw new RangeError(`脚本编码后的实验 URL 最多 ${MAX_URL_SEARCH_LENGTH} 个字符。`);
    }
    const config = parseConfig(sequenceSpaceText, windowSizeText);
    const trace = simulateGbn(config, parseActions(script, config.sequenceSpace));
    return {
      ok: true,
      trace,
      explorerSteps: buildExplorerSteps(trace),
      snapshots: [trace.initialState, ...trace.steps.map((step) => step.state)],
    };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : 'GBN 脚本无法执行。' };
  }
}

function buildParams(sequenceSpace: string, windowSize: string, script: string) {
  return { module: 'gbn', sequenceSpace, windowSize, script };
}

function sequenceClassName(sequenceNumber: number, state: GbnState, windowSize: number, sequenceSpace: number): string {
  const classes = ['gbn-sequence-slot'];
  const senderWindow = new Set(Array.from(
    { length: windowSize },
    (_, offset) => (state.base + offset) % sequenceSpace,
  ));
  if (senderWindow.has(sequenceNumber)) classes.push('gbn-window-slot');
  if (state.inFlight.includes(sequenceNumber)) classes.push('gbn-in-flight');
  if (state.base === sequenceNumber) classes.push('gbn-base');
  if (state.nextSeq === sequenceNumber) classes.push('gbn-next-seq');
  if (state.receiverExpected === sequenceNumber) classes.push('gbn-receiver-expected');
  if (state.timerOwner === sequenceNumber) classes.push('gbn-timer-owner');
  return classes.join(' ');
}

function GbnStateView({ state, sequenceSpace, windowSize, activeStep }: {
  state: GbnState;
  sequenceSpace: number;
  windowSize: number;
  activeStep: GbnTraceStep | undefined;
}) {
  return (
    <section className="lab-control-panel gbn-state-panel" aria-label="GBN 步骤状态">
      <div className="lab-control-heading">
        <div><span className="eyebrow">LIVE STATE</span><h2>当前协议状态</h2></div>
        <CircleDot size={19} aria-hidden="true" />
      </div>
      <div className="gbn-state-facts">
        <span><small>base</small><strong>{state.base}</strong></span>
        <span><small>nextSeq</small><strong>{state.nextSeq}</strong></span>
        <span><small>receiverExpected</small><strong>{state.receiverExpected}</strong></span>
        <span><small>timerOwner</small><strong>{state.timerOwner ?? 'OFF'}</strong></span>
      </div>
      <div className="gbn-sequence-space" aria-label="发送端序号空间">
        {Array.from({ length: sequenceSpace }, (_, sequenceNumber) => (
          <span
            key={sequenceNumber}
            data-gbn-sequence={sequenceNumber}
            className={sequenceClassName(sequenceNumber, state, windowSize, sequenceSpace)}
          >
            <strong>{sequenceNumber}</strong>
            <small>{state.inFlight.includes(sequenceNumber) ? '飞行中' : '空闲'}</small>
          </span>
        ))}
      </div>
      <div className="gbn-legend" aria-label="序号状态图例">
        <span className="gbn-base">base</span>
        <span className="gbn-next-seq">nextSeq</span>
        <span className="gbn-receiver-expected">接收方期待</span>
        <span className="gbn-timer-owner">计时器</span>
      </div>
      <div className="gbn-current-event" aria-live="polite">
        {activeStep ? (
          <>
            <strong>{eventLabel(activeStep)}</strong>
            <span>累计确认：{sequenceList(activeStep.event.acknowledgedSequenceNumbers)}</span>
            <span>本步发送：{sequenceList(activeStep.event.transmittedSequenceNumbers)}</span>
            <span>生成 ACK：{activeStep.event.generatedAckNumber ?? '无'}</span>
          </>
        ) : <strong>尚未执行动作</strong>}
      </div>
    </section>
  );
}

export function GbnLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === GBN_Q35_PRESET.sourceQuestionId;
  const [localRejectedDraft, setLocalRejectedDraft] = useState<LocalRejectedDraft | null>(null);
  const urlDraft: GbnDraft = presetSelected ? {
    sequenceSpace: String(GBN_Q35_PRESET.config.sequenceSpace),
    windowSize: String(GBN_Q35_PRESET.config.windowSize),
    script: Q35_SCRIPT,
  } : {
    sequenceSpace: searchParams.get('sequenceSpace') ?? String(GBN_Q35_PRESET.config.sequenceSpace),
    windowSize: searchParams.get('windowSize') ?? String(GBN_Q35_PRESET.config.windowSize),
    script: searchParams.get('script') ?? Q35_SCRIPT,
  };
  const draft = localRejectedDraft?.locationKey === location.key ? localRejectedDraft.draft : urlDraft;
  const sequenceSpaceText = draft.sequenceSpace;
  const windowSizeText = draft.windowSize;
  const script = draft.script;
  const [activeIndex, setActiveIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const computation = useMemo(
    () => computeGbn(sequenceSpaceText, windowSizeText, script),
    [script, sequenceSpaceText, windowSizeText],
  );
  const questionId = useMemo(
    () => questions.find((question) => question.year === 2009 && question.number === 35)?.id ?? null,
    [questions],
  );
  const safeActiveIndex = computation.ok
    ? Math.min(activeIndex, computation.snapshots.length - 1)
    : 0;
  const currentState = computation.ok ? computation.snapshots[safeActiveIndex]! : null;
  const activeStep = computation.ok && safeActiveIndex > 0
    ? computation.trace.steps[safeActiveIndex - 1]
    : undefined;
  const acknowledgedThrough3 = computation.ok
    ? computation.trace.steps.find((step) => (
        step.action.type === 'ack-arrive'
        && step.action.ackNumber === 3
        && step.event.outcome === 'ack-advanced'
      ))
    : undefined;
  const lastTimeout = computation.ok
    ? [...computation.trace.steps].reverse().find((step) => step.action.type === 'timeout')
    : undefined;

  const patchDraft = useCallback((patch: {
    sequenceSpace?: string;
    windowSize?: string;
    script?: string;
  }) => {
    const nextDraft: GbnDraft = {
      sequenceSpace: patch.sequenceSpace ?? sequenceSpaceText,
      windowSize: patch.windowSize ?? windowSizeText,
      script: patch.script ?? script,
    };
    const nextParams = buildParams(
      nextDraft.sequenceSpace,
      nextDraft.windowSize,
      nextDraft.script,
    );
    if (new URLSearchParams(nextParams).toString().length > MAX_URL_SEARCH_LENGTH) {
      setLocalRejectedDraft({ locationKey: location.key, draft: nextDraft });
    } else {
      setLocalRejectedDraft(null);
      setSearchParams(nextParams, { replace: true });
    }
    setActiveIndex(0);
  }, [location.key, script, sequenceSpaceText, setSearchParams, windowSizeText]);

  const restorePreset = () => {
    setLocalRejectedDraft(null);
    setSearchParams({ module: 'gbn', preset: GBN_Q35_PRESET.sourceQuestionId }, { replace: true });
    setActiveIndex(0);
  };

  const practiceQ35 = async () => {
    if (!questionId || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([questionId], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : '第 35 题练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page cpu-lab-page network-lab-page gbn-lab-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">NETWORK LAB / GO-BACK-N</span>
          <h1>Go-Back-N 实验室</h1>
          <p>逐事件观察发送窗口、累计确认、超时回退与模序号回绕。</p>
        </div>
        <button type="button" className="secondary-command" disabled={!questionId || starting} onClick={() => void practiceQ35()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q35'}
        </button>
      </header>

      <LabSectionNav />
      <NetworkModuleTabs active="gbn" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}
      <p className="network-review-note gbn-review-note">
        <strong>needs-review</strong> · 当前为可复算的本地协议预设，不称为官方答案。
      </p>

      <div className="lab-module-heading gbn-module-heading">
        <RadioTower size={18} aria-hidden="true" />
        <span>2009 第 35 题 · 后退 N 帧协议</span>
        <Send size={14} aria-hidden="true" />
      </div>

      <div className="lab-panel-grid gbn-lab-grid">
        <div className="gbn-workbench">
          <section className="lab-control-panel gbn-control-panel" aria-labelledby="gbn-input-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">CONFIG / SCRIPT</span><h2 id="gbn-input-heading">协议配置与动作</h2></div>
              <button type="button" className="secondary-command" onClick={restorePreset}>
                <RotateCcw size={16} aria-hidden="true" />恢复 Q35 预设
              </button>
            </div>
            <div className="lab-field-row gbn-config-fields">
              <label className="lab-input-field" htmlFor="gbn-sequence-space">
                <span>序号空间</span>
                <input id="gbn-sequence-space" aria-label="序号空间" inputMode="numeric" value={sequenceSpaceText} onChange={(event) => patchDraft({ sequenceSpace: event.target.value })} />
              </label>
              <label className="lab-input-field" htmlFor="gbn-window-size">
                <span>发送窗口大小</span>
                <input id="gbn-window-size" aria-label="发送窗口大小" inputMode="numeric" value={windowSizeText} onChange={(event) => patchDraft({ windowSize: event.target.value })} />
              </label>
            </div>
            <label className="lab-input-field full gbn-script-field" htmlFor="gbn-action-script">
              <span>动作脚本</span>
              <textarea id="gbn-action-script" aria-label="GBN 动作脚本" rows={12} spellCheck={false} value={script} onChange={(event) => patchDraft({ script: event.target.value })} />
            </label>
            {computation.ok
              ? <div className="gbn-script-status" role="status"><Inbox size={16} aria-hidden="true" />{computation.trace.steps.length} 条动作 · {computation.explorerSteps.length} 个状态</div>
              : <div className="lab-error gbn-error" role="alert">{computation.message}</div>}
          </section>

          {computation.ok && currentState && (
            <>
              <section className="lab-control-panel gbn-ack-panel" aria-labelledby="gbn-ack-heading">
                <div className="lab-control-heading">
                  <div><span className="eyebrow">CUMULATIVE ACK</span><h2 id="gbn-ack-heading">累计确认语义</h2></div>
                  <RadioTower size={19} aria-hidden="true" />
                </div>
                <p><strong>ACK n = 接收方最后按序收到的帧 n。</strong></p>
                <p>它不是“下一个期望编号”；下一个期望编号单独显示为 <code>receiverExpected</code>。</p>
              </section>

              <GbnStateView
                state={currentState}
                sequenceSpace={computation.trace.config.sequenceSpace}
                windowSize={computation.trace.config.windowSize}
                activeStep={activeStep}
              />

              <section className="lab-control-panel gbn-result-panel" aria-labelledby="gbn-result-heading">
                <div className="lab-control-heading">
                  <div><span className="eyebrow">TRACE RESULT</span><h2 id="gbn-result-heading">脚本结果</h2></div>
                  <TimerReset size={19} aria-hidden="true" />
                </div>
                <div className="gbn-result-flow">
                  <span><small>累计 ACK</small><strong>{acknowledgedThrough3 ? 'ACK 3' : '未出现 ACK 3'}</strong><code>{sequenceList(acknowledgedThrough3?.event.acknowledgedSequenceNumbers ?? [])}</code></span>
                  <span><small>最后一次超时重传</small><strong>{lastTimeout?.event.outcome === 'retransmitted' ? 'Go-Back-N' : '无重传'}</strong><code>{sequenceList(lastTimeout?.event.transmittedSequenceNumbers ?? [])}</code></span>
                </div>
              </section>
            </>
          )}
        </div>

        {computation.ok && (
          <StepExplorer
            key={`${sequenceSpaceText}:${windowSizeText}:${script}`}
            steps={computation.explorerSteps}
            onActiveIndexChange={setActiveIndex}
          />
        )}
      </div>
    </div>
  );
}
