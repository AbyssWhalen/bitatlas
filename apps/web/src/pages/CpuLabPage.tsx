import {
  decodeInstruction,
  decodeFloat32,
  decodeSignedInteger,
  encodeInstruction,
  encodeFloat32,
  encodeSignedInteger,
  formatInteger,
  parseAssembly,
  parseInteger,
  type EncodedInstruction,
  type Float32Info,
  type IntegerRadix,
  type NumberCoreError,
  type NumberCoreResult,
  type RiscvError,
  type RiscvResult,
  type SignedIntegerRepresentation,
} from '@408os/cpu-core';
import { Activity, Binary, BookOpenCheck, Braces, CircuitBoard, Code2, Cpu, FlaskConical, Gauge, HardDrive, MemoryStick, Play, Rows3, Workflow } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { CacheLabPanel } from '../components/CacheLabPanel';
import { BusBandwidthLabPanel } from '../components/BusBandwidthLabPanel';
import { DatapathLabPanel } from '../components/DatapathLabPanel';
import { IoOverheadLabPanel } from '../components/IoOverheadLabPanel';
import { LabSectionNav } from '../components/LabSectionNav';
import { MemoryExpansionLabPanel } from '../components/MemoryExpansionLabPanel';
import { MicroOperationsLabPanel } from '../components/MicroOperationsLabPanel';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

const PipelineLabPanel = lazy(() => import('../components/PipelineLabPanel').then((module) => ({ default: module.PipelineLabPanel })));

type LabTab = 'radix' | 'signed' | 'float32' | 'riscv' | 'datapath' | 'pipeline' | 'cache' | 'memory-expansion' | 'io-overhead' | 'micro-operations' | 'bus-bandwidth';

const labTabs = new Set<LabTab>(['radix', 'signed', 'float32', 'riscv', 'datapath', 'pipeline', 'cache', 'memory-expansion', 'io-overhead', 'micro-operations', 'bus-bandwidth']);
const relatedQuestionNumbers: Readonly<Record<LabTab, readonly number[]>> = {
  radix: [12],
  signed: [12],
  float32: [13],
  riscv: [17],
  datapath: [11, 16],
  pipeline: [18],
  cache: [14, 21],
  'memory-expansion': [15],
  'io-overhead': [43],
  'micro-operations': [44],
  'bus-bandwidth': [20],
};
const moduleLabels: Readonly<Record<LabTab, string>> = {
  radix: '位置计数制',
  signed: '有符号定点表示',
  float32: 'IEEE 754 binary32',
  riscv: 'RV32I 基础整数指令集',
  datapath: 'RV32I 单周期 IF / ID / EX / MEM / WB 数据路径',
  pipeline: '动态五级流水线 · 功能段时延 / 前递 / 停顿 / 冲刷',
  cache: '写回 · 写分配 · LRU 组相联 Cache',
  'memory-expansion': 'ROM / RAM 位扩展、字扩展与芯片矩阵',
  'io-overhead': '中断与 DMA 的 CPU 时间开销',
  'micro-operations': '16 位数据通路微操作与控制信号调度',
  'bus-bandwidth': '总线带宽与周期单位换算',
};

function isLabTab(value: string | null): value is LabTab {
  return value !== null && labTabs.has(value as LabTab);
}

function LabPanel({ tab }: { tab: LabTab }) {
  if (tab === 'radix') return <RadixPanel />;
  if (tab === 'signed') return <MachinePanel />;
  if (tab === 'float32') return <Float32Panel />;
  if (tab === 'riscv') return <RiscvPanel />;
  if (tab === 'datapath') return <DatapathLabPanel />;
  if (tab === 'pipeline') return <Suspense fallback={<div className="lab-control-panel pipeline-loading" aria-label="载入流水线实验"><div className="loader" /></div>}><PipelineLabPanel /></Suspense>;
  if (tab === 'cache') return <CacheLabPanel />;
  if (tab === 'memory-expansion') return <MemoryExpansionLabPanel />;
  if (tab === 'io-overhead') return <IoOverheadLabPanel />;
  if (tab === 'micro-operations') return <MicroOperationsLabPanel />;
  return <BusBandwidthLabPanel />;
}

