import {
  encodeInstruction,
  executeSingleCycle,
  parseAssembly,
  parseInteger,
  type RiscvError,
  type SingleCycleControl,
  type SingleCycleTrace,
} from '@408os/cpu-core';
import { Binary, CircuitBoard, Database, GitBranch, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StepExplorer, type ExplorerStep } from './StepExplorer';

interface DatapathPreset {
  label: string;
  assembly: string;
  pc: string;
  rs1Value: string;
  rs2Value: string;
  memoryReadValue: string;
}

const DATAPATH_PRESETS: readonly DatapathPreset[] = [
  { label: 'R 型：ADD', assembly: 'add x5, x6, x7', pc: '0x1000', rs1Value: '10', rs2Value: '20', memoryReadValue: '0' },
  { label: 'I 型：ADDI 回绕', assembly: 'addi x5, x6, 1', pc: '0x1000', rs1Value: '0xffffffff', rs2Value: '0', memoryReadValue: '0' },
  { label: 'Load：LW', assembly: 'lw x5, 4(x6)', pc: '0x1000', rs1Value: '0x1000', rs2Value: '0', memoryReadValue: '0xffffff80' },
  { label: 'Store：SW', assembly: 'sw x7, 4(x6)', pc: '0x1000', rs1Value: '0x1000', rs2Value: '0x12345678', memoryReadValue: '0' },
  { label: 'Branch：BEQ taken', assembly: 'beq x1, x2, 12', pc: '0x1000', rs1Value: '7', rs2Value: '7', memoryReadValue: '0' },
  { label: 'Upper：LUI', assembly: 'lui x5, 0x12345', pc: '0x1000', rs1Value: '0', rs2Value: '0', memoryReadValue: '0' },
  { label: 'Upper：AUIPC', assembly: 'auipc x5, 1', pc: '0x1000', rs1Value: '0', rs2Value: '0', memoryReadValue: '0' },
  { label: 'Jump：JAL', assembly: 'jal x1, 12', pc: '0x1000', rs1Value: '0', rs2Value: '0', memoryReadValue: '0' },
  { label: 'Jump register：JALR', assembly: 'jalr x1, 3(x2)', pc: '0x1000', rs1Value: '0x2000', rs2Value: '0', memoryReadValue: '0' },
] as const;

const DEFAULT_PRESET = DATAPATH_PRESETS[0]!;

interface ParsedWord {
  ok: true;
  value: number;
}

interface InvalidWord {
  ok: false;
  message: string;
}

type WordResult = ParsedWord | InvalidWord;

function formatHex(value: number): string {
  return `0x${value.toString(16).padStart(8, '0')}`;
}

function parseWord(text: string, label: string, allowSigned: boolean): WordResult {
  const parsed = parseInteger({ text });
  const minimum = allowSigned ? -0x8000_0000n : 0n;
  if (!parsed.ok || parsed.value.value < minimum || parsed.value.value > 0xffff_ffffn) {
    return { ok: false, message: `${label} 必须是 32 位${allowSigned ? '字值' : '无符号整数'}。` };
  }
  return { ok: true, value: Number(BigInt.asUintN(32, parsed.value.value)) };
}

function instructionErrorText(error: RiscvError): string {
  const messages: Record<RiscvError['code'], string> = {
    'empty-input': '请输入 RV32I 指令。',
    'invalid-input': '指令输入格式无效。',
    'unknown-instruction': '当前只支持 RV32I 基础整数指令。',
    'operand-count': '操作数数量不符合该指令格式。',
    'invalid-register': '寄存器必须是 x0 至 x31 或合法 ABI 别名。',
    'invalid-immediate': '立即数或存储器操作数格式无效。',
    'immediate-out-of-range': '立即数超出该指令的可编码范围。',
    'immediate-alignment': '分支或跳转立即数没有按 2 字节对齐。',
    'invalid-ast': '指令 AST 与规范汇编不一致。',
    'invalid-machine-code': '机器码格式无效。',
    'reserved-encoding': '该编码是保留编码或不受支持。',
  };
  return messages[error.code];
}

function signalValue(value: string | boolean | number | null): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value === null) return 'none';
  return String(value);
}

