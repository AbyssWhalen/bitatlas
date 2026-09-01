import {
  HRRN_MAX_PROCESSES,
  HRRN_MAX_TIME,
  HRRN_Q24_PRESET,
  traceHrrnScheduling,
  type HrrnCandidate,
  type HrrnSchedulingConfig,
  type HrrnStep,
  type HrrnSchedulingTrace,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, Clock3, ListOrdered, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { OsModuleTabs } from '../components/OsModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface SuccessfulComputation {
  readonly ok: true;
  readonly trace: HrrnSchedulingTrace;
  readonly explorerSteps: readonly ExplorerStep[];
}

interface FailedComputation {
  readonly ok: false;
  readonly message: string;
}

type Computation = SuccessfulComputation | FailedComputation;

const q24ExampleText = HRRN_Q24_PRESET.config.processes
  .map((process) => `${process.id},${process.arrivalTime},${process.serviceTime}`)
  .join(';');

const stepLabels: Record<HrrnStep['kind'], string> = {
  initial: '读取教学示例',
  idle: 'CPU 空闲等待到达',
  evaluate: '计算就绪队列响应比',
  dispatch: '选择最高响应比进程',
  complete: '运行完成并释放 CPU',
};

function parseInteger(value: string, label: string): number {
  const normalized = value.trim();
  if (!/^[0-9]+$/u.test(normalized)) throw new Error(`${label}必须是非负整数。`);
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label}超出安全整数范围。`);
  return parsed;
}

function parseJobs(value: string): HrrnSchedulingConfig {
  const rows = value.split(/[;\n]+/u).map((row) => row.trim()).filter(Boolean);
  if (rows.length === 0) throw new Error('至少输入一个进程。');
  if (rows.length > HRRN_MAX_PROCESSES) throw new Error(`进程数量不能超过 ${HRRN_MAX_PROCESSES} 个。`);
  const processes = rows.map((row, index) => {
    const fields = row.split(/[,，]/u).map((field) => field.trim());
    if (fields.length !== 3 || !fields[0]) throw new Error(`第 ${index + 1} 行应为 ID,到达时刻,执行时间。`);
    const arrivalTime = parseInteger(fields[1] ?? '', `第 ${index + 1} 行到达时刻`);
    const serviceTime = parseInteger(fields[2] ?? '', `第 ${index + 1} 行执行时间`);
    return { id: fields[0], arrivalTime, serviceTime };
  });
  return { processes };
}

function errorText(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/serviceTime|执行时间/iu.test(message)) return '执行时间必须是 1 到 100000 的整数。';
  if (/arrivalTime|到达时刻/iu.test(message)) return '到达时刻必须是 0 到 100000 的整数。';
  if (/duplicate/iu.test(message)) return '进程 ID 不能重复。';
  if (/processes.*(at most|最多|contain)/iu.test(message)) return `进程数量不能超过 ${HRRN_MAX_PROCESSES} 个。`;
  if (/total schedule time/iu.test(message)) return `总调度时长不能超过 ${HRRN_MAX_TIME * 10} 个时间单位。`;
  return message || '当前进程表无法完成 HRRN 调度。';
}

function compute(jobsText: string): Computation {
  try {
    const trace = traceHrrnScheduling(parseJobs(jobsText));
    return {
      ok: true,
      trace,
      explorerSteps: trace.steps.map((step) => ({
        id: step.id,
        label: stepLabels[step.kind],
        value: stepValue(step),
      })),
    };
  } catch (reason) {
    return { ok: false, message: errorText(reason) };
  }
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    useGrouping: false,
  });
}

function formatRatio(value: number): string {
  return `R=${formatNumber(value)}`;
}

function candidateSummary(candidates: readonly HrrnCandidate[]): string {
  if (candidates.length === 0) return '当前没有就绪进程。';
  return candidates.map((candidate) => `${candidate.processId} ${formatRatio(candidate.responseRatio)}`).join(' · ');
}

function stepValue(step: HrrnStep): string {
  if (step.kind === 'idle') return `${step.fromTime} → ${step.toTime}，CPU 暂无就绪进程。`;
  if (step.kind === 'dispatch') return `t=${step.time} 选择 ${step.processId ?? '—'}；${candidateSummary(step.candidates)}`;
  if (step.kind === 'complete') return `t=${step.time} 完成 ${step.processId ?? '—'}；已完成 ${step.completedProcessIds.join('、') || '无'}。`;
  return `t=${step.time}；${candidateSummary(step.candidates)}`;
}

function CurrentEvent({ step }: { step: HrrnStep }) {
  const detail = step.kind === 'idle'
    ? `CPU 空闲 ${Math.max(0, (step.toTime ?? step.time) - step.time)} 个时间单位`
    : step.kind === 'dispatch'
      ? `t=${step.time} · 运行 ${step.processId ?? '—'}`
      : step.kind === 'complete'
        ? `t=${step.time} · 已完成 ${step.processId ?? '—'}`
        : `t=${step.time}`;
  return (
    <section className="hrrn-current-event" aria-live="polite" aria-atomic="true" aria-label="当前 HRRN 调度事件">
      <Clock3 size={18} aria-hidden="true" />
      <div><span>当前重放事件</span><strong>{stepLabels[step.kind]}</strong><small>{detail}</small></div>
      <code>{candidateSummary(step.candidates)}</code>
    </section>
  );
}

function CandidateTable({ candidates }: { candidates: readonly HrrnCandidate[] }) {
  return (
    <section className="lab-control-panel hrrn-candidate-panel" aria-labelledby="hrrn-candidate-heading">
      <div className="lab-control-heading"><div><span className="eyebrow">READY QUEUE / RATIO</span><h2 id="hrrn-candidate-heading">当前就绪队列</h2></div><ListOrdered size={19} aria-hidden="true" /></div>
      {candidates.length === 0 ? <p className="hrrn-empty-note">没有可调度进程；下一步先等待最早到达的进程。</p> : (
        <div className="table-responsive">
          <table className="table hrrn-candidate-table" aria-label="当前就绪进程响应比">
            <thead><tr><th scope="col">进程</th><th scope="col">等待</th><th scope="col">执行</th><th scope="col">响应比</th></tr></thead>
            <tbody>{candidates.map((candidate, index) => (
              <tr key={candidate.processId} className={index === 0 ? 'selected' : undefined}>
                <th scope="row">{candidate.processId}</th><td>{candidate.waitingTime}</td><td>{candidate.serviceTime}</td><td><code>{formatRatio(candidate.responseRatio)}</code></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ScheduleTable({ trace }: { trace: HrrnSchedulingTrace }) {
  return (
    <section className="lab-control-panel hrrn-schedule-panel" aria-labelledby="hrrn-schedule-heading">
      <div className="lab-control-heading"><div><span className="eyebrow">NON-PREEMPTIVE TRACE</span><h2 id="hrrn-schedule-heading">HRRN 调度结果</h2></div><Clock3 size={19} aria-hidden="true" /></div>
      <div className="table-responsive">
        <table className="table hrrn-schedule-table" aria-label="HRRN 调度结果">
          <thead><tr><th scope="col">顺序</th><th scope="col">进程</th><th scope="col">到达</th><th scope="col">开始</th><th scope="col">完成</th><th scope="col">等待</th><th scope="col">响应比</th></tr></thead>
          <tbody>{trace.schedule.map((entry, index) => (
            <tr key={entry.processId}><td>{index + 1}</td><th scope="row">{entry.processId}</th><td>{entry.arrivalTime}</td><td>{entry.startTime}</td><td>{entry.endTime}</td><td>{entry.waitingTime}</td><td><code>{formatRatio(entry.responseRatio)}</code></td></tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function ScheduleTimeline({ trace, activeStep }: { trace: HrrnSchedulingTrace; activeStep: HrrnStep }) {
  const visibleIds = new Set(activeStep.completedProcessIds);
  if (activeStep.kind === 'dispatch' && activeStep.processId) visibleIds.add(activeStep.processId);
  const scale = Math.max(1, trace.finalTime);
  return (
    <section className="lab-control-panel hrrn-timeline-panel" aria-labelledby="hrrn-timeline-heading">
      <div className="lab-control-heading"><div><span className="eyebrow">CPU TIMELINE</span><h2 id="hrrn-timeline-heading">非抢占时间线</h2></div><strong>t=0 → {trace.finalTime}</strong></div>
      <div className="hrrn-timeline" role="img" aria-label={`HRRN CPU 时间线，完成时刻 ${trace.finalTime}`}>
        {trace.schedule.map((entry) => (
          <div
            className={`hrrn-timeline-segment${visibleIds.has(entry.processId) ? ' visible' : ''}`}
            key={entry.processId}
            style={{ left: `${(entry.startTime / scale) * 100}%`, width: `${((entry.endTime - entry.startTime) / scale) * 100}%` }}
            title={`${entry.processId}: t=${entry.startTime}–${entry.endTime}`}
          >
            <strong>{entry.processId}</strong><small>{entry.startTime}–{entry.endTime}</small>
          </div>
        ))}
      </div>
      <div className="hrrn-timeline-axis"><span>0</span><span>{Math.round(trace.finalTime / 2)}</span><span>{trace.finalTime}</span></div>
    </section>
  );
}

function Metrics({ trace }: { trace: HrrnSchedulingTrace }) {
  return (
    <dl className="hrrn-metrics" aria-label="HRRN 调度指标">
      <div><dt>平均等待时间</dt><dd>{formatNumber(trace.averageWaitingTime)}</dd></div>
      <div><dt>平均周转时间</dt><dd>{formatNumber(trace.averageTurnaroundTime)}</dd></div>
      <div><dt>CPU 空闲</dt><dd>{trace.totalIdleTime}</dd></div>
      <div><dt>最终完成时刻</dt><dd>{trace.finalTime}</dd></div>
    </dl>
  );
}

export function HrrnSchedulingLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === HRRN_Q24_PRESET.sourceQuestionId;
  const jobsText = presetSelected ? q24ExampleText : (searchParams.get('jobs') ?? q24ExampleText);
  const [activePosition, setActivePosition] = useState({ key: jobsText, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => compute(jobsText), [jobsText]);
  const activeIndex = activePosition.key === jobsText ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => current.key === jobsText && current.index === index ? current : { key: jobsText, index });
  }, [jobsText]);
  const safeActiveIndex = computation.ok ? Math.min(activeIndex, computation.trace.steps.length - 1) : 0;
  const currentStep = computation.ok ? computation.trace.steps[safeActiveIndex]! : null;
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === HRRN_Q24_PRESET.sourceQuestionId || (candidate.year === 2009 && candidate.number === 24)
  )), [questions]);

  const updateJobs = (value: string) => {
    setActivePosition({ key: value, index: 0 });
    setSearchParams({ module: 'hrrn', jobs: value }, { replace: true });
  };

  const restoreExample = () => {
    setActivePosition({ key: q24ExampleText, index: 0 });
    setSearchParams({ module: 'hrrn', preset: HRRN_Q24_PRESET.sourceQuestionId }, { replace: true });
  };

  const practiceQ24 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q24 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page hrrn-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">OS LAB / CPU SCHEDULING</span><h1>高响应比调度实验室</h1><p>让等待时间进入优先级公式，逐步观察非抢占 HRRN 如何避免长进程被无限饿死。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ24()}><BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q24'}</button>
      </header>
      <LabSectionNav />
      <OsModuleTabs active="hrrn" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="hrrn-review-band">
        <span><Clock3 size={16} aria-hidden="true" />本地练习预设 · Q24</span>
        <strong>{question?.reviewStatus ?? HRRN_Q24_PRESET.reviewStatus}</strong>
        <small>原题只给出算法概念；下方进程表是通用教学示例，不是 2009 年题干提供的真实调度轨迹。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=operating-systems&node=topic-2009-q24')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><Clock3 size={18} aria-hidden="true" /><span>2009 第 24 题 · 等待时间与执行时间</span></div>
      <div className="lab-panel-grid hrrn-lab-grid">
        <div className="hrrn-workbench">
          <section className="lab-control-panel hrrn-source-panel" aria-labelledby="hrrn-source-heading">
            <div className="lab-control-heading"><div><span className="eyebrow">SOURCE CONCEPT / Q24</span><h2 id="hrrn-source-heading">题目结论</h2></div><strong aria-label="Q24 来源结论">D</strong></div>
            <p>高响应比优先调度算法同时考虑进程的等待时间和执行时间，选择响应比最高的就绪进程。</p>
            <div className="hrrn-formula" aria-label="响应比公式"><code>R = (等待时间 + 执行时间) / 执行时间</code><ArrowRight size={18} aria-hidden="true" /><strong>等待越久，R 越高</strong></div>
          </section>

          <section className="lab-control-panel hrrn-config-panel" aria-labelledby="hrrn-config-heading">
            <div className="lab-control-heading"><div><span className="eyebrow">TEACHING EXAMPLE / EDITABLE</span><h2 id="hrrn-config-heading">进程教学示例</h2></div><button className="secondary-command" type="button" onClick={restoreExample}><RotateCcw size={16} aria-hidden="true" />恢复 Q24 示例</button></div>
            <label className="lab-input-field hrrn-jobs-field"><span>每行或每段一个进程：ID,到达时刻,执行时间</span><textarea aria-label="进程教学示例" rows={4} value={jobsText} onChange={(event) => updateJobs(event.target.value)} /></label>
            <small className="hrrn-input-help">最多 {HRRN_MAX_PROCESSES} 个进程；时刻与执行时间均限制在 0–{HRRN_MAX_TIME} 范围内。算法为非抢占式，示例只用于理解公式。</small>
            {!computation.ok && <div className="lab-error" role="alert">{computation.message}</div>}
            {computation.ok && <Metrics trace={computation.trace} />}
          </section>

          {computation.ok && currentStep && <CurrentEvent step={currentStep} />}
          {computation.ok && currentStep && <CandidateTable candidates={currentStep.candidates} />}
          {computation.ok && <ScheduleTable trace={computation.trace} />}
          {computation.ok && currentStep && <ScheduleTimeline trace={computation.trace} activeStep={currentStep} />}
          {computation.ok && computation.trace.totalIdleTime > 0 && <p className="hrrn-idle-note">CPU 空闲 {computation.trace.totalIdleTime} 个时间单位后才有进程到达。</p>}
        </div>

        {computation.ok ? <StepExplorer key={jobsText} className="hrrn-step-explorer" steps={computation.explorerSteps} announceChanges={false} onActiveIndexChange={setActiveIndex} /> : <section className="step-explorer hrrn-step-explorer hrrn-empty-trace"><Clock3 size={24} aria-hidden="true" /><strong>等待有效进程表</strong></section>}
      </div>
    </div>
  );
}