const radices: Array<{ value: IntegerRadix; label: string }> = [
  { value: 2, label: '二进制' },
  { value: 8, label: '八进制' },
  { value: 10, label: '十进制' },
  { value: 16, label: '十六进制' },
];

const representations: Array<{ value: SignedIntegerRepresentation; label: string }> = [
  { value: 'sign-magnitude', label: '原码' },
  { value: 'ones-complement', label: '反码' },
  { value: 'twos-complement', label: '补码' },
];

const floatLabels: Record<Float32Info['classification'], string> = {
  'positive-zero': '+0',
  'negative-zero': '-0',
  subnormal: '非规格化数',
  normal: '规格化数',
  'positive-infinity': '+Infinity',
  'negative-infinity': '-Infinity',
  nan: 'NaN',
};

function errorText(error: NumberCoreError): string {
  const messages: Record<NumberCoreError['code'], string> = {
    'empty-input': '请输入数值。',
    'invalid-input': '输入格式无效。',
    'invalid-radix': '只支持 2、8、10、16 进制。',
    'invalid-digit': '输入包含当前进制不允许的数字。',
    'prefix-radix-mismatch': '数值前缀与选择的进制不一致。',
    'invalid-bit-width': '位宽无效。',
    'invalid-bit-string': '位串只能包含 0 和 1。',
    'bit-width-mismatch': '位串长度与当前位宽不一致。',
    'invalid-representation': '机器数表示法无效。',
    'out-of-range': '该真值超出当前表示法的可表示范围。',
  };
  return messages[error.code];
}

function resultValue<T>(result: NumberCoreResult<T>): T | null {
  return result.ok ? result.value : null;
}

function riscvErrorText(error: RiscvError): string {
  const messages: Record<RiscvError['code'], string> = {
    'empty-input': '请输入汇编指令。',
    'invalid-input': '输入格式无效。',
    'unknown-instruction': '当前只支持 RV32I 基础整数指令。',
    'operand-count': '操作数数量与指令格式不匹配。',
    'invalid-register': '寄存器必须是 x0 至 x31 或合法 ABI 别名。',
    'invalid-immediate': '立即数格式无效。',
    'immediate-out-of-range': error.details?.min !== undefined && error.details.max !== undefined
      ? `立即数必须在 ${error.details.min} 至 ${error.details.max} 之间。`
      : '立即数超出当前指令可编码范围。',
    'immediate-alignment': `分支与跳转立即数必须按 ${error.details?.alignment ?? 2} 字节对齐。`,
    'invalid-ast': '指令结构与规范汇编不一致。',
    'invalid-machine-code': '机器码必须是 0x 开头的 1 至 8 位十六进制数，或恰好 32 位二进制串。',
    'reserved-encoding': '该机器码使用了 RV32I 保留或不支持的编码。',
  };
  return messages[error.code];
}

function encodeAssemblyText(text: string): RiscvResult<EncodedInstruction> {
  const parsed = parseAssembly({ text });
  return parsed.ok ? encodeInstruction({ instruction: parsed.value }) : parsed;
}

function decodeMachineText(text: string): RiscvResult<EncodedInstruction> {
  const normalized = text.trim();
  if (/^0x/iu.test(normalized)) return decodeInstruction({ hex: normalized });
  if (/^[01]+$/u.test(normalized)) return decodeInstruction({ bits: normalized });
  return decodeInstruction({ hex: normalized });
}

function formatFloat(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return '+Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  if (Object.is(value, -0)) return '-0';
  return value.toString();
}

function parseFloatText(text: string): NumberCoreResult<number> {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return { ok: false, error: { code: 'empty-input', message: 'Float input cannot be empty.' } };
  if (normalized === 'nan') return { ok: true, value: Number.NaN };
  if (normalized === 'infinity' || normalized === '+infinity') return { ok: true, value: Number.POSITIVE_INFINITY };
  if (normalized === '-infinity') return { ok: true, value: Number.NEGATIVE_INFINITY };
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(normalized)) {
    return { ok: false, error: { code: 'invalid-input', message: 'Float input is malformed.' } };
  }
  return { ok: true, value: Number(normalized) };
}

