import {
  PIPELINE_PRESETS,
  PIPELINE_TIMING_PRESETS,
  analyzePipelineStageTiming,
  simulateFiveStagePipeline,
  type PipelineCycleTrace,
  type PipelineError,
  type PipelineInstructionRef,
  type PipelineMemoryWord,
  type PipelinePreset,
  type PipelineRegisterValue,
  type PipelineStageId,
  type PipelineStageTimingAnalysis,
  type PipelineTrace,
} from '@408os/cpu-core';
import { Clock3, Gauge, GitBranch, Pause, Play, RotateCcw, SkipBack, SkipForward, Waypoints } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const UI_MAX_INSTRUCTIONS = 16;
const PLAY_INTERVAL_MS = 850;

const presetCopy: Readonly<Record<PipelinePreset['id'], { label: string; description: string }>> = {
  'alu-forwarding-chain': {
    label: 'ALU RAW 前递链',
    description: '连续相关运算展示 EX/MEM 与 MEM/WB 前递。',
  },
  'load-use-stall': {
    label: 'Load-use 停顿',
    description: 'lw 的结果晚一拍到达，相关 add 必须停顿一个周期。',
  },
  'taken-branch-flush': {
    label: '分支跳转冲刷',
    description: 'beq 在 EX 判定跳转，并冲刷两条错误路径指令。',
  },
};

const stageLabels: Readonly<Record<PipelineStageId, string>> = {
  IF: '取指',
  ID: '译码',
  EX: '执行',
  MEM: '访存',
  WB: '写回',
};

interface ParsedAssignments<T> {
  ok: boolean;
  value: T[];
  message?: string;
}

function formatHex(value: number): string {
  return `0x${(value >>> 0).toString(16).padStart(8, '0')}`;
}

function parseUint32(text: string): number | null {
  const normalized = text.trim();
  if (!/^(?:0x[0-9a-f]+|\d+)$/iu.test(normalized)) return null;
  try {
    const value = BigInt(normalized);
    return value >= 0n && value <= 0xffff_ffffn ? Number(value) : null;
  } catch {
    return null;
  }
}

function assignmentTokens(text: string): string[] {
  return text.split(/[\n,]+/u).map((entry) => entry.trim()).filter(Boolean);
}

function parseRegisters(text: string): ParsedAssignments<PipelineRegisterValue> {
  const entries: PipelineRegisterValue[] = [];
  for (const [index, token] of assignmentTokens(text).entries()) {
    const match = /^x(\d{1,2})\s*=\s*(.+)$/iu.exec(token);
    if (!match) return { ok: false, value: [], message: `寄存器初值第 ${index + 1} 项格式应为 x1=0x100。` };
    const register = Number(match[1]);
    const value = parseUint32(match[2]!);
    if (register < 0 || register > 31 || value === null) {
      return { ok: false, value: [], message: `寄存器初值第 ${index + 1} 项必须是 x0 至 x31 和 32 位无符号数。` };
    }
    entries.push({ register, value });
  }
  return { ok: true, value: entries };
}

function parseMemory(text: string): ParsedAssignments<PipelineMemoryWord> {
  const entries: PipelineMemoryWord[] = [];
  for (const [index, token] of assignmentTokens(text).entries()) {
    const match = /^(.+?)\s*=\s*(.+)$/u.exec(token);
    if (!match) return { ok: false, value: [], message: `内存初值第 ${index + 1} 项格式应为 0x100=7。` };
    const address = parseUint32(match[1]!);
    const value = parseUint32(match[2]!);
    if (address === null || value === null) {
      return { ok: false, value: [], message: `内存初值第 ${index + 1} 项的地址和值必须是 32 位无符号数。` };
    }
    entries.push({ address, value });
  }
  return { ok: true, value: entries };
}