function controlSignals(control: SingleCycleControl): ReadonlyArray<readonly [string, string]> {
  return [
    ['ALUOp', control.aluOperation],
    ['ALUSrcA', control.aluSourceA],
    ['ALUSrcB', control.aluSourceB],
    ['RegWrite', signalValue(control.regWrite)],
    ['MemRead', signalValue(control.memoryRead)],
    ['MemWrite', signalValue(control.memoryWrite)],
    ['MemWidth', control.memoryWidth === null ? 'none' : `${control.memoryWidth} bit`],
    ['LoadUnsigned', signalValue(control.memoryUnsigned)],
    ['Branch', signalValue(control.branchCondition)],
    ['Writeback', control.writebackSource],
    ['PCSource', control.pcSource],
  ];
}

function traceSteps(trace: SingleCycleTrace): ExplorerStep[] {
  return trace.stages.map((stage) => ({
    id: stage.id,
    label: `${stage.id} · ${stage.label}`,
    value: stage.signals.map((signal) => `${signal.name}: ${signal.value}`).join(' · '),
  }));
}

function resultDescription(trace: SingleCycleTrace): string {
  if (trace.result.registerWrite) {
    return `x${trace.result.registerWrite.register} = ${formatHex(trace.result.registerWrite.value)}`;
  }
  if (trace.writeback.suppressedByX0) return `x0 写回被抑制（候选值 ${formatHex(trace.writeback.value ?? 0)}）`;
  if (trace.result.memoryWrite) {
    return `${trace.result.memoryWrite.width} bit 写入 ${formatHex(trace.result.memoryWrite.value)}`;
  }
  return '本周期没有寄存器或存储器写入';
}

