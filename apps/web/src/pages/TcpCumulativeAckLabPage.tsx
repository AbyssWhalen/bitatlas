import {
  TCP_CUMULATIVE_ACK_Q38_PRESET,
  traceTcpCumulativeAck,
  type TcpCumulativeAckConfig,
  type TcpCumulativeAckStep,
  type TcpCumulativeAckTrace,
} from '@408os/lab-core';
import { Activity, ArrowRight, BookOpenCheck, Network, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface TcpAckDraft {
  readonly firstSequence: string;
  readonly firstLength: string;
  readonly secondLength: string;
}

interface SuccessfulCalculation {
  readonly ok: true;
  readonly trace: TcpCumulativeAckTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedCalculation {
  readonly ok: false;
  readonly message: string;
}

type Calculation = SuccessfulCalculation | FailedCalculation;

const q38Draft: TcpAckDraft = {
  firstSequence: String(TCP_CUMULATIVE_ACK_Q38_PRESET.config.firstSequenceNumber),
  firstLength: String(TCP_CUMULATIVE_ACK_Q38_PRESET.config.payloadLengths[0]),
  secondLength: String(TCP_CUMULATIVE_ACK_Q38_PRESET.config.payloadLengths[1]),
};

function parseInteger(value: string, label: string, allowZero: boolean): number {
  const pattern = allowZero ? /^(?:0|[1-9][0-9]*)$/u : /^[1-9][0-9]*$/u;
  if (!pattern.test(value.trim())) throw new Error(`${label}必须是${allowZero ? '非负' : '正'}整数。`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label}超出安全整数范围。`);
  return parsed;
}

function errorText(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/first sequence|首段序列号|sequence range/iu.test(message)) return '首段序列号必须是非负安全整数，且不跨越 32 位序列空间。';
  if (/payload|第一个 payload|第二个 payload/iu.test(message)) return '两个 payload 都必须是正整数，并且保持在本实验的可视化范围内。';
  if (/exactly two|two payload/iu.test(message)) return '本实验固定重放两个 TCP payload。';
  return '当前参数无法完成 TCP 累计确认推导。';
}

function calculate(draft: TcpAckDraft): Calculation {
  try {
    const config: TcpCumulativeAckConfig = {
      firstSequenceNumber: parseInteger(draft.firstSequence, '首段序列号', true),
      payloadLengths: [
        parseInteger(draft.firstLength, '第一个 payload', false),
        parseInteger(draft.secondLength, '第二个 payload', false),
      ],
    };
    const trace = traceTcpCumulativeAck(config);
    return {
      ok: true,
      trace,
      explorerSteps: trace.steps.map((step) => ({
        id: step.id,
        label: step.label,
        value: `${step.result} · ${step.operation}`,
      })),
    };
  } catch (reason) {
    return { ok: false, message: errorText(reason) };
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0, useGrouping: false });
}

function buildParams(draft: TcpAckDraft): { module: string; firstSequence: string; firstLength: string; secondLength: string } {
  return {
    module: 'tcp-ack',
    firstSequence: draft.firstSequence,
    firstLength: draft.firstLength,
    secondLength: draft.secondLength,
  };
}

function CurrentAckStep({ step }: { step: TcpCumulativeAckStep }) {
  return (
    <section className="tcp-ack-current-event" aria-live="polite" aria-atomic="true" aria-label="当前 TCP 累计确认步骤">
      <Activity size={18} aria-hidden="true" />
      <div><span>当前推导步骤</span><strong>{step.label}</strong><small>{step.result}</small></div>
      <code>{step.operation}</code>
      <output>{step.ackNumber === undefined ? '' : `ACK ${formatNumber(step.ackNumber)}`}</output>
    </section>
  );
}

function SegmentTimeline({ trace, activeStepIndex }: { trace: TcpCumulativeAckTrace; activeStepIndex: number }) {
  return (
    <div className="tcp-ack-segment-visual" role="img" aria-label="TCP 字节区间">
      <div className="tcp-ack-segment-axis" aria-hidden="true"><span>低序号</span><span>连续字节流</span><span>高序号</span></div>
      <div className="tcp-ack-segment-bars">
        {trace.segments.map((segment) => {
          const visible = activeStepIndex >= segment.ordinal;
          return (
            <article className={`tcp-ack-segment-row${visible ? ' revealed' : ''}`} key={segment.ordinal}>
              <div className="tcp-ack-segment-label"><strong>段 {segment.ordinal}</strong><small>SEQ {formatNumber(segment.sequenceStart)}</small></div>
              <div className="tcp-ack-segment-bar" style={{ flexGrow: segment.payloadLength }}>
                <code>[{formatNumber(segment.sequenceStart)}, {formatNumber(segment.sequenceEndExclusive)})</code>
                <small>{formatNumber(segment.payloadLength)} B payload</small>
              </div>
            </article>
          );
        })}
      </div>
      <div className="tcp-ack-segment-end"><span>ACK</span><strong>{formatNumber(trace.nextExpectedSequenceNumber)}</strong><small>下一个期望字节序号</small></div>
    </div>
  );
}

function TcpAckMetrics({ trace }: { trace: TcpCumulativeAckTrace }) {
  const [first, second] = trace.segments;
  return (
    <dl className="tcp-ack-metrics" aria-label="TCP 累计确认结果">
      <div><dt>第一个范围</dt><dd>[{formatNumber(first.sequenceStart)}, {formatNumber(first.sequenceEndExclusive)})</dd></div>
      <div><dt>第二个范围</dt><dd>[{formatNumber(second.sequenceStart)}, {formatNumber(second.sequenceEndExclusive)})</dd></div>
      <div><dt>连续 payload</dt><dd>{formatNumber(trace.totalPayloadBytes)} B</dd></div>
      <div><dt>累计 ACK</dt><dd>{formatNumber(trace.nextExpectedSequenceNumber)}</dd></div>
    </dl>
  );
}

export function TcpCumulativeAckLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === TCP_CUMULATIVE_ACK_Q38_PRESET.sourceQuestionId;
  const draft = useMemo<TcpAckDraft>(() => (presetSelected ? q38Draft : {
    firstSequence: searchParams.get('firstSequence') ?? q38Draft.firstSequence,
    firstLength: searchParams.get('firstLength') ?? q38Draft.firstLength,
    secondLength: searchParams.get('secondLength') ?? q38Draft.secondLength,
  }), [presetSelected, searchParams]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const calculation = useMemo(() => calculate(draft), [draft]);
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === TCP_CUMULATIVE_ACK_Q38_PRESET.sourceQuestionId
    || (candidate.year === 2009 && candidate.number === 38)
  )), [questions]);
  const currentStep = calculation.ok
    ? calculation.trace.steps[Math.min(activeStepIndex, calculation.trace.steps.length - 1)]!
    : null;

  const patchDraft = useCallback((patch: Partial<TcpAckDraft>) => {
    const nextDraft = { ...draft, ...patch };
    setActiveStepIndex(0);
    setSearchParams(buildParams(nextDraft), { replace: true });
  }, [draft, setSearchParams]);

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({ module: 'tcp-ack', preset: TCP_CUMULATIVE_ACK_Q38_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ38 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q38 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page tcp-ack-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">NETWORK LAB / TCP ACK</span><h1>TCP 累计确认实验室</h1><p>把两个连续 TCP payload 展开成字节区间，再读出接收方下一个期望的序列号。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ38()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q38'}
        </button>
      </header>
      <LabSectionNav />
      <NetworkModuleTabs active="tcp-ack" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="tcp-ack-review-band">
        <span><Network size={16} aria-hidden="true" />本地练习预设 · Q38</span>
        <strong>{question?.reviewStatus ?? TCP_CUMULATIVE_ACK_Q38_PRESET.reviewStatus}</strong>
        <small>本页只重放两个按序、连续、无丢失的 TCP 字节段；题包解析中的“选择确认”措辞保留待人工复核，不在此处改写题包。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=computer-networks&node=topic-2009-q38')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><Network size={18} aria-hidden="true" /><span>2009 第 38 题 · 两段 TCP 字节流与累计 ACK</span><Activity size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid tcp-ack-lab-grid">
        <div className="tcp-ack-workbench">
          <section className="lab-control-panel tcp-ack-control-panel" aria-labelledby="tcp-ack-input-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">PARAMETERS / BYTE STREAM</span><h2 id="tcp-ack-input-heading">题设参数</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q38 预设</button>
            </div>
            <div className="tcp-ack-input-grid">
              <label className="lab-input-field"><span>首段序列号</span><input aria-label="首段序列号" inputMode="numeric" value={draft.firstSequence} onChange={(event) => patchDraft({ firstSequence: event.target.value })} /></label>
              <label className="lab-input-field"><span>第一个 payload（字节）</span><input aria-label="第一个 payload" inputMode="numeric" value={draft.firstLength} onChange={(event) => patchDraft({ firstLength: event.target.value })} /></label>
              <label className="lab-input-field"><span>第二个 payload（字节）</span><input aria-label="第二个 payload" inputMode="numeric" value={draft.secondLength} onChange={(event) => patchDraft({ secondLength: event.target.value })} /></label>
            </div>
            {!calculation.ok ? <div className="lab-error" role="alert">{calculation.message}</div> : (
              <>
                <div className="tcp-ack-equation" aria-label="TCP 累计确认公式">
                  <code>ACK = SEQ₁ + payload₁ + payload₂</code><ArrowRight size={18} aria-hidden="true" /><code>{formatNumber(calculation.trace.config.firstSequenceNumber)} + {formatNumber(calculation.trace.config.payloadLengths[0])} + {formatNumber(calculation.trace.config.payloadLengths[1])}</code><ArrowRight size={18} aria-hidden="true" /><strong>ACK {formatNumber(calculation.trace.nextExpectedSequenceNumber)}</strong>
                </div>
                <TcpAckMetrics trace={calculation.trace} />
              </>
            )}
          </section>

          {calculation.ok && currentStep && <CurrentAckStep step={currentStep} />}

          {calculation.ok && (
            <section className="lab-control-panel tcp-ack-result-panel" aria-labelledby="tcp-ack-result-heading">
              <div className="lab-control-heading"><div><span className="eyebrow">BYTE RANGES / ACK</span><h2 id="tcp-ack-result-heading">接收状态</h2></div><Network size={19} aria-hidden="true" /></div>
              <SegmentTimeline trace={calculation.trace} activeStepIndex={activeStepIndex} />
              <div className="tcp-ack-semantics" aria-label="ACK 语义">
                <div><span>ACK 含义</span><strong>下一个期望字节序号</strong></div>
                <div><span>SACK 块</span><strong>本实验不建模</strong></div>
              </div>
              <p className="tcp-ack-boundary">累计 ACK 只在两个范围连续且按序到达时前进；本实验不模拟丢包、重传、接收窗口、选择确认块或序列号回绕。</p>
            </section>
          )}
        </div>

        {calculation.ok ? <StepExplorer key={`${draft.firstSequence}:${draft.firstLength}:${draft.secondLength}`} className="tcp-ack-step-explorer" steps={calculation.explorerSteps} announceChanges={false} onActiveIndexChange={setActiveStepIndex} /> : <section className="step-explorer tcp-ack-step-explorer tcp-ack-empty-trace"><Network size={24} aria-hidden="true" /><strong>等待有效参数</strong></section>}
      </div>
    </div>
  );
}