function pipelineErrorText(error: PipelineError): string {
  const line = typeof error.details?.programIndex === 'number' ? error.details.programIndex + 1 : null;
  if (error.code === 'empty-program') return '至少输入一条 RV32I 指令。';
  if (error.code === 'program-too-large') return `交互实验最多支持 ${UI_MAX_INSTRUCTIONS} 条指令。`;
  if (error.code === 'invalid-instruction') return line ? `第 ${line} 行指令无法解析。` : '程序中存在无法解析的指令。';
  if (error.code === 'unsupported-instruction') return line
    ? `第 ${line} 行不在教学子集内；仅支持 add、sub、addi、lw、sw、beq。`
    : '仅支持 add、sub、addi、lw、sw、beq。';
  if (error.code === 'duplicate-register') return '同一个寄存器只能设置一次初值。';
  if (error.code === 'duplicate-memory-address') return '同一个内存地址只能设置一次初值。';
  if (error.code.startsWith('invalid-register')) return '寄存器初值必须是 x0 至 x31 和 32 位无符号数。';
  if (error.code.startsWith('invalid-memory')) return '内存地址和值必须是 32 位无符号数。';
  return error.message;
}

function presetText(preset: PipelinePreset) {
  return {
    program: preset.program.join('\n'),
    registers: preset.initialRegisters.map((entry) => `x${entry.register}=${formatHex(entry.value)}`).join('\n'),
    memory: preset.initialMemory.map((entry) => `${formatHex(entry.address)}=${formatHex(entry.value)}`).join('\n'),
    forwarding: preset.forwarding,
  };
}

function cumulativeState(trace: PipelineTrace, activeIndex: number) {
  const registers = [...trace.initialRegisters];
  const memory = new Map(trace.initialMemory.map((entry) => [entry.address, entry.value]));
  const registerWriters = new Map<number, PipelineInstructionRef>();
  const memoryWriters = new Map<number, PipelineInstructionRef>();
  for (const cycle of trace.cycles.slice(0, activeIndex + 1)) {
    for (const event of cycle.events.registerWrite) {
      if (!event.suppressedByX0) {
        registers[event.register] = event.value;
        registerWriters.set(event.register, event.instruction);
      }
    }
    for (const event of cycle.events.memoryAccess) {
      if (event.operation === 'write') {
        memory.set(event.address, event.value);
        memoryWriters.set(event.address, event.instruction);
      }
    }
  }
  registers[0] = 0;
  return { registers, memory, registerWriters, memoryWriters };
}

function instructionName(instruction: PipelineInstructionRef): string {
  return `I${instruction.programIndex + 1}`;
}

function eventLines(cycle: PipelineCycleTrace): string[] {
  const lines: string[] = [];
  for (const event of cycle.events.forwarding) {
    lines.push(`RAW x${event.register} · ${instructionName(event.producer)} ${event.source} -> ${instructionName(event.consumer)} EX · ${event.operand} 前递`);
  }
  if (cycle.events.stall) {
    const event = cycle.events.stall;
    lines.push(`${event.kind === 'load-use' ? 'load-use' : 'RAW'} x${event.register} · ${instructionName(event.consumer)} 停顿 1 周期`);
  }
  if (cycle.events.flush) {
    const event = cycle.events.flush;
    const flushed = event.flushed.map(instructionName).join(' / ') || '无有效指令';
    lines.push(`BEQ taken · 跳转 ${formatHex(event.targetPc)} · 冲刷 ${flushed}`);
  }
  for (const event of cycle.events.memoryAccess) {
    lines.push(`${event.operation === 'read' ? '读取' : '写入'}内存 ${formatHex(event.address)} = ${formatHex(event.value)}${event.misaligned ? ' · 未对齐' : ''}`);
  }
  for (const event of cycle.events.registerWrite) {
    lines.push(event.suppressedByX0
      ? `${instructionName(event.instruction)} 尝试写 x0，被体系结构抑制`
      : `${instructionName(event.instruction)} 提交 x${event.register} = ${formatHex(event.value)}`);
  }
  return lines;
}

