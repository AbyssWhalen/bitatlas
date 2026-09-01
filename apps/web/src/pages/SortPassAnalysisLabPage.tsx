import {
  SORT_PASS_Q10_PRESET,
  analyzeSecondPassInvariants,
  type SortCandidateId,
  type SortInvariantCheck,
  type SortPassAnalysisTrace,
  type SortPassStep,
} from '@408os/lab-core';
import { ArrowRight, BookOpenCheck, ListChecks, RotateCcw, ScanSearch, ShieldAlert } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { DataStructuresModuleTabs } from '../components/DataStructuresModuleTabs';
import { LabSectionNav } from '../components/LabSectionNav';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

const CANONICAL_URL = '/lab/data-structures?module=sort-pass&preset=cn408-2009-q10';
const candidateMeta: Readonly<Record<SortCandidateId, { optionId: string; label: string }>> = {
  bubble: { optionId: 'A', label: '起泡排序' },
  insertion: { optionId: 'B', label: '插入排序' },
  selection: { optionId: 'C', label: '选择排序' },
  'merge-2way': { optionId: 'D', label: '二路归并排序' },
};

function parseValues(text: string): readonly number[] {
  const entries = text.split(',').map((entry) => entry.trim());
  if (entries.some((entry) => entry === '')) throw new TypeError('序列不能包含空项。');
  const values = entries.map((entry) => Number(entry));
  if (values.some((value) => !Number.isSafeInteger(value))) throw new TypeError('序列必须由安全整数构成。');
  return values;
}

function computeTrace(text: string): { ok: true; trace: SortPassAnalysisTrace } | { ok: false; message: string } {
  try {
    return { ok: true, trace: analyzeSecondPassInvariants(parseValues(text)) };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : '第二趟序列无效。' };
  }
}

function checkSummary(check: SortInvariantCheck): string {
  if (check.invariantId === 'sorted-prefix') return '前三项保持有序';
  if (check.invariantId === 'ordered-runs-of-four') return '每个对齐四元段保持有序';
  return '最小两项前置或最大两项后置，满足其一';
}

function stepLabel(step: SortPassStep): string {
  if (step.kind === 'initial') return '载入题目给出的第二趟状态';
  if (step.kind === 'complete') return '汇总题列四项的必要条件判别';
  const meta = candidateMeta[step.activeCandidateId!];
  return `检查 ${meta.optionId} · ${meta.label}`;
}

function explorerSteps(trace: SortPassAnalysisTrace): readonly ExplorerStep[] {
  return trace.steps.map((step) => {
    const activeCheck = step.activeCandidateId === null
      ? null
      : trace.checks.find((check) => check.candidateId === step.activeCandidateId) ?? null;
    return {
      id: step.id,
      label: stepLabel(step),
      value: activeCheck
        ? `${checkSummary(activeCheck)} · ${activeCheck.verdict}`
        : `remaining=${step.state.remainingCandidateIds.join(',') || '--'}`,
    };
  });
}

function SegmentEvidence({ check }: { check: SortInvariantCheck }) {
  return (
    <div className="sort-pass-segments" data-segment-mode={check.segmentMode}>
      {check.segments.map((segment, index) => (
        <span key={`${check.candidateId}-${index}`} data-passes={segment.passes ? 'true' : 'false'}>
          <small>{check.segmentMode === 'any' ? (index === 0 ? '最小前置' : '最大后置') : `段 ${index + 1}`}</small>
          <code>[{segment.values.join(', ')}]</code>
          <em>{segment.passes ? '满足' : '不满足'}</em>
        </span>
      ))}
    </div>
  );
}

