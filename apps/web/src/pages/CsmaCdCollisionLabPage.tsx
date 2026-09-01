import {
  CSMA_CD_Q37_PRESET,
  traceCsmaCdDistanceReduction,
  type CsmaCdConfig,
  type CsmaCdStep,
  type CsmaCdTrace,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, Cable, RotateCcw, Timer } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface CsmaDraft {
  readonly rate: string;
  readonly speed: string;
  readonly reduction: string;
}

interface SuccessfulCalculation {
  readonly ok: true;
  readonly trace: CsmaCdTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedCalculation {
  readonly ok: false;
  readonly message: string;
}

type Calculation = SuccessfulCalculation | FailedCalculation;

const q37Draft: CsmaDraft = {
  rate: String(CSMA_CD_Q37_PRESET.config.dataRateBitsPerSecond),
  speed: String(CSMA_CD_Q37_PRESET.config.propagationSpeedMetersPerSecond),
  reduction: String(CSMA_CD_Q37_PRESET.config.frameReductionBits),
};

function errorText(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/data rate/iu.test(message)) return '传输速率必须是正的有限数值。';
  if (/propagation speed/iu.test(message)) return '信号传播速度必须是正的有限数值。';
  if (/frame reduction/iu.test(message)) return '减少的最小帧长必须是正整数。';
  return '当前参数无法完成 CSMA/CD 距离推导。';
}

