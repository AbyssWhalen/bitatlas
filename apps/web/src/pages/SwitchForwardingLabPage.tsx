import {
  SWITCH_FORWARDING_Q36_PRESET,
  traceSwitchForwarding,
  type SwitchForwardingConfig,
  type SwitchForwardingEntry,
  type SwitchForwardingStep,
  type SwitchForwardingTrace,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, GitFork, RotateCcw, TableProperties } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabExhibit, LabExhibitNotice } from '../components/LabExhibit';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SwitchDraft {
  readonly destination: string;
  readonly table: string;
}

interface SuccessfulCalculation {
  readonly ok: true;
  readonly trace: SwitchForwardingTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedCalculation {
  readonly ok: false;
  readonly message: string;
}

type Calculation = SuccessfulCalculation | FailedCalculation;

const q36Draft: SwitchDraft = {
  destination: SWITCH_FORWARDING_Q36_PRESET.config.destinationMac,
  table: SWITCH_FORWARDING_Q36_PRESET.config.forwardingTable
    .map((entry) => `${entry.macAddress}=${entry.port}`)
    .join('\n'),
};

function parseTableText(text: string): SwitchForwardingEntry[] {
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const separator = line.indexOf('=');
      return separator < 0
        ? { macAddress: line.trim(), port: '' }
        : { macAddress: line.slice(0, separator).trim(), port: line.slice(separator + 1).trim() };
    });
}

function errorText(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/destination MAC/iu.test(message)) return '目的 MAC 必须是六组十六进制字节。';
  if (/forwarding table MAC|duplicate MAC/iu.test(message)) return '转发表中的 MAC 必须合法且不能重复。';
  if (/forwarding table port/iu.test(message)) return '端口名必须是 1 至 12 位 ASCII 字母、数字、下划线或短横线。';
  if (/forwarding table must/iu.test(message)) return '转发表最多只能有 8 行。';
  return '当前目的地址或转发表无法完成交换机转发决策。';
}

