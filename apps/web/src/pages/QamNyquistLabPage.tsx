import {
  QAM_NYQUIST_Q34_PRESET,
  traceQamNyquist,
  type QamNyquistConfig,
  type QamNyquistStep,
  type QamNyquistTrace,
} from '@408os/lab-core';
import { Activity, ArrowRight, BookOpenCheck, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabExhibit, LabExhibitNotice } from '../components/LabExhibit';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface QamDraft {
  readonly bandwidth: string;
  readonly phases: string;
  readonly amplitudes: string;
}

interface SuccessfulCalculation {
  readonly ok: true;
  readonly trace: QamNyquistTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedCalculation {
  readonly ok: false;
  readonly message: string;
}

type Calculation = SuccessfulCalculation | FailedCalculation;

const q34Draft: QamDraft = {
  bandwidth: String(QAM_NYQUIST_Q34_PRESET.config.bandwidthHz),
  phases: String(QAM_NYQUIST_Q34_PRESET.config.phaseCount),
  amplitudes: String(QAM_NYQUIST_Q34_PRESET.config.amplitudeCount),
};

function errorText(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/bandwidth/iu.test(message)) return '链路带宽必须是正的有限数值。';
  if (/phase/iu.test(message)) return '相位数量必须是大于等于 2 的整数。';
  if (/amplitude/iu.test(message)) return '振幅数量必须是大于等于 2 的整数。';
  return '当前参数无法完成 QAM 奈氏速率推导。';
}

function calculate(draft: QamDraft): Calculation {
  try {
    const config: QamNyquistConfig = {
      bandwidthHz: Number(draft.bandwidth),
      phaseCount: Number(draft.phases),
      amplitudeCount: Number(draft.amplitudes),
    };
    const trace = traceQamNyquist(config);
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
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 6, useGrouping: false });
}

function formatRate(bitsPerSecond: number): string {
  if (Math.abs(bitsPerSecond) >= 1_000) return `${formatNumber(bitsPerSecond / 1_000)} kbps`;
  return `${formatNumber(bitsPerSecond)} bit/s`;
}

function buildParams(draft: QamDraft): { module: string; bandwidth: string; phases: string; amplitudes: string } {
  return {
    module: 'qam-nyquist',
    bandwidth: draft.bandwidth,
    phases: draft.phases,
    amplitudes: draft.amplitudes,
  };
}

function CurrentFormula({ trace, step }: { trace: QamNyquistTrace; step: QamNyquistStep }) {
  return (
    <section className="qam-nyquist-current-event lab-exhibit-status-card" aria-live="polite" aria-atomic="true" aria-label="当前 QAM 推导步骤">
      <Activity size={18} aria-hidden="true" />
      <div><span>当前推导步骤</span><strong>{step.label}</strong><small>{step.result}</small></div>
      <code>{step.operation}</code>
      <output className="qam-nyquist-current-rate">{step.id === 'complete' ? formatRate(trace.maxDataRateBitsPerSecond) : ''}</output>
    </section>
  );
}

