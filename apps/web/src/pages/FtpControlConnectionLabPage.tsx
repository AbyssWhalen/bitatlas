import {
  FTP_CONTROL_CONNECTION_Q40_PRESET,
  traceFtpConnections,
  type FtpChannel,
  type FtpConnectionStep,
  type FtpConnectionTrace,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, Cable, RotateCcw, Server } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface FtpDraft {
  readonly channel: string;
}

interface SuccessfulCalculation {
  readonly ok: true;
  readonly trace: FtpConnectionTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedCalculation {
  readonly ok: false;
  readonly message: string;
}

type Calculation = SuccessfulCalculation | FailedCalculation;

const q40Draft: FtpDraft = { channel: FTP_CONTROL_CONNECTION_Q40_PRESET.config.selectedChannel };

function errorText(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/selected channel/iu.test(message)) return '请选择控制或数据连接。';
  return '当前 FTP 通道无法完成连接语义推导。';
}

function calculate(draft: FtpDraft): Calculation {
  try {
    const trace = traceFtpConnections({ selectedChannel: draft.channel as FtpChannel });
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

function buildParams(draft: FtpDraft): { module: string; channel: string } {
  return { module: 'ftp-control', channel: draft.channel };
}

function CurrentEvent({ step }: { step: FtpConnectionStep }) {
  return (
    <section className="ftp-control-current-event" aria-live="polite" aria-atomic="true" aria-label="当前 FTP 连接步骤">
      <Cable size={18} aria-hidden="true" />
      <div><span>当前推导步骤</span><strong>{step.label}</strong><small>{step.result}</small></div>
      <code>{step.operation}</code>
    </section>
  );
}

function ConnectionDiagram({ trace }: { trace: FtpConnectionTrace }) {
  const connections = [trace.controlConnection, trace.dataConnection];
  return (
    <div className="ftp-control-connections" role="img" aria-label="FTP 控制连接与数据连接对照">
      {connections.map((connection) => {
        const selected = connection.channel === trace.selectedChannel;
        return (
          <article key={connection.channel} className={selected ? 'selected' : undefined} data-channel={connection.channel}>
            <div className="ftp-control-connection-heading"><strong>{connection.channel === 'control' ? '控制连接' : '数据连接'}</strong>{selected && <span>当前事件</span>}</div>
            <div className="ftp-control-connection-line"><code>{connection.transport}/{connection.port}</code><ArrowRight size={16} aria-hidden="true" /><span>{connection.purpose}</span></div>
          </article>
        );
      })}
    </div>
  );
}

export function FtpControlConnectionLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === FTP_CONTROL_CONNECTION_Q40_PRESET.sourceQuestionId;
  const draft = useMemo<FtpDraft>(() => (presetSelected ? q40Draft : {
    channel: searchParams.get('channel') ?? q40Draft.channel,
  }), [presetSelected, searchParams]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const calculation = useMemo(() => calculate(draft), [draft]);
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === FTP_CONTROL_CONNECTION_Q40_PRESET.sourceQuestionId
    || (candidate.year === 2009 && candidate.number === 40)
  )), [questions]);
  const currentStep = calculation.ok
    ? calculation.trace.steps[Math.min(activeStepIndex, calculation.trace.steps.length - 1)]!
    : null;

  const patchDraft = useCallback((patch: Partial<FtpDraft>) => {
    const nextDraft = { ...draft, ...patch };
    setActiveStepIndex(0);
    setSearchParams(buildParams(nextDraft), { replace: true });
  }, [draft, setSearchParams]);

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({ module: 'ftp-control', preset: FTP_CONTROL_CONNECTION_Q40_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ40 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q40 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page ftp-control-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">NETWORK LAB / FTP</span><h1>FTP 控制与数据连接实验室</h1><p>把“传递命令”放回 FTP 的控制通道，再对照文件数据通道。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ40()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q40'}
        </button>
      </header>
      <LabSectionNav />
      <NetworkModuleTabs active="ftp-control" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="ftp-control-review-band">
        <span><Server size={16} aria-hidden="true" />本地练习预设 · Q40</span>
        <strong>{question?.reviewStatus ?? FTP_CONTROL_CONNECTION_Q40_PRESET.reviewStatus}</strong>
        <small>来源解析采用 2009 基础模型：控制连接 TCP/21，数据连接 TCP/20；不覆盖现代 FTP 的动态端口协商。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=computer-networks&node=topic-2009-q40')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><Server size={18} aria-hidden="true" /><span>2009 第 40 题 · FTP 命令连接</span></div>
      <div className="lab-panel-grid ftp-control-lab-grid">
        <div className="ftp-control-workbench">
          <section className="lab-control-panel ftp-control-config-panel" aria-labelledby="ftp-control-input-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">PARAMETERS / CHANNEL</span><h2 id="ftp-control-input-heading">观察事件</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q40 预设</button>
            </div>
            <label className="lab-input-field"><span>选择要观察的 FTP 事件</span><select aria-label="观察事件" value={draft.channel} onChange={(event) => patchDraft({ channel: event.target.value })}><option value="control">发送 FTP 命令</option><option value="data">传输文件数据</option></select></label>
            <p className="ftp-control-input-hint">题目询问的是命令事件；数据事件仅用于对照两条连接的职责。</p>
            {!calculation.ok ? <div className="lab-error" role="alert">{calculation.message}</div> : (
              <>
                <div className="ftp-control-equation" aria-label="FTP 连接语义公式">
                  <code>FTP 事件</code><ArrowRight size={18} aria-hidden="true" /><code>TCP 通道</code><ArrowRight size={18} aria-hidden="true" /><strong>TCP/{calculation.trace.selectedConnection.port}</strong>
                </div>
                <dl className="ftp-control-metrics">
                  <div><dt>传输层协议</dt><dd>{calculation.trace.selectedConnection.transport}</dd></div>
                  <div><dt>基础模型端口</dt><dd>TCP/{calculation.trace.selectedConnection.port}</dd></div>
                  <div aria-label="当前连接"><dt>当前连接</dt><dd>{calculation.trace.selectedChannel === 'control' ? '控制连接 · FTP 命令' : '数据连接 · 文件数据'} · TCP/{calculation.trace.selectedConnection.port}</dd></div>
                  <div aria-label="题目答案"><dt>题目答案</dt><dd>{calculation.trace.sourceAnswer}</dd></div>
                </dl>
              </>
            )}
          </section>

          {calculation.ok && currentStep && <CurrentEvent step={currentStep} />}

          {calculation.ok && (
            <section className="lab-control-panel ftp-control-result-panel" aria-labelledby="ftp-control-result-heading">
              <div className="lab-control-heading"><div><span className="eyebrow">CONTROL / DATA</span><h2 id="ftp-control-result-heading">双连接对照</h2></div><Cable size={19} aria-hidden="true" /></div>
              <ConnectionDiagram trace={calculation.trace} />
              <p className="ftp-control-boundary">本实验只展示来源解析中的基础 FTP 控制/数据连接模型；不模拟主动/被动模式协商、动态数据端口、TLS、NAT、重传或真实网络时序。</p>
            </section>
          )}
        </div>

        {calculation.ok ? <StepExplorer className="ftp-control-step-explorer" steps={calculation.explorerSteps} announceChanges={false} onActiveIndexChange={setActiveStepIndex} /> : <section className="step-explorer ftp-control-step-explorer ftp-control-empty-trace"><Server size={24} aria-hidden="true" /><strong>等待有效 FTP 通道</strong></section>}
      </div>
    </div>
  );
}