function ExampleSelect({ label, examples, onSelect }: {
  label: string;
  examples: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <label className="select-field lab-example-select">
      <FlaskConical size={16} />
      <select aria-label={label} value="" onChange={(event) => onSelect(event.target.value)}>
        <option value="" disabled>典型例题</option>
        {examples.map((example) => <option key={example.value} value={example.value}>{example.label}</option>)}
      </select>
    </label>
  );
}

function BitStrip({ bits, label }: { bits: string; label: string }) {
  return (
    <div className="machine-bit-strip" role="img" aria-label={`${label}: ${bits}`}>
      {[...bits].map((bit, index) => (
        <span key={`${index}-${bit}`} className={index === 0 ? 'sign' : ''}>{bit}</span>
      ))}
    </div>
  );
}

function RadixPanel() {
  const [radix, setRadix] = useState<IntegerRadix>(10);
  const [input, setInput] = useState('255');
  const parsed = useMemo(() => parseInteger({ text: input, radix }), [input, radix]);
  const outputs = useMemo(() => {
    if (!parsed.ok) return [];
    return radices.map((item) => ({
      ...item,
      text: resultValue(formatInteger({
        value: parsed.value.value,
        radix: item.value,
        prefix: item.value !== 10,
        uppercase: item.value === 16,
      }))?.text ?? '',
    }));
  }, [parsed]);
  const steps = useMemo<ExplorerStep[]>(() => {
    if (!parsed.ok) return [];
    const accumulation = parsed.value.steps.map((step, index) => ({
      id: `digit-${step.index}`,
      label: `读取第 ${index + 1} 位 “${step.symbol}”`,
      value: `${index === 0 ? 0n : parsed.value.steps[index - 1]!.accumulator} × ${radix} + ${step.digitValue} = ${step.accumulator}`,
    }));
    return [
      ...accumulation,
      { id: 'decimal', label: '得到十进制真值', value: parsed.value.value.toString() },
      { id: 'formats', label: '格式化各进制', value: outputs.map((item) => item.text).join('  ·  ') },
    ];
  }, [outputs, parsed, radix]);

  return (
    <div className="lab-panel-grid">
      <section className="lab-control-panel">
        <div className="lab-control-heading"><div><span className="eyebrow">INPUT</span><h2>进制解析</h2></div><ExampleSelect label="选择进制转换例题" examples={[
          { value: '255', label: '255：边界换算' },
          { value: '-42', label: '-42：负数换算' },
          { value: '18446744073709551615', label: '2^64-1：大整数' },
        ]} onSelect={setInput} /></div>
        <div className="lab-field-row">
          <label className="lab-input-field"><span>输入进制</span><select value={radix} onChange={(event) => setRadix(Number(event.target.value) as IntegerRadix)}>{radices.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.value})</option>)}</select></label>
          <label className="lab-input-field grow"><span>数值</span><input value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} /></label>
        </div>
        {!parsed.ok ? <div className="lab-error" role="alert">{errorText(parsed.error)}</div> : (
          <div className="radix-output-list">
            {outputs.map((item) => <div key={item.value}><span>{item.label}</span><code>{item.text}</code></div>)}
          </div>
        )}
      </section>
      <StepExplorer key={`${radix}:${input}`} steps={steps} />
    </div>
  );
}