function stageCellText(status: string, stage: PipelineStageId): string {
  if (status === 'stalled') return 'ST';
  if (status === 'flushed') return 'FL';
  return stage;
}

export function PipelineLabPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'timing' ? 'timing' : 'dynamic';

  const selectMode = (nextMode: 'dynamic' | 'timing') => {
    const next = new URLSearchParams(searchParams);
    if (nextMode === 'timing') {
      next.set('mode', 'timing');
      next.set('preset', 'cn408-2009-q18-stage-clock');
    } else {
      next.delete('mode');
      next.delete('preset');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="pipeline-mode-shell">
      <div className="pipeline-mode-row">
        <div className="segmented-control" aria-label="流水线实验模式">
          <button aria-pressed={mode === 'dynamic'} className={mode === 'dynamic' ? 'active' : ''} onClick={() => selectMode('dynamic')}>动态五级流水</button>
          <button aria-pressed={mode === 'timing'} className={mode === 'timing' ? 'active' : ''} onClick={() => selectMode('timing')}>功能段时延</button>
        </div>
        <span>{mode === 'dynamic' ? '逐周期数据与控制冒险' : '2009 Q18 · 最小时钟周期'}</span>
      </div>
      {mode === 'timing' ? <PipelineStageTimingPanel /> : <DynamicPipelineLabPanel />}
    </div>
  );
}