export function QamNyquistLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === QAM_NYQUIST_Q34_PRESET.sourceQuestionId;
  const draft = useMemo<QamDraft>(() => (presetSelected ? q34Draft : {
    bandwidth: searchParams.get('bandwidth') ?? q34Draft.bandwidth,
    phases: searchParams.get('phases') ?? q34Draft.phases,
    amplitudes: searchParams.get('amplitudes') ?? q34Draft.amplitudes,
  }), [presetSelected, searchParams]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const calculation = useMemo(() => calculate(draft), [draft]);
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === QAM_NYQUIST_Q34_PRESET.sourceQuestionId
    || (candidate.year === 2009 && candidate.number === 34)
  )), [questions]);
  const currentStep = calculation.ok
    ? calculation.trace.steps[Math.min(activeStepIndex, calculation.trace.steps.length - 1)]!
    : null;

  const patchDraft = useCallback((patch: Partial<QamDraft>) => {
    const nextDraft = { ...draft, ...patch };
    setActiveStepIndex(0);
    setSearchParams(buildParams(nextDraft), { replace: true });
  }, [draft, setSearchParams]);

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({ module: 'qam-nyquist', preset: QAM_NYQUIST_Q34_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ34 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q34 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <LabExhibit
      pageClassName="qam-nyquist-lab-page"
      subjectLabel="计算机网络实验 · 物理层"
      title="QAM / 奈氏准则实验室"
      description="把调制状态数、每符号比特数和无噪声链路的奈氏上限放在同一条推导链上。"
      headerAction={(
        <button className="lab-exhibit-keycap" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ34()}>
          <BookOpenCheck size={17} aria-hidden="true" />
          {starting ? '创建中' : '练习 2009 · Q34'}
        </button>
      )}
      navigation={(
        <>
          <LabSectionNav />
          <NetworkModuleTabs active="qam-nyquist" />
        </>
      )}
      alert={startError ? <div className="lab-exhibit-inline-alert" role="alert">{startError}</div> : null}
      notice={(
        <LabExhibitNotice
          icon={<Activity size={16} aria-hidden="true" />}
          label="本地练习预设 · Q34"
          badge={question?.reviewStatus ?? QAM_NYQUIST_Q34_PRESET.reviewStatus}
          note="原题参数与正式解析仍待人工复核；页面只重放无噪声条件下的奈氏准则，不代入噪声或香农参数。"
          action={(
            <button
              className="lab-exhibit-keycap compact"
              type="button"
              onClick={() => navigate('/knowledge?subject=computer-networks&node=topic-2009-q34')}
            >
              查看知识节点
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        />
      )}
      subheading={(
        <>
          <Activity size={18} aria-hidden="true" />
          <span>2009 第 34 题 · QAM 最大数据传输速率</span>
        </>
      )}
      controls={(
        <section className="lab-exhibit-control-card" aria-labelledby="qam-nyquist-input-heading">
          <div className="lab-exhibit-card-head">
            <h2 id="qam-nyquist-input-heading">题设参数</h2>
            <button className="lab-exhibit-keycap compact" type="button" onClick={restorePreset}>
              <RotateCcw size={15} aria-hidden="true" />
              恢复 Q34 预设
            </button>
          </div>
          <div className="lab-exhibit-input-grid cols-3">
            <label className="lab-exhibit-field">
              <span>链路带宽（Hz）</span>
              <input aria-label="链路带宽" inputMode="numeric" value={draft.bandwidth} onChange={(event) => patchDraft({ bandwidth: event.target.value })} />
            </label>
            <label className="lab-exhibit-field">
              <span>相位数量</span>
              <input aria-label="相位数量" type="number" min="2" step="1" value={draft.phases} onChange={(event) => patchDraft({ phases: event.target.value })} />
            </label>
            <label className="lab-exhibit-field">
              <span>振幅数量</span>
              <input aria-label="振幅数量" type="number" min="2" step="1" value={draft.amplitudes} onChange={(event) => patchDraft({ amplitudes: event.target.value })} />
            </label>
          </div>
          {!calculation.ok ? (
            <div className="lab-exhibit-error" role="alert">{calculation.message}</div>
          ) : (
            <>
              <div className="lab-exhibit-equation" aria-label="QAM 最大速率公式">
                <code>R = 2 × B × log₂(M)</code>
                <ArrowRight size={18} aria-hidden="true" />
                <code>2 × {formatNumber(calculation.trace.config.bandwidthHz)} × log₂({calculation.trace.symbolStates})</code>
                <ArrowRight size={18} aria-hidden="true" />
                <strong>{formatRate(calculation.trace.maxDataRateBitsPerSecond)}</strong>
              </div>
              <dl className="lab-exhibit-metrics cols-4">
                <div><dt>带宽 B</dt><dd>{formatNumber(calculation.trace.config.bandwidthHz)} Hz</dd></div>
                <div><dt>符号状态 M</dt><dd>{formatNumber(calculation.trace.symbolStates)}</dd></div>
                <div><dt>每符号比特</dt><dd>{formatNumber(calculation.trace.bitsPerSymbol)} bit</dd></div>
                <div><dt>奈氏上限</dt><dd>{formatRate(calculation.trace.maxDataRateBitsPerSecond)}</dd></div>
              </dl>
            </>
          )}
        </section>
      )}
      status={calculation.ok && currentStep ? <CurrentFormula trace={calculation.trace} step={currentStep} /> : null}
      canvas={calculation.ok ? (
        <section className="qam-nyquist-result-panel lab-exhibit-stage" aria-labelledby="qam-nyquist-result-heading">
          <div className="lab-exhibit-stage-head">
            <div className="lab-exhibit-stage-title">
              <h2 id="qam-nyquist-result-heading">速率推导状态</h2>
              <span className="lab-exhibit-stage-tag">实验画布</span>
            </div>
            <Activity size={18} aria-hidden="true" />
          </div>
          <div className="qam-nyquist-timeline" role="img" aria-label={`无噪声奈氏上限为 ${formatRate(calculation.trace.maxDataRateBitsPerSecond)}`}>
            <div><strong>相位 × 振幅</strong><small>{calculation.trace.symbolStates} 个状态</small></div>
            <ArrowRight size={18} aria-hidden="true" />
            <div><strong>每符号编码</strong><small>{formatNumber(calculation.trace.bitsPerSymbol)} bit</small></div>
            <ArrowRight size={18} aria-hidden="true" />
            <div><strong>最大数据速率</strong><small>{formatRate(calculation.trace.maxDataRateBitsPerSecond)}</small></div>
          </div>
          <p className="qam-nyquist-boundary">本实验只使用题设给出的带宽、相位数和振幅数；无噪声条件下采用奈氏准则，不估计信噪比、香农容量或实际调制误差。</p>
        </section>
      ) : null}
      steps={calculation.ok ? (
        <StepExplorer
          className="qam-nyquist-step-explorer"
          steps={calculation.explorerSteps}
          announceChanges={false}
          onActiveIndexChange={setActiveStepIndex}
        />
      ) : (
        <section className="lab-exhibit-steps-empty">
          <Activity size={24} aria-hidden="true" />
          <strong>等待有效参数</strong>
        </section>
      )}
    />
  );
}