export function DatapathLabPanel() {
  const [assembly, setAssembly] = useState(DEFAULT_PRESET.assembly);
  const [pc, setPc] = useState(DEFAULT_PRESET.pc);
  const [rs1Value, setRs1Value] = useState(DEFAULT_PRESET.rs1Value);
  const [rs2Value, setRs2Value] = useState(DEFAULT_PRESET.rs2Value);
  const [memoryReadValue, setMemoryReadValue] = useState(DEFAULT_PRESET.memoryReadValue);
  const [activeStage, setActiveStage] = useState(0);

  const panelResult = useMemo(() => {
    const parsed = parseAssembly({ text: assembly });
    if (!parsed.ok) return { ok: false as const, message: instructionErrorText(parsed.error) };
    const encoded = encodeInstruction({ instruction: parsed.value });
    if (!encoded.ok) return { ok: false as const, message: instructionErrorText(encoded.error) };

    const parsedPc = parseWord(pc, 'PC', false);
    if (!parsedPc.ok) return parsedPc;
    const parsedRs1 = parseWord(rs1Value, 'rs1 输入', true);
    if (!parsedRs1.ok) return parsedRs1;
    const parsedRs2 = parseWord(rs2Value, 'rs2 输入', true);
    if (!parsedRs2.ok) return parsedRs2;
    const parsedMemory = parseWord(memoryReadValue, '内存读值', true);
    if (!parsedMemory.ok) return parsedMemory;

    const trace = executeSingleCycle({
      instruction: encoded.value,
      pc: parsedPc.value,
      rs1Value: parsedRs1.value,
      rs2Value: parsedRs2.value,
      memoryReadValue: parsedMemory.value,
    });
    return trace.ok
      ? { ok: true as const, trace: trace.value }
      : { ok: false as const, message: trace.error.message };
  }, [assembly, memoryReadValue, pc, rs1Value, rs2Value]);

  const applyPreset = (presetAssembly: string) => {
    const preset = DATAPATH_PRESETS.find((candidate) => candidate.assembly === presetAssembly);
    if (!preset) return;
    setAssembly(preset.assembly);
    setPc(preset.pc);
    setRs1Value(preset.rs1Value);
    setRs2Value(preset.rs2Value);
    setMemoryReadValue(preset.memoryReadValue);
    setActiveStage(0);
  };

  const reset = () => applyPreset(DEFAULT_PRESET.assembly);
  const ast = panelResult.ok ? panelResult.trace.instruction.instruction : null;
  const steps = panelResult.ok ? traceSteps(panelResult.trace) : [];

  return (
    <div className="datapath-lab-panel">
      <section className="lab-control-panel" aria-labelledby="datapath-heading">
        <div className="lab-control-heading">
          <div>
            <span className="eyebrow">RV32I / SINGLE CYCLE</span>
            <h2 id="datapath-heading">RV32I 单周期数据通路</h2>
          </div>
          <div className="lab-field-row">
            <label className="select-field">
              <CircuitBoard size={16} aria-hidden="true" />
              <select aria-label="选择数据通路例题" value="" onChange={(event) => applyPreset(event.target.value)}>
                <option value="" disabled>典型指令</option>
                {DATAPATH_PRESETS.map((preset) => (
                  <option key={preset.assembly} value={preset.assembly}>{preset.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="icon-command" onClick={reset} title="恢复默认数据通路预设" aria-label="恢复默认数据通路预设">
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <label className="lab-input-field full" htmlFor="datapath-assembly">
          <span>汇编指令</span>
          <input
            id="datapath-assembly"
            value={assembly}
            onChange={(event) => setAssembly(event.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="lab-field-row datapath-input-grid">
          <label className="lab-input-field" htmlFor="datapath-pc">
            <span>PC</span>
            <input id="datapath-pc" value={pc} onChange={(event) => setPc(event.target.value)} spellCheck={false} />
          </label>
          <label className="lab-input-field" htmlFor="datapath-rs1">
            <span>{ast?.rs1 === null || ast?.rs1 === undefined ? 'rs1（未使用）' : `rs1 · x${ast.rs1}`}</span>
            <input id="datapath-rs1" value={rs1Value} onChange={(event) => setRs1Value(event.target.value)} spellCheck={false} />
          </label>
          <label className="lab-input-field" htmlFor="datapath-rs2">
            <span>{ast?.rs2 === null || ast?.rs2 === undefined ? 'rs2（未使用）' : `rs2 · x${ast.rs2}`}</span>
            <input id="datapath-rs2" value={rs2Value} onChange={(event) => setRs2Value(event.target.value)} spellCheck={false} />
          </label>
          <label className="lab-input-field" htmlFor="datapath-memory-read">
            <span>内存读值</span>
            <input id="datapath-memory-read" value={memoryReadValue} onChange={(event) => setMemoryReadValue(event.target.value)} spellCheck={false} />
          </label>
        </div>

        {!panelResult.ok ? (
          <div className="lab-error" role="alert">{panelResult.message}</div>
        ) : (
          <div className="datapath-instruction-summary">
            <Binary size={17} aria-hidden="true" />
            <strong>{panelResult.trace.instruction.canonicalAssembly}</strong>
            <code>{panelResult.trace.instruction.hex}</code>
          </div>
        )}
      </section>

      {panelResult.ok && (
        <>
          <section className="lab-control-panel datapath-control-panel" aria-labelledby="datapath-control-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">CONTROL UNIT</span><h3 id="datapath-control-heading">控制信号</h3></div>
              <GitBranch size={18} aria-hidden="true" />
            </div>
            <dl className="network-fact-grid datapath-control-grid">
              {controlSignals(panelResult.trace.control).map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd><code>{value}</code></dd></div>
              ))}
            </dl>
          </section>

          <section className="lab-control-panel" aria-labelledby="datapath-stage-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">IF / ID / EX / MEM / WB</span><h3 id="datapath-stage-heading">本周期数据路径</h3></div>
              <Database size={18} aria-hidden="true" />
            </div>
            <div className="datapath-stage-strip" role="list" aria-label="单周期五阶段信号">
              {panelResult.trace.stages.map((stage, index) => (
                <article
                  key={stage.id}
                  className={`datapath-stage${index === activeStage ? ' active' : ''}`}
                  role="listitem"
                  aria-current={index === activeStage ? 'step' : undefined}
                >
                  <div><span>{stage.id}</span><strong>{stage.label}</strong></div>
                  <dl>
                    {stage.signals.map((signal) => (
                      <div key={signal.name}><dt>{signal.name}</dt><dd><code>{signal.value}</code></dd></div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
            <div className="datapath-result-line" aria-live="polite">
              <strong>{resultDescription(panelResult.trace)}</strong>
              {panelResult.trace.result.memoryWrite && (
                <span>地址 {formatHex(panelResult.trace.result.memoryWrite.address)}</span>
              )}
              <span>Next PC: {formatHex(panelResult.trace.result.nextPc)}</span>
            </div>
          </section>

          <StepExplorer
            key={`${assembly}:${pc}:${rs1Value}:${rs2Value}:${memoryReadValue}`}
            steps={steps}
            onActiveIndexChange={setActiveStage}
          />
        </>
      )}
    </div>
  );
}