function calculate(draft: SwitchDraft): Calculation {
  try {
    const config: SwitchForwardingConfig = {
      destinationMac: draft.destination,
      forwardingTable: parseTableText(draft.table),
    };
    const trace = traceSwitchForwarding(config);
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

function buildParams(draft: SwitchDraft): { module: string; destination: string; table: string } {
  return { module: 'switch-forwarding', destination: draft.destination, table: draft.table };
}

function CurrentEvent({ step }: { step: SwitchForwardingStep }) {
  return (
    <section className="switch-forwarding-current-event lab-exhibit-status-card" aria-live="polite" aria-atomic="true" aria-label="当前交换机转发步骤">
      <GitFork size={18} aria-hidden="true" />
      <div><span>当前推导步骤</span><strong>{step.label}</strong><small>{step.result}</small></div>
      <code>{step.operation}</code>
    </section>
  );
}

function ForwardingTable({ trace }: { trace: SwitchForwardingTrace }) {
  return (
    <table className="switch-forwarding-table" aria-label="静态转发表">
      <thead><tr><th scope="col">MAC 地址</th><th scope="col">端口</th><th scope="col">本次查找</th></tr></thead>
      <tbody>
        {trace.normalizedTable.map((entry) => {
          const matched = entry.macAddress === trace.normalizedDestinationMac;
          return (
            <tr key={entry.macAddress} className={matched ? 'matched' : undefined}>
              <td><code>{entry.macAddress}</code></td>
              <td><code>{entry.port}</code></td>
              <td>{matched ? <strong>命中</strong> : <span>—</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function SwitchForwardingLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === SWITCH_FORWARDING_Q36_PRESET.sourceQuestionId;
  const draft = useMemo<SwitchDraft>(() => (presetSelected ? q36Draft : {
    destination: searchParams.get('destination') ?? q36Draft.destination,
    table: searchParams.get('table') ?? q36Draft.table,
  }), [presetSelected, searchParams]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const calculation = useMemo(() => calculate(draft), [draft]);
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === SWITCH_FORWARDING_Q36_PRESET.sourceQuestionId
    || (candidate.year === 2009 && candidate.number === 36)
  )), [questions]);
  const currentStep = calculation.ok
    ? calculation.trace.steps[Math.min(activeStepIndex, calculation.trace.steps.length - 1)]!
    : null;

  const patchDraft = useCallback((patch: Partial<SwitchDraft>) => {
    const nextDraft = { ...draft, ...patch };
    setActiveStepIndex(0);
    setSearchParams(buildParams(nextDraft), { replace: true });
  }, [draft, setSearchParams]);

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({ module: 'switch-forwarding', preset: SWITCH_FORWARDING_Q36_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ36 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q36 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <LabExhibit
      pageClassName="switch-forwarding-lab-page"
      subjectLabel="计算机网络实验 · 交换机转发"
      title="以太网交换机转发实验室"
      description="把目的物理地址从题目选项，走到一个有限转发表中的可观察匹配。"
      headerAction={(
        <button className="lab-exhibit-keycap" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ36()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q36'}
        </button>
      )}
      navigation={(
        <>
          <LabSectionNav />
          <NetworkModuleTabs active="switch-forwarding" />
        </>
      )}
      alert={startError && <div className="lab-exhibit-inline-alert" role="alert">{startError}</div>}
      notice={(
        <LabExhibitNotice
          icon={<GitFork size={16} aria-hidden="true" />}
          label="本地练习预设 · Q36"
          badge={question?.reviewStatus ?? SWITCH_FORWARDING_Q36_PRESET.reviewStatus}
          note="来源只支持“数据链路层 + 目的物理地址”；转发表和端口是通用教学示例，不是原题拓扑。"
          action={(
            <button className="lab-exhibit-keycap compact" type="button" onClick={() => navigate('/knowledge?subject=computer-networks&node=topic-2009-q36')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
          )}
        />
      )}
      subheading={(
        <>
          <GitFork size={18} aria-hidden="true" />
          <span>2009 第 36 题 · 交换机目的物理地址转发</span>
        </>
      )}
      controls={(
        <section className="lab-exhibit-control-card" aria-labelledby="switch-forwarding-input-heading">
          <div className="lab-exhibit-card-head">
            <h2 id="switch-forwarding-input-heading">查找参数</h2>
            <button className="lab-exhibit-keycap compact" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q36 预设</button>
          </div>
          <label className="lab-exhibit-field"><span>目的 MAC</span><input aria-label="目的 MAC" inputMode="text" value={draft.destination} onChange={(event) => patchDraft({ destination: event.target.value })} /></label>
          <label className="lab-exhibit-field switch-forwarding-table-input"><span>静态转发表（每行 MAC=端口）</span><textarea aria-label="静态转发表" rows={4} value={draft.table} onChange={(event) => patchDraft({ table: event.target.value })} /></label>
          <p className="switch-forwarding-input-hint">最多 8 行；端口示例可写成 <code>P1</code>、<code>uplink-1</code>。空表只报告未命中，不推断泛洪。</p>
          {!calculation.ok ? <div className="lab-exhibit-error" role="alert">{calculation.message}</div> : (
            <>
              <div className="lab-exhibit-equation" aria-label="交换机转发决策公式">
                <code>目的 MAC</code><ArrowRight size={18} aria-hidden="true" /><code>查找静态转发表</code><ArrowRight size={18} aria-hidden="true" /><strong>{calculation.trace.selectedPort ?? '未命中'}</strong>
              </div>
              <dl className="lab-exhibit-metrics cols-4">
                <div><dt>工作层次</dt><dd>数据链路层</dd></div>
                <div><dt>读取地址</dt><dd>目的物理地址</dd></div>
                <div aria-label="转发决策"><dt>转发决策</dt><dd>{calculation.trace.selectedPort ? `出口 ${calculation.trace.selectedPort}` : '本示例没有匹配项'}</dd></div>
                <div aria-label="题目答案"><dt>题目答案</dt><dd>{calculation.trace.sourceAnswer}</dd></div>
              </dl>
            </>
          )}
        </section>
      )}
      status={calculation.ok && currentStep && <CurrentEvent step={currentStep} />}
      canvas={calculation.ok && (
        <section className="switch-forwarding-result-panel lab-exhibit-stage" aria-labelledby="switch-forwarding-result-heading">
          <div className="lab-exhibit-stage-head"><div className="lab-exhibit-stage-title"><h2 id="switch-forwarding-result-heading">转发表观察</h2></div><TableProperties size={19} aria-hidden="true" /></div>
          <ForwardingTable trace={calculation.trace} />
          <p className="switch-forwarding-boundary">本实验只展示有限静态表的目的 MAC 匹配与出口报告；不模拟交换机学习、未知单播泛洪、VLAN、STP 或真实帧时序。</p>
        </section>
      )}
      steps={calculation.ok ? (
        <StepExplorer className="switch-forwarding-step-explorer" steps={calculation.explorerSteps} announceChanges={false} onActiveIndexChange={setActiveStepIndex} />
      ) : (
        <section className="lab-exhibit-steps-empty"><GitFork size={24} aria-hidden="true" /><strong>等待有效地址与转发表</strong></section>
      )}
    />
  );
}