function calculate(draft: CsmaDraft): Calculation {
  try {
    const config: CsmaCdConfig = {
      dataRateBitsPerSecond: Number(draft.rate),
      propagationSpeedMetersPerSecond: Number(draft.speed),
      frameReductionBits: Number(draft.reduction),
    };
    const trace = traceCsmaCdDistanceReduction(config);
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

function formatSeconds(seconds: number): string {
  return `${(seconds * 1_000_000).toLocaleString('zh-CN', { maximumFractionDigits: 6 })} μs`;
}

function formatSpeed(speedMetersPerSecond: number): string {
  return `${(speedMetersPerSecond / 1_000).toLocaleString('zh-CN', { maximumFractionDigits: 6 })} km/s`;
}

function buildParams(draft: CsmaDraft): { module: string; rate: string; speed: string; reduction: string } {
  return { module: 'csma-cd', rate: draft.rate, speed: draft.speed, reduction: draft.reduction };
}

function CurrentFormula({ trace, step }: { trace: CsmaCdTrace; step: CsmaCdStep }) {
  return (
    <section className="csma-cd-current-event" aria-live="polite" aria-atomic="true" aria-label="当前 CSMA/CD 推导步骤">
      <Timer size={18} aria-hidden="true" />
      <div><span>当前推导步骤</span><strong>{step.label}</strong><small>{step.result}</small></div>
      <code>{step.id === 'complete' ? `${trace.distanceReductionMeters} m` : step.operation}</code>
    </section>
  );
}

export function CsmaCdCollisionLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === CSMA_CD_Q37_PRESET.sourceQuestionId;
  const draft = useMemo<CsmaDraft>(() => (presetSelected ? q37Draft : {
    rate: searchParams.get('rate') ?? q37Draft.rate,
    speed: searchParams.get('speed') ?? q37Draft.speed,
    reduction: searchParams.get('reduction') ?? q37Draft.reduction,
  }), [presetSelected, searchParams]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const calculation = useMemo(() => calculate(draft), [draft]);
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === CSMA_CD_Q37_PRESET.sourceQuestionId
    || (candidate.year === 2009 && candidate.number === 37)
  )), [questions]);
  const currentStep = calculation.ok
    ? calculation.trace.steps[Math.min(activeStepIndex, calculation.trace.steps.length - 1)]!
    : null;

  const patchDraft = useCallback((patch: Partial<CsmaDraft>) => {
    const nextDraft = { ...draft, ...patch };
    setActiveStepIndex(0);
    setSearchParams(buildParams(nextDraft), { replace: true });
  }, [draft, setSearchParams]);

  const restorePreset = () => {
    setActiveStepIndex(0);
    setSearchParams({ module: 'csma-cd', preset: CSMA_CD_Q37_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ37 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q37 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page csma-cd-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">NETWORK LAB / CSMA/CD</span><h1>CSMA/CD 碰撞域实验室</h1><p>把最小帧发送时间与往返传播时延放在同一条推导链上。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ37()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q37'}
        </button>
      </header>
      <LabSectionNav />
      <NetworkModuleTabs active="csma-cd" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="csma-cd-review-band">
        <span><Cable size={16} aria-hidden="true" />本地练习预设 · Q37</span>
        <strong>{question?.reviewStatus ?? CSMA_CD_Q37_PRESET.reviewStatus}</strong>
        <small>原题参数与正式解析仍待人工复核；页面只重放确定的时间差与距离差。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=computer-networks&node=topic-2009-q37')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><Cable size={18} aria-hidden="true" /><span>2009 第 37 题 · CSMA/CD 最小帧与距离</span><Timer size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid csma-cd-lab-grid">
        <div className="csma-cd-workbench">
          <section className="lab-control-panel csma-cd-control-panel" aria-labelledby="csma-cd-input-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">PARAMETERS / TIME DELTA</span><h2 id="csma-cd-input-heading">题设参数</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q37 预设</button>
            </div>
            <div className="csma-cd-input-grid">
              <label className="lab-input-field"><span>传输速率（bit/s）</span><input aria-label="传输速率" inputMode="numeric" value={draft.rate} onChange={(event) => patchDraft({ rate: event.target.value })} /></label>
              <label className="lab-input-field"><span>传播速度（m/s）</span><input aria-label="传播速度" inputMode="numeric" value={draft.speed} onChange={(event) => patchDraft({ speed: event.target.value })} /></label>
              <label className="lab-input-field"><span>减少的最小帧长（bit）</span><input aria-label="减少的最小帧长" inputMode="numeric" value={draft.reduction} onChange={(event) => patchDraft({ reduction: event.target.value })} /></label>
            </div>
            {!calculation.ok ? <div className="lab-error" role="alert">{calculation.message}</div> : (
              <>
                <div className="csma-cd-equation" aria-label="CSMA/CD 距离变化公式">
                  <code>Δt = ΔL / R</code><ArrowRight size={18} aria-hidden="true" /><code>2 × Δd / v = Δt</code><ArrowRight size={18} aria-hidden="true" /><strong>{calculation.trace.distanceReductionMeters} m</strong>
                </div>
                <dl className="csma-cd-metrics">
                  <div><dt>帧发送时间差</dt><dd>{formatSeconds(calculation.trace.frameReductionTimeSeconds)}</dd></div>
                  <div><dt>往返传播时延差</dt><dd>{formatSeconds(calculation.trace.roundTripPropagationTimeSeconds)}</dd></div>
                  <div><dt>传播速度</dt><dd>{formatSpeed(calculation.trace.config.propagationSpeedMetersPerSecond)}</dd></div>
                  <div><dt>距离至少减少</dt><dd>{calculation.trace.distanceReductionMeters} m</dd></div>
                </dl>
              </>
            )}
          </section>

          {calculation.ok && currentStep && <CurrentFormula trace={calculation.trace} step={currentStep} />}

          {calculation.ok && (
            <section className="lab-control-panel csma-cd-result-panel" aria-labelledby="csma-cd-result-heading">
              <div className="lab-control-heading"><div><span className="eyebrow">COLLISION DOMAIN</span><h2 id="csma-cd-result-heading">距离变化状态</h2></div><Cable size={19} aria-hidden="true" /></div>
              <div className="csma-cd-timeline" role="img" aria-label={`减少 ${calculation.trace.distanceReductionMeters} 米才能保持 CSMA/CD 碰撞检测的往返时延约束`}>
                <div className="csma-cd-timeline-line"><span /><i /></div>
                <div><strong>帧缩短</strong><small>{formatSeconds(calculation.trace.frameReductionTimeSeconds)}</small></div>
                <ArrowRight size={18} aria-hidden="true" />
                <div><strong>往返时延同步缩短</strong><small>{formatSeconds(calculation.trace.roundTripPropagationTimeSeconds)}</small></div>
                <ArrowRight size={18} aria-hidden="true" />
                <div><strong>最远站点距离减少</strong><small>{calculation.trace.distanceReductionMeters} m</small></div>
              </div>
              <p className="csma-cd-boundary">本实验只使用题设给出的速率、传播速度和帧长变化，不推断原始帧长、网络拓扑或退避重传行为。</p>
            </section>
          )}
        </div>

        {calculation.ok ? <StepExplorer className="csma-cd-step-explorer" steps={calculation.explorerSteps} announceChanges={false} onActiveIndexChange={setActiveStepIndex} /> : <section className="step-explorer csma-cd-step-explorer csma-cd-empty-trace"><Cable size={24} aria-hidden="true" /><strong>等待有效参数</strong></section>}
      </div>
    </div>
  );
}