function DynamicPipelineLabPanel() {
  const firstPreset = PIPELINE_PRESETS[0];
  const initial = presetText(firstPreset);
  const [presetId, setPresetId] = useState<PipelinePreset['id']>(firstPreset.id);
  const [programText, setProgramText] = useState(initial.program);
  const [registerText, setRegisterText] = useState(initial.registers);
  const [memoryText, setMemoryText] = useState(initial.memory);
  const [forwarding, setForwarding] = useState(initial.forwarding);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    const program = programText.split('\n').map((line) => line.trim()).filter(Boolean);
    if (program.length > UI_MAX_INSTRUCTIONS) {
      return { ok: false as const, message: `交互实验最多支持 ${UI_MAX_INSTRUCTIONS} 条指令。` };
    }
    const registers = parseRegisters(registerText);
    if (!registers.ok) return { ok: false as const, message: registers.message! };
    const memory = parseMemory(memoryText);
    if (!memory.ok) return { ok: false as const, message: memory.message! };
    const result = simulateFiveStagePipeline({
      program,
      initialRegisters: registers.value,
      initialMemory: memory.value,
      forwarding,
      maxCycles: 128,
    });
    return result.ok
      ? { ok: true as const, trace: result.value }
      : { ok: false as const, message: pipelineErrorText(result.error) };
  }, [forwarding, memoryText, programText, registerText]);

  const trace = parsed.ok ? parsed.trace : null;
  const lastIndex = Math.max(0, (trace?.cycles.length ?? 1) - 1);
  const safeIndex = Math.min(activeIndex, lastIndex);

  useEffect(() => {
    if (!playing || !trace || trace.cycles.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= lastIndex) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [lastIndex, playing, trace]);

  useEffect(() => {
    const container = chartScrollRef.current;
    if (!container) return;
    const header = container.querySelector<HTMLElement>(`[data-cycle-header="${safeIndex + 1}"]`);
    if (!header) return;
    const left = header.offsetLeft - container.clientWidth / 2 + header.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [safeIndex]);

  const selectPreset = (id: PipelinePreset['id']) => {
    const preset = PIPELINE_PRESETS.find((entry) => entry.id === id) ?? firstPreset;
    const next = presetText(preset);
    setPlaying(false);
    setActiveIndex(0);
    setPresetId(preset.id);
    setProgramText(next.program);
    setRegisterText(next.registers);
    setMemoryText(next.memory);
    setForwarding(next.forwarding);
  };

  const updateProgram = (value: string) => { setPlaying(false); setActiveIndex(0); setProgramText(value); };
  const updateRegisters = (value: string) => { setPlaying(false); setActiveIndex(0); setRegisterText(value); };
  const updateMemory = (value: string) => { setPlaying(false); setActiveIndex(0); setMemoryText(value); };
  const updateForwarding = (value: boolean) => { setPlaying(false); setActiveIndex(0); setForwarding(value); };

  const dynamicInstructions = useMemo(() => {
    if (!trace) return [];
    const instructions = new Map<number, PipelineInstructionRef>();
    for (const cycle of trace.cycles) {
      for (const stage of cycle.stages) {
        if (stage.instruction) instructions.set(stage.instruction.instanceId, stage.instruction);
      }
    }
    return [...instructions.values()].sort((left, right) => left.instanceId - right.instanceId);
  }, [trace]);

  if (!trace) {
    return (
      <div className="pipeline-lab-panel">
        <PipelineInputPanel
          presetId={presetId}
          programText={programText}
          registerText={registerText}
          memoryText={memoryText}
          forwarding={forwarding}
          onPreset={selectPreset}
          onProgram={updateProgram}
          onRegisters={updateRegisters}
          onMemory={updateMemory}
          onForwarding={updateForwarding}
        />
        <div className="lab-error" role="alert">{parsed.message}</div>
      </div>
    );
  }

  const currentCycle = trace.cycles[safeIndex]!;
  const currentState = cumulativeState(trace, safeIndex);
  const visibleRegisters = [...new Set([
    0,
    ...trace.initialRegisters.flatMap((value, register) => value !== 0 ? [register] : []),
    ...trace.cycles.flatMap((cycle) => cycle.events.registerWrite.map((event) => event.register)),
  ])].sort((left, right) => left - right);
  const visibleMemory = [...currentState.memory.entries()].sort(([left], [right]) => left - right);
  const cyclesSoFar = trace.cycles.slice(0, safeIndex + 1);
  const retiredSoFar = cyclesSoFar.filter((cycle) => cycle.stages.some((stage) => stage.id === 'WB' && stage.instruction)).length;
  const stallsSoFar = cyclesSoFar.filter((cycle) => cycle.events.stall).length;
  const flushesSoFar = cyclesSoFar.filter((cycle) => cycle.events.flush).length;
  const lines = eventLines(currentCycle);

  return (
    <div className="pipeline-lab-panel">
      <PipelineInputPanel
        presetId={presetId}
        programText={programText}
        registerText={registerText}
        memoryText={memoryText}
        forwarding={forwarding}
        onPreset={selectPreset}
        onProgram={updateProgram}
        onRegisters={updateRegisters}
        onMemory={updateMemory}
        onForwarding={updateForwarding}
      />

      <section className="pipeline-timing-section" aria-labelledby="pipeline-timing-heading">
        <div className="pipeline-transport">
          <div><span className="eyebrow">SPACE-TIME DIAGRAM</span><h2 id="pipeline-timing-heading">流水线时空图</h2></div>
          <div className="pipeline-cycle-status" aria-live="polite">C{safeIndex + 1} / C{trace.cycles.length}</div>
          <div className="step-controls">
            <button className="icon-command" onClick={() => { setPlaying(false); setActiveIndex(0); }} aria-label="复位周期" title="复位周期"><RotateCcw size={16} /></button>
            <button className="icon-command" disabled={safeIndex === 0} onClick={() => { setPlaying(false); setActiveIndex((value) => Math.max(0, value - 1)); }} aria-label="上一个周期" title="上一个周期"><SkipBack size={16} /></button>
            <button className="icon-command" onClick={() => {
              if (safeIndex >= lastIndex) setActiveIndex(0);
              setPlaying((value) => !value);
            }} aria-label={playing ? '暂停流水线' : '播放流水线'} title={playing ? '暂停' : '播放'}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="icon-command" disabled={safeIndex >= lastIndex} onClick={() => { setPlaying(false); setActiveIndex((value) => Math.min(lastIndex, value + 1)); }} aria-label="下一个周期" title="下一个周期"><SkipForward size={16} /></button>
          </div>
        </div>
        <div className="pipeline-stage-legend" aria-label="流水线阶段图例">
          {(Object.keys(stageLabels) as PipelineStageId[]).map((stage) => <span key={stage} data-stage={stage}><strong>{stage}</strong>{stageLabels[stage]}</span>)}
          <span data-stage="ST"><strong>ST</strong>停顿</span>
          <span data-stage="FL"><strong>FL</strong>冲刷</span>
        </div>
        <div className="pipeline-chart-scroll" ref={chartScrollRef}>
          <table className="pipeline-chart">
            <thead><tr><th scope="col">动态指令</th>{trace.cycles.map((cycle, cycleIndex) => (
              <th key={cycle.cycle} scope="col" className={cycleIndex === safeIndex ? 'is-active-cycle' : ''}>
                <button
                  data-cycle-header={cycle.cycle}
                  aria-current={cycleIndex === safeIndex ? 'step' : undefined}
                  onClick={() => { setPlaying(false); setActiveIndex(cycleIndex); }}
                >C{cycle.cycle}</button>
              </th>
            ))}</tr></thead>
            <tbody>{dynamicInstructions.map((instruction) => (
              <tr key={instruction.instanceId}>
                <th scope="row"><strong>{instructionName(instruction)}</strong><code>{instruction.canonicalAssembly}</code></th>
                {trace.cycles.map((cycle, cycleIndex) => {
                  const stage = cycle.stages.find((entry) => entry.instruction?.instanceId === instruction.instanceId);
                  return <td key={cycle.cycle} className={cycleIndex === safeIndex ? 'is-active-cycle' : ''}>
                    {stage ? <span
                      className={`pipeline-stage-cell is-${stage.status}`}
                      data-stage={stage.status === 'stalled' ? 'ST' : stage.status === 'flushed' ? 'FL' : stage.id}
                      title={`${instruction.canonicalAssembly} · ${stage.id} ${stage.status}`}
                    >{stageCellText(stage.status, stage.id)}</span> : <span className="pipeline-stage-empty">--</span>}
                  </td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <div className="pipeline-summary-grid" aria-label="当前流水线统计">
        <div><span>当前周期</span><strong>{safeIndex + 1}</strong><small>/ {trace.cycles.length}</small></div>
        <div><span>已完成</span><strong>{retiredSoFar}</strong><small>CPI {retiredSoFar ? ((safeIndex + 1) / retiredSoFar).toFixed(2) : '--'}</small></div>
        <div><span>停顿</span><strong>{stallsSoFar}</strong><small>{forwarding ? '前递开启' : '前递关闭'}</small></div>
        <div><span>冲刷</span><strong>{flushesSoFar}</strong><small>{trace.termination === 'max-cycles' ? '达到周期上限' : '静态不跳转'}</small></div>
      </div>

      <div className="pipeline-result-grid">
        <section className="pipeline-event-panel" aria-labelledby="pipeline-event-heading">
          <div className="lab-control-heading"><div><span className="eyebrow">CYCLE EVENTS</span><h2 id="pipeline-event-heading">C{currentCycle.cycle} 事件</h2></div><Waypoints size={19} /></div>
          {lines.length ? <ul>{lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ul> : <p className="pipeline-empty-state">本周期没有冒险、访存或提交事件。</p>}
        </section>
        <section className="pipeline-state-panel" aria-labelledby="pipeline-state-heading">
          <div className="lab-control-heading"><div><span className="eyebrow">COMMITTED STATE</span><h2 id="pipeline-state-heading">已提交状态</h2></div><GitBranch size={19} /></div>
          <div className="table-responsive"><table className="table pipeline-register-table"><thead><tr><th>寄存器</th><th>初值</th><th>当前值</th><th>最后写者</th></tr></thead><tbody>
            {visibleRegisters.map((register) => <tr key={register}><th scope="row">x{register}</th><td><code>{formatHex(trace.initialRegisters[register] ?? 0)}</code></td><td><code>{formatHex(currentState.registers[register] ?? 0)}</code></td><td>{currentState.registerWriters.has(register) ? instructionName(currentState.registerWriters.get(register)!) : '--'}</td></tr>)}
          </tbody></table></div>
          {visibleMemory.length > 0 && <div className="pipeline-memory-state"><h3>数据内存</h3><div className="table-responsive"><table className="table"><thead><tr><th>地址</th><th>当前值</th><th>最后写者</th></tr></thead><tbody>
            {visibleMemory.map(([address, value]) => <tr key={address}><th scope="row"><code>{formatHex(address)}</code></th><td><code>{formatHex(value)}</code></td><td>{currentState.memoryWriters.has(address) ? instructionName(currentState.memoryWriters.get(address)!) : '初值'}</td></tr>)}
          </tbody></table></div></div>}
        </section>
      </div>
    </div>
  );
}

function timingErrorText(error: PipelineError): string {
  if (error.code === 'invalid-stage-count') return '请输入 2 至 16 个功能段时延。';
  if (error.code === 'invalid-stage-delay') {
    const stage = typeof error.details?.stageIndex === 'number' ? error.details.stageIndex + 1 : null;
    return stage ? `第 ${stage} 个功能段时延必须是正数。` : '每个功能段时延都必须是正数。';
  }
  if (error.code === 'invalid-register-overhead') return '流水寄存器开销必须是大于等于 0 的有限数。';
  if (error.code === 'invalid-instruction-count') return '指令条数必须是 1 至 1,000,000 的整数。';
  if (error.code === 'timing-overflow') return '当前参数产生了超出数值范围的结果。';
  return error.message;
}

function compactNumber(value: number, digits = 2): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(digits).replace(/0+$/u, '').replace(/\.$/u, '');
}

function parseStageDelays(text: string): number[] {
  return text.split(/[\s,，]+/u).filter(Boolean).map(Number);
}

function PipelineStageTimingPanel() {
  const preset = PIPELINE_TIMING_PRESETS[0];
  const [delayText, setDelayText] = useState(preset.input.stageDelaysNs.join(', '));
  const [overheadText, setOverheadText] = useState(String(preset.input.registerOverheadNs ?? 0));
  const [instructionCountText, setInstructionCountText] = useState(String(preset.input.instructionCount));
  const [activeStage, setActiveStage] = useState(0);
  const [playing, setPlaying] = useState(false);

  const result = useMemo(() => analyzePipelineStageTiming({
    stageDelaysNs: parseStageDelays(delayText),
    registerOverheadNs: Number(overheadText),
    instructionCount: Number(instructionCountText),
  }), [delayText, instructionCountText, overheadText]);
  const analysis: PipelineStageTimingAnalysis | null = result.ok ? result.value : null;
  const lastStage = Math.max(0, (analysis?.stageCount ?? 1) - 1);
  const safeStage = Math.min(activeStage, lastStage);

  useEffect(() => {
    if (!playing || !analysis || analysis.stageCount <= 1) return;
    const timer = window.setInterval(() => {
      setActiveStage((current) => {
        if (current >= lastStage) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [analysis, lastStage, playing]);

  const resetStage = () => { setPlaying(false); setActiveStage(0); };
  const updateDelayText = (value: string) => { resetStage(); setDelayText(value); };
  const updateOverhead = (value: string) => { resetStage(); setOverheadText(value); };
  const updateInstructionCount = (value: string) => { resetStage(); setInstructionCountText(value); };
  const restorePreset = () => {
    resetStage();
    setDelayText(preset.input.stageDelaysNs.join(', '));
    setOverheadText(String(preset.input.registerOverheadNs ?? 0));
    setInstructionCountText(String(preset.input.instructionCount));
  };

  return (
    <div className="pipeline-timing-lab">
      <section className="lab-control-panel pipeline-timing-control" aria-labelledby="pipeline-stage-timing-heading">
        <div className="lab-control-heading">
          <div><span className="eyebrow">FUNCTIONAL STAGE TIMING</span><h2 id="pipeline-stage-timing-heading">功能段时延与时钟周期</h2></div>
          <button className="secondary-command compact-command" onClick={restorePreset}><RotateCcw size={15} />恢复 Q18 参数</button>
        </div>
        <div className="pipeline-q18-band"><Clock3 size={17} /><strong>2009 第 18 题</strong><span>90 / 80 / 70 / 60 ns</span><small>内容状态 needs-review</small></div>
        <div className="pipeline-timing-fields">
          <label className="lab-input-field grow"><span>各功能段时延 / ns</span><input aria-label="各功能段时延" value={delayText} onChange={(event) => updateDelayText(event.target.value)} spellCheck={false} /></label>
          <label className="lab-input-field"><span>流水寄存器开销 / ns</span><input aria-label="流水寄存器开销" inputMode="decimal" value={overheadText} onChange={(event) => updateOverhead(event.target.value)} /></label>
          <label className="lab-input-field"><span>连续指令数</span><input aria-label="流水线指令数" inputMode="numeric" value={instructionCountText} onChange={(event) => updateInstructionCount(event.target.value)} /></label>
        </div>
        {!result.ok ? <div className="lab-error" role="alert">{timingErrorText(result.error)}</div> : analysis && (
          <div className="pipeline-clock-result">
            <div><span>最小时钟周期</span><strong>{compactNumber(analysis.clockPeriodNs)} ns</strong><small>由最慢功能段决定</small></div>
            <code>T = max({analysis.stageDelaysNs.map((value) => compactNumber(value)).join(', ')}) + {compactNumber(analysis.registerOverheadNs)} = {compactNumber(analysis.clockPeriodNs)} ns</code>
          </div>
        )}
      </section>

      {analysis && <>
        <section className="pipeline-stage-analysis" aria-labelledby="pipeline-stage-comparison-heading">
          <div className="pipeline-transport">
            <div><span className="eyebrow">BOTTLENECK TRACE</span><h2 id="pipeline-stage-comparison-heading">功能段比较</h2></div>
            <div className="pipeline-cycle-status">S{safeStage + 1} / S{analysis.stageCount}</div>
            <div className="step-controls">
              <button className="icon-command" onClick={resetStage} aria-label="复位功能段" title="复位功能段"><RotateCcw size={16} /></button>
              <button className="icon-command" disabled={safeStage === 0} onClick={() => { setPlaying(false); setActiveStage((value) => Math.max(0, value - 1)); }} aria-label="上一个功能段" title="上一个功能段"><SkipBack size={16} /></button>
              <button className="icon-command" onClick={() => {
                if (safeStage >= lastStage) setActiveStage(0);
                setPlaying((value) => !value);
              }} aria-label={playing ? '暂停功能段' : '播放功能段'} title={playing ? '暂停' : '播放'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
              <button className="icon-command" disabled={safeStage >= lastStage} onClick={() => { setPlaying(false); setActiveStage((value) => Math.min(lastStage, value + 1)); }} aria-label="下一个功能段" title="下一个功能段"><SkipForward size={16} /></button>
            </div>
          </div>
          <div className="pipeline-stage-bars">
            {analysis.stageDelaysNs.map((delay, index) => {
              const bottleneck = analysis.bottleneckStageIndices.includes(index);
              const width = `${Math.max(8, delay / Math.max(...analysis.stageDelaysNs) * 100)}%`;
              return <button key={index} className={`${index === safeStage ? 'active' : ''}${bottleneck ? ' bottleneck' : ''}`} onClick={() => { setPlaying(false); setActiveStage(index); }} aria-current={index === safeStage ? 'step' : undefined}>
                <span>功能段 S{index + 1}</span><div><i style={{ width }} /></div><strong>{compactNumber(delay)} ns</strong>{bottleneck && <small>瓶颈</small>}
              </button>;
            })}
          </div>
          <div className="pipeline-stage-current"><Gauge size={16} /><span>S{safeStage + 1}</span><strong>{compactNumber(analysis.stageDelaysNs[safeStage]!)} ns</strong><small>{analysis.bottleneckStageIndices.includes(safeStage) ? '决定时钟周期' : `余量 ${compactNumber(analysis.clockPeriodNs - analysis.stageDelaysNs[safeStage]!)} ns`}</small></div>
        </section>

        <div className="pipeline-timing-summary" aria-label="流水线时序结果">
          <div><span>单指令延迟</span><strong>{compactNumber(analysis.singleInstructionLatencyNs)} ns</strong><small>{analysis.stageCount} 个周期</small></div>
          <div><span>理想总周期</span><strong>{analysis.idealCycles}</strong><small>{analysis.instructionCount} 条指令</small></div>
          <div><span>理想总时间</span><strong>{compactNumber(analysis.totalTimeNs)} ns</strong><small>无停顿</small></div>
          <div><span>稳态吞吐</span><strong>{compactNumber(analysis.steadyStateThroughputInstructionsPerSecond / 1_000_000)} MIPS</strong><small>{compactNumber(analysis.speedupVsSerial)}x 串行</small></div>
        </div>
      </>}
    </div>
  );
}

function PipelineInputPanel({
  presetId,
  programText,
  registerText,
  memoryText,
  forwarding,
  onPreset,
  onProgram,
  onRegisters,
  onMemory,
  onForwarding,
}: {
  presetId: PipelinePreset['id'];
  programText: string;
  registerText: string;
  memoryText: string;
  forwarding: boolean;
  onPreset: (id: PipelinePreset['id']) => void;
  onProgram: (value: string) => void;
  onRegisters: (value: string) => void;
  onMemory: (value: string) => void;
  onForwarding: (value: boolean) => void;
}) {
  return (
    <section className="lab-control-panel pipeline-control-panel" aria-labelledby="pipeline-input-heading">
      <div className="lab-control-heading">
        <div><span className="eyebrow">RV32I / FIVE STAGES</span><h2 id="pipeline-input-heading">RV32I 五级流水线</h2></div>
        <label className="select-field lab-example-select"><Waypoints size={16} /><select aria-label="选择流水线例题" value={presetId} onChange={(event) => onPreset(event.target.value as PipelinePreset['id'])}>
          {PIPELINE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{presetCopy[preset.id].label}</option>)}
        </select></label>
      </div>
      <div className="pipeline-policy-bar">
        <span>IF / ID / EX / MEM / WB</span><span>分支在 EX 判定</span><span>静态不跳转</span>
        <button className={forwarding ? 'pipeline-forwarding-toggle active' : 'pipeline-forwarding-toggle'} type="button" role="switch" aria-checked={forwarding} onClick={() => onForwarding(!forwarding)}>
          <Waypoints size={14} />前递 {forwarding ? 'ON' : 'OFF'}
        </button>
      </div>
      <p className="pipeline-preset-description">{presetCopy[presetId].description}</p>
      <div className="pipeline-program-grid">
        <label className="lab-input-field pipeline-program-input"><span>RV32I 程序 · 每行一条，最多 {UI_MAX_INSTRUCTIONS} 条</span><textarea aria-label="流水线 RV32I 程序" value={programText} onChange={(event) => onProgram(event.target.value)} spellCheck={false} /></label>
        <label className="lab-input-field"><span>寄存器初值 · x1=0x100</span><textarea aria-label="流水线寄存器初值" value={registerText} onChange={(event) => onRegisters(event.target.value)} spellCheck={false} placeholder="x1=0x00000100" /></label>
        <label className="lab-input-field"><span>数据内存初值 · 地址=值</span><textarea aria-label="流水线内存初值" value={memoryText} onChange={(event) => onMemory(event.target.value)} spellCheck={false} placeholder="0x00000100=7" /></label>
      </div>
    </section>
  );
}