function MachinePanel() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [bitWidth, setBitWidth] = useState(8);
  const [decimal, setDecimal] = useState('-5');
  const [bits, setBits] = useState('11111011');
  const [representation, setRepresentation] = useState<SignedIntegerRepresentation>('twos-complement');
  const parsed = useMemo(() => parseInteger({ text: decimal, radix: 10 }), [decimal]);
  const encoded = useMemo(() => representations.map((item) => ({
    ...item,
    result: parsed.ok
      ? encodeSignedInteger({ value: parsed.value.value, bitWidth, representation: item.value })
      : null,
  })), [bitWidth, parsed]);
  const decoded = useMemo(
    () => decodeSignedInteger({ bits, bitWidth, representation }),
    [bitWidth, bits, representation],
  );

  const encodeSteps = useMemo<ExplorerStep[]>(() => {
    if (!parsed.ok) return [];
    const magnitude = parsed.value.value < 0n ? -parsed.value.value : parsed.value.value;
    return [
      { id: 'truth', label: '确认十进制真值', value: parsed.value.value.toString() },
      { id: 'magnitude', label: '展开绝对值', value: `${magnitude} = ${magnitude.toString(2)}₂` },
      ...encoded.map((entry) => ({
        id: entry.value,
        label: `${entry.label}范围检查与编码`,
        value: entry.result?.ok ? entry.result.value.bits : entry.result ? errorText(entry.result.error) : '',
      })),
    ];
  }, [encoded, parsed]);
  const decodeSteps = useMemo<ExplorerStep[]>(() => decoded.ok ? [
    { id: 'validate', label: '校验位串', value: `${bits.length} 位二进制` },
    { id: 'representation', label: `按${representations.find((item) => item.value === representation)!.label}解释`, value: `${decoded.value.signBit} | ${decoded.value.payloadBits}` },
    { id: 'truth', label: '恢复真值', value: decoded.value.negativeZero ? '-0' : decoded.value.value.toString() },
  ] : [], [bits, decoded, representation]);

  return (
    <div className="lab-panel-grid">
      <section className="lab-control-panel">
        <div className="lab-control-heading">
          <div><span className="eyebrow">SIGNED INTEGER</span><h2>定点机器数</h2></div>
          <ExampleSelect label="选择机器数例题" examples={mode === 'encode' ? [
            { value: '-5', label: '-5：三种机器数' },
            { value: '-128', label: '-128：8 位边界' },
            { value: '127', label: '127：正数上界' },
          ] : [
            { value: '11111011', label: '11111011：补码 -5' },
            { value: '10000000', label: '10000000：补码 -128' },
            { value: '11111111', label: '11111111：反码 -0' },
          ]} onSelect={mode === 'encode' ? setDecimal : setBits} />
        </div>
        <div className="lab-segment-row">
          <div className="segmented-control" aria-label="机器数转换方向"><button aria-pressed={mode === 'encode'} className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>真值 → 机器数</button><button aria-pressed={mode === 'decode'} className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>机器数 → 真值</button></div>
          <div className="segmented-control" aria-label="位宽选择">{[8, 16, 32].map((width) => <button key={width} aria-pressed={bitWidth === width} className={bitWidth === width ? 'active' : ''} onClick={() => setBitWidth(width)}>{width} bit</button>)}</div>
        </div>

        {mode === 'encode' ? (
          <>
            <label className="lab-input-field full"><span>十进制真值</span><input value={decimal} onChange={(event) => setDecimal(event.target.value)} inputMode="numeric" /></label>
            {!parsed.ok ? <div className="lab-error" role="alert">{errorText(parsed.error)}</div> : (
              <div className="machine-code-list">
                {encoded.map((entry) => (
                  <article key={entry.value}>
                    <div><strong>{entry.label}</strong>{entry.result?.ok && <small>{entry.result.value.range.min.toString()} 至 {entry.result.value.range.max.toString()}</small>}</div>
                    {entry.result?.ok ? <BitStrip bits={entry.result.value.bits} label={entry.label} /> : entry.result && <span className="machine-unavailable">不可表示</span>}
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="lab-field-row">
              <label className="lab-input-field"><span>表示法</span><select value={representation} onChange={(event) => setRepresentation(event.target.value as SignedIntegerRepresentation)}>{representations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="lab-input-field grow"><span>{bitWidth} 位机器数</span><input value={bits} onChange={(event) => setBits(event.target.value)} maxLength={bitWidth} inputMode="numeric" spellCheck={false} /></label>
            </div>
            {!decoded.ok ? <div className="lab-error" role="alert">{errorText(decoded.error)}</div> : (
              <div className="decoded-result"><BitStrip bits={decoded.value.bits} label="待解码机器数" /><span>十进制真值</span><strong>{decoded.value.negativeZero ? '-0' : decoded.value.value.toString()}</strong></div>
            )}
          </>
        )}
      </section>
      <StepExplorer key={`${mode}:${bitWidth}:${decimal}:${bits}:${representation}`} steps={mode === 'encode' ? encodeSteps : decodeSteps} />
    </div>
  );
}

function Float32Panel() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [decimal, setDecimal] = useState('1.5');
  const [bits, setBits] = useState('00111111110000000000000000000000');
  const parsed = useMemo(() => parseFloatText(decimal), [decimal]);
  const result = useMemo(() => mode === 'encode'
    ? parsed.ok ? encodeFloat32({ value: parsed.value }) : parsed
    : decodeFloat32({ bits }), [bits, mode, parsed]);
  const info = result.ok && typeof result.value === 'object' ? result.value as Float32Info : null;
  const steps = useMemo<ExplorerStep[]>(() => info ? [
    { id: 'stored', label: mode === 'encode' ? '舍入为 float32' : '读取 32 位字', value: `${formatFloat(info.value)}  ·  ${info.hex.toUpperCase()}` },
    { id: 'sign', label: '提取符号位', value: `${info.signBits} → ${info.sign === 0 ? '正' : '负'}` },
    { id: 'exponent', label: '解释阶码', value: `${info.exponentBits}₂ = ${info.exponentRaw}${info.unbiasedExponent === null ? '' : `，E = ${info.unbiasedExponent}`}` },
    { id: 'fraction', label: '读取尾数字段', value: `${info.fractionBits}₂` },
    { id: 'classify', label: '完成分类', value: `${floatLabels[info.classification]}  ·  ${info.bits}` },
  ] : [], [info, mode]);

  return (
    <div className="lab-panel-grid">
      <section className="lab-control-panel">
        <div className="lab-control-heading">
          <div><span className="eyebrow">IEEE 754 / BINARY32</span><h2>单精度浮点数</h2></div>
          <ExampleSelect label="选择 IEEE 754 例题" examples={mode === 'encode' ? [
            { value: '1.5', label: '1.5：规格化数' },
            { value: '-0', label: '-0：符号零' },
            { value: 'Infinity', label: '+Infinity：无穷' },
            { value: 'NaN', label: 'NaN：非数' },
          ] : [
            { value: '00111111110000000000000000000000', label: '0x3FC00000：1.5' },
            { value: '00000000000000000000000000000001', label: '最小正非规格化数' },
            { value: '11111111100000000000000000000000', label: '-Infinity' },
          ]} onSelect={mode === 'encode' ? setDecimal : setBits} />
        </div>
        <div className="lab-segment-row">
          <div className="segmented-control" aria-label="浮点转换方向"><button aria-pressed={mode === 'encode'} className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>十进制 → 位串</button><button aria-pressed={mode === 'decode'} className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>位串 → 十进制</button></div>
          <span className="precision-label">binary32 · 1 + 8 + 23 bit</span>
        </div>
        <label className="lab-input-field full"><span>{mode === 'encode' ? '十进制数值' : '32 位二进制串'}</span><input value={mode === 'encode' ? decimal : bits} onChange={(event) => mode === 'encode' ? setDecimal(event.target.value) : setBits(event.target.value)} maxLength={mode === 'decode' ? 32 : undefined} spellCheck={false} /></label>
        {!result.ok ? <div className="lab-error" role="alert">{errorText(result.error)}</div> : info && (
          <>
            <div className="ieee-field-strip" role="img" aria-label={`符号位 ${info.signBits}，阶码 ${info.exponentBits}，尾数 ${info.fractionBits}`}>
              <div className="ieee-sign"><span>符号 S</span><code>{info.signBits}</code></div>
              <div className="ieee-exponent"><span>阶码 E</span><code>{info.exponentBits}</code></div>
              <div className="ieee-fraction"><span>尾数 M</span><code>{info.fractionBits}</code></div>
            </div>
            <dl className="ieee-facts">
              <div><dt>存储值</dt><dd>{formatFloat(info.value)}</dd></div>
              <div><dt>类别</dt><dd>{floatLabels[info.classification]}</dd></div>
              <div><dt>阶码真值</dt><dd>{info.unbiasedExponent ?? '--'}</dd></div>
              <div><dt>十六进制</dt><dd>{info.hex.toUpperCase()}</dd></div>
            </dl>
          </>
        )}
      </section>
      <StepExplorer key={`${mode}:${decimal}:${bits}`} steps={steps} />
    </div>
  );
}

interface RiscvSegment {
  name: string;
  msb: number;
  lsb: number;
  bits: string;
}

function riscvSegments(result: EncodedInstruction): RiscvSegment[] {
  const specs: Array<[string, number, number]> = result.fields.format === 'R'
    ? [['funct7', 31, 25], ['rs2', 24, 20], ['rs1', 19, 15], ['funct3', 14, 12], ['rd', 11, 7], ['opcode', 6, 0]]
    : result.fields.format === 'I'
      ? [['imm[11:0]', 31, 20], ['rs1', 19, 15], ['funct3', 14, 12], ['rd', 11, 7], ['opcode', 6, 0]]
      : result.fields.format === 'S'
        ? [['imm[11:5]', 31, 25], ['rs2', 24, 20], ['rs1', 19, 15], ['funct3', 14, 12], ['imm[4:0]', 11, 7], ['opcode', 6, 0]]
        : result.fields.format === 'B'
          ? [['imm[12|10:5]', 31, 25], ['rs2', 24, 20], ['rs1', 19, 15], ['funct3', 14, 12], ['imm[4:1|11]', 11, 7], ['opcode', 6, 0]]
          : result.fields.format === 'U'
            ? [['imm[31:12]', 31, 12], ['rd', 11, 7], ['opcode', 6, 0]]
            : [['imm[20|10:1|11|19:12]', 31, 12], ['rd', 11, 7], ['opcode', 6, 0]];
  return specs.map(([name, msb, lsb]) => ({
    name,
    msb,
    lsb,
    bits: result.bits.slice(31 - msb, 32 - lsb),
  }));
}

function RiscvFieldRuler({ result }: { result: EncodedInstruction }) {
  const segments = riscvSegments(result);
  return (
    <div className="riscv-ruler-scroll">
      <div className="riscv-field-ruler" role="img" aria-label={`${result.fields.format} 型指令位字段：${segments.map((segment) => `${segment.name} ${segment.bits}`).join('，')}`}>
        <div className="riscv-bit-scale"><span>31</span><span>24</span><span>16</span><span>8</span><span>0</span></div>
        <div className="riscv-segments">
          {segments.map((segment, index) => (
            <div
              key={`${segment.name}-${segment.msb}`}
              className={`riscv-segment tone-${index % 4}`}
              data-field={segment.name}
              style={{ gridColumn: `span ${segment.msb - segment.lsb + 1}` }}
            >
              <span>{segment.name}</span>
              <code>{segment.bits}</code>
              <small>{segment.msb === segment.lsb ? segment.msb : `${segment.msb}:${segment.lsb}`}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiscvPanel() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [assembly, setAssembly] = useState('add x1, x2, x3');
  const [machineCode, setMachineCode] = useState('0x003100b3');
  const result = useMemo(
    () => mode === 'encode' ? encodeAssemblyText(assembly) : decodeMachineText(machineCode),
    [assembly, machineCode, mode],
  );
  const encoded = result.ok ? result.value : null;
  const steps = useMemo<ExplorerStep[]>(() => {
    if (!encoded) return [];
    const instruction = encoded.instruction;
    const operandSummary = [
      instruction.rd === null ? null : `rd=x${instruction.rd}`,
      instruction.rs1 === null ? null : `rs1=x${instruction.rs1}`,
      instruction.rs2 === null ? null : `rs2=x${instruction.rs2}`,
      instruction.immediate === null ? null : `imm=${instruction.immediate}`,
    ].filter(Boolean).join(' · ');
    return mode === 'encode' ? [
      { id: 'parse', label: '词法解析并规范化', value: encoded.canonicalAssembly },
      { id: 'format', label: `选择 ${encoded.fields.format} 型格式`, value: operandSummary },
      { id: 'fields', label: '填入指令字段', value: riscvSegments(encoded).map((segment) => `${segment.name}=${segment.bits}`).join(' · ') },
      { id: 'compose', label: '拼接 32 位指令字', value: encoded.bits },
      { id: 'hex', label: '转为十六进制', value: encoded.hex },
    ] : [
      { id: 'validate', label: '校验 32 位机器码', value: `${encoded.bits} · ${encoded.hex}` },
      { id: 'opcode', label: '读取 opcode 并选择格式', value: `${encoded.fields.opcode.bits} → ${encoded.fields.format} 型` },
      { id: 'fields', label: '拆出寄存器与立即数', value: operandSummary },
      { id: 'assembly', label: '恢复规范汇编', value: encoded.canonicalAssembly },
    ];
  }, [encoded, mode]);

  const examples = mode === 'encode' ? [
    { value: 'add x1, x2, x3', label: 'add：R 型寄存器运算' },
    { value: 'addi x1, x2, -1', label: 'addi：I 型负立即数' },
    { value: 'lw x5, -4(x6)', label: 'lw：基址加偏移' },
    { value: 'sw x5, 12(x6)', label: 'sw：S 型分散立即数' },
    { value: 'beq x1, x2, 16', label: 'beq：B 型分支位移' },
    { value: 'lui x5, 0x12345', label: 'lui：U 型高位立即数' },
    { value: 'jal x1, 8', label: 'jal：J 型跳转位移' },
  ] : [
    { value: '0x003100b3', label: '0x003100b3：add' },
    { value: '0xfff10093', label: '0xfff10093：addi -1' },
    { value: '0xffc32283', label: '0xffc32283：lw -4(x6)' },
    { value: '0x00532623', label: '0x00532623：sw 12(x6)' },
    { value: '0x00208863', label: '0x00208863：beq +16' },
  ];

  return (
    <div className="lab-panel-grid">
      <section className="lab-control-panel">
        <div className="lab-control-heading">
          <div><span className="eyebrow">RV32I / ENCODING</span><h2>RV32I 指令编码</h2></div>
          <ExampleSelect label="选择 RV32I 例题" examples={examples} onSelect={mode === 'encode' ? setAssembly : setMachineCode} />
        </div>
        <div className="lab-segment-row">
          <div className="segmented-control" aria-label="RV32I 转换方向">
            <button aria-pressed={mode === 'encode'} className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>汇编 → 机器码</button>
            <button aria-pressed={mode === 'decode'} className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>机器码 → 汇编</button>
          </div>
          <span className="precision-label">RV32I · 32 bit · little-endian independent</span>
        </div>
        <label className="lab-input-field full">
          <span>{mode === 'encode' ? '汇编指令' : '32 位机器码'}</span>
          <input
            aria-label={mode === 'encode' ? '汇编指令' : '32 位机器码'}
            value={mode === 'encode' ? assembly : machineCode}
            onChange={(event) => mode === 'encode' ? setAssembly(event.target.value) : setMachineCode(event.target.value)}
            spellCheck={false}
          />
        </label>
        {!result.ok ? <div className="lab-error" role="alert">{riscvErrorText(result.error)}</div> : encoded && (
          <>
            <div className="riscv-result-code">
              <span>{encoded.fields.format} 型 · {encoded.instruction.mnemonic.toUpperCase()}</span>
              <strong>{mode === 'encode' ? encoded.hex : encoded.canonicalAssembly}</strong>
              <code>{mode === 'encode' ? encoded.canonicalAssembly : encoded.hex}</code>
            </div>
            <RiscvFieldRuler result={encoded} />
          </>
        )}
      </section>
      <StepExplorer key={`${mode}:${assembly}:${machineCode}`} steps={steps} />
    </div>
  );
}

export function CpuLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('module');
  const preset = searchParams.get('preset');
  const tab: LabTab = isLabTab(requestedTab)
    ? requestedTab
    : requestedTab === null
      ? preset === 'cn408-2009-q15'
        ? 'memory-expansion'
        : preset === 'cn408-2009-q43'
            ? 'io-overhead'
            : preset === 'cn408-2009-q44'
              ? 'micro-operations'
            : preset === 'cn408-2009-q20'
              ? 'bus-bandwidth'
          : 'radix'
      : 'radix';
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const relatedQuestionIds = useMemo(() => {
    const numbers = relatedQuestionNumbers[tab];
    return questions
      .filter((question) => question.year === 2009 && numbers.includes(question.number))
      .map((question) => question.id);
  }, [questions, tab]);

  const selectTab = (nextTab: LabTab) => {
    setSearchParams(
      nextTab === 'radix'
        ? {}
        : nextTab === 'memory-expansion'
          ? { module: nextTab, preset: 'cn408-2009-q15' }
        : nextTab === 'io-overhead'
          ? { module: nextTab, preset: 'cn408-2009-q43' }
        : nextTab === 'micro-operations'
          ? { module: nextTab, preset: 'cn408-2009-q44', schedule: 'parallel-5' }
          : nextTab === 'bus-bandwidth'
            ? { module: nextTab, preset: 'cn408-2009-q20' }
          : { module: nextTab },
      { replace: true },
    );
  };

  const practiceRelated = async () => {
    if (!relatedQuestionIds.length || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession(relatedQuestionIds, 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : '相关真题创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page cpu-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">CPU LAB / CORE</span><h1>CPU 可视化实验室</h1><p>从机器表示、RV32I 指令执行、流水线冒险、Cache 访存到微操作与 I/O 开销的逐步推导。</p></div>
        {relatedQuestionIds.length > 0 && <button className="secondary-command" disabled={starting} onClick={() => void practiceRelated()}><BookOpenCheck size={17} />{starting ? '创建中' : `相关真题 ${relatedQuestionIds.length} 题`}</button>}
      </header>
      <LabSectionNav />
      {startError && <div className="status-message error" role="alert">{startError}</div>}
      <nav className="lab-tabs cpu-lab-tabs" aria-label="实验类型">
        <button aria-pressed={tab === 'radix'} className={tab === 'radix' ? 'active' : ''} onClick={() => selectTab('radix')}><Binary size={17} /><span>进制转换</span></button>
        <button aria-pressed={tab === 'signed'} className={tab === 'signed' ? 'active' : ''} onClick={() => selectTab('signed')}><Rows3 size={17} /><span>原码 / 反码 / 补码</span></button>
        <button aria-pressed={tab === 'float32'} className={tab === 'float32' ? 'active' : ''} onClick={() => selectTab('float32')}><Braces size={17} /><span>IEEE 754</span></button>
        <button aria-pressed={tab === 'riscv'} className={tab === 'riscv' ? 'active' : ''} onClick={() => selectTab('riscv')}><Code2 size={17} /><span>RV32I 指令</span></button>
        <button aria-pressed={tab === 'datapath'} className={tab === 'datapath' ? 'active' : ''} onClick={() => selectTab('datapath')}><CircuitBoard size={17} /><span>单周期数据通路</span></button>
        <button aria-pressed={tab === 'pipeline'} className={tab === 'pipeline' ? 'active' : ''} onClick={() => selectTab('pipeline')}><Workflow size={17} /><span>五级流水线</span></button>
        <button aria-pressed={tab === 'cache'} className={tab === 'cache' ? 'active' : ''} onClick={() => selectTab('cache')}><HardDrive size={17} /><span>Cache 映射</span></button>
        <button aria-pressed={tab === 'memory-expansion'} className={tab === 'memory-expansion' ? 'active' : ''} onClick={() => selectTab('memory-expansion')}><MemoryStick size={17} /><span>存储扩展</span></button>
        <button aria-pressed={tab === 'io-overhead'} className={tab === 'io-overhead' ? 'active' : ''} onClick={() => selectTab('io-overhead')}><Activity size={17} /><span>I/O 开销</span></button>
        <button aria-pressed={tab === 'micro-operations'} className={tab === 'micro-operations' ? 'active' : ''} onClick={() => selectTab('micro-operations')}><Workflow size={17} /><span>微操作调度</span></button>
        <button aria-pressed={tab === 'bus-bandwidth'} className={tab === 'bus-bandwidth' ? 'active' : ''} onClick={() => selectTab('bus-bandwidth')}><Gauge size={17} /><span>总线带宽</span></button>
      </nav>
      <div className="lab-module-heading"><Cpu size={18} /><span>{moduleLabels[tab]}</span><Play size={14} /></div>
      <LabPanel tab={tab} />
    </div>
  );
}