function CandidateMatrix({ trace, step }: { trace: SortPassAnalysisTrace; step: SortPassStep }) {
  const revealed = new Map(step.state.checks.map((check) => [check.candidateId, check]));
  return (
    <section className="lab-control-panel sort-pass-state-panel" aria-labelledby="sort-pass-state-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">NECESSARY INVARIANTS</span><h2 id="sort-pass-state-heading">候选必要不变量</h2></div>
        <ScanSearch size={19} aria-hidden="true" />
      </div>
      <div className="sort-pass-table-scroll">
        <table className="sort-pass-candidate-table" aria-label="候选必要不变量">
          <thead><tr><th>题列候选</th><th>必要条件</th><th>状态证据</th><th>判别</th></tr></thead>
          <tbody>
            {trace.checks.map((check) => {
              const visible = revealed.get(check.candidateId);
              const meta = candidateMeta[check.candidateId];
              return (
                <tr key={check.candidateId} data-verdict={visible?.verdict ?? 'pending'}>
                  <th>{meta.optionId} · {meta.label}</th>
                  <td>{checkSummary(check)}</td>
                  <td>{visible ? <SegmentEvidence check={visible} /> : <span className="sort-pass-pending">尚未展开</span>}</td>
                  <td><strong>{visible ? (visible.verdict === 'ruled-out' ? '已排除' : '未被必要条件排除') : '待检查'}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SortPassAnalysisLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const requestedValues = searchParams.get('values');
  const usePreset = preset !== null || requestedValues === null;
  const valuesText = usePreset
    ? SORT_PASS_Q10_PRESET.values.join(',')
    : requestedValues ?? '';
  const computationKey = `${preset ?? 'custom'}:${valuesText}`;
  const [activePosition, setActivePosition] = useState({ key: computationKey, index: 0 });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const computation = useMemo(() => computeTrace(valuesText), [valuesText]);
  const activeIndex = activePosition.key === computationKey ? activePosition.index : 0;
  const setActiveIndex = useCallback((index: number) => {
    setActivePosition((current) => current.key === computationKey && current.index === index
      ? current
      : { key: computationKey, index });
  }, [computationKey]);
  const safeActiveIndex = computation.ok ? Math.min(activeIndex, computation.trace.steps.length - 1) : 0;
  const currentStep = computation.ok ? computation.trace.steps[safeActiveIndex]! : null;
  const question = useMemo(() => questions.find((candidate) => (
    candidate.id === SORT_PASS_Q10_PRESET.sourceQuestionId || (candidate.year === 2009 && candidate.number === 10)
  )), [questions]);

  const updateValues = (nextValues: string) => {
    setActiveIndex(0);
    setSearchParams({ module: 'sort-pass', values: nextValues }, { replace: true });
  };
  const restorePreset = () => {
    setActiveIndex(0);
    setSearchParams({ module: 'sort-pass', preset: SORT_PASS_Q10_PRESET.sourceQuestionId }, { replace: true });
  };
  const practiceQ10 = async () => {
    if (!question?.id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([question.id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q10 练习创建失败');
      setStarting(false);
    }
  };

  const isComplete = currentStep?.kind === 'complete';
  const conclusion = computation.ok && isComplete
    ? computation.trace.result.conclusion === 'single-listed-candidate'
      ? `题列四项中仅 ${computation.trace.result.answerOptionId} 未被必要条件排除`
      : computation.trace.result.conclusion === 'multiple-listed-candidates'
        ? '仍有多个题列候选未被排除'
        : '题列四项均被必要条件排除'
    : '待判定';

  return (
    <div className="page sort-pass-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">DATA STRUCTURES LAB / SORT PASS</span><h1>排序趟次不变量判别实验室</h1><p>依据题目给出的第二趟状态，逐项检查四种排序方法的必要不变量。</p></div>
        <button className="secondary-command" type="button" disabled={!question?.id || starting} onClick={() => void practiceQ10()}><BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q10'}</button>
      </header>
      <LabSectionNav />
      <DataStructuresModuleTabs active="sort-pass" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}
      <div className="ds-review-band sort-pass-review-band">
        <span><ShieldAlert size={16} aria-hidden="true" />本地练习预设 · Q10</span>
        <strong>{question?.reviewStatus ?? SORT_PASS_Q10_PRESET.reviewStatus}</strong>
        <small>来源仍待人工复核；本页只做必要条件排除，不恢复未知初始序列，也不重放真实前两趟。</small>
        <button className="secondary-command compact-command" type="button" onClick={() => navigate('/knowledge?subject=data-structures&node=topic-2009-q10')}>查看知识节点<ArrowRight size={14} aria-hidden="true" /></button>
      </div>

      <div className="lab-module-heading"><ListChecks size={18} aria-hidden="true" /><span>第二趟状态 · 四项必要条件 · 逐项排除</span><ScanSearch size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid sort-pass-lab-grid">
        <div className="sort-pass-workbench">
          <section className="lab-control-panel sort-pass-control-panel" aria-labelledby="sort-pass-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">GIVEN STATE / PASS 2</span><h2 id="sort-pass-control-heading">题给中间状态</h2></div>
              <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q10 预设</button>
            </div>
            <label className="lab-input-field"><span>第二趟序列</span><input aria-label="第二趟序列" value={valuesText} onChange={(event) => updateValues(event.target.value)} /></label>
            {!computation.ok ? <div className="lab-error" role="alert">{computation.message}</div> : (
              <div className="sort-pass-sequence-scroll">
                <div className="sort-pass-sequence" aria-label="当前第二趟状态">
                  {computation.trace.values.map((value, index) => <span key={index}><small>{index}</small><strong>{value}</strong></span>)}
                </div>
              </div>
            )}
          </section>

          {computation.ok && currentStep && (
            <>
              <div className="sort-pass-current-event" aria-live="polite" aria-atomic="true" aria-label="当前判别事件">
                <ScanSearch size={18} aria-hidden="true" /><div><span>当前判别事件</span><strong>{stepLabel(currentStep)}</strong></div><code>checked={currentStep.state.checkedCandidateIds.length}/4</code>
              </div>
              <CandidateMatrix trace={computation.trace} step={currentStep} />
              <section className="sort-pass-conclusion" aria-label="当前判别结论" data-complete={isComplete ? 'true' : 'false'}>
                <div><small>当前结论</small><strong>{conclusion}</strong></div>
                <p>{isComplete ? '结论仅限题列四项的必要条件判别，不是未知前两趟的重放证明。' : '完成四项检查后再汇总，不提前给出来源答案。'}</p>
              </section>
            </>
          )}
        </div>
        {computation.ok && <StepExplorer key={computationKey} steps={explorerSteps(computation.trace)} onActiveIndexChange={setActiveIndex} announceChanges={false} className="sort-pass-step-explorer" />}
      </div>
    </div>
  );
}

export { CANONICAL_URL as SORT_PASS_Q10_CANONICAL_URL };
