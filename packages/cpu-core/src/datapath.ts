import type {
  BTypeMnemonic,
  EncodedInstruction,
  InstructionAst,
  ITypeMnemonic,
  RTypeMnemonic,
  Rv32iMnemonic,
} from './riscv';

export type DatapathErrorCode =
  | 'invalid-instruction'
  | 'invalid-pc'
  | 'invalid-register-value'
  | 'invalid-memory-value';

export interface DatapathError {
  code: DatapathErrorCode;
  message: string;
}

export type DatapathResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: DatapathError };

export type AluOperation =
  | 'add'
  | 'sub'
  | 'and'
  | 'or'
  | 'xor'
  | 'sll'
  | 'srl'
  | 'sra'
  | 'slt'
  | 'sltu'
  | 'copy-b';

export type BranchCondition = 'eq' | 'ne' | 'lt' | 'ge' | 'ltu' | 'geu';
export type AluSourceA = 'rs1' | 'pc' | 'zero';
export type AluSourceB = 'rs2' | 'immediate' | 'upper-immediate';
export type WritebackSource = 'alu' | 'memory' | 'pc+4' | 'none';
export type PcSource = 'sequential' | 'branch' | 'jump' | 'jump-register';
export type MemoryWidth = 8 | 16 | 32;

export interface SingleCycleControl {
  aluOperation: AluOperation;
  aluSourceA: AluSourceA;
  aluSourceB: AluSourceB;
  regWrite: boolean;
  memoryRead: boolean;
  memoryWrite: boolean;
  memoryWidth: MemoryWidth | null;
  memoryUnsigned: boolean;
  branchCondition: BranchCondition | null;
  writebackSource: WritebackSource;
  pcSource: PcSource;
}

export interface ExecuteSingleCycleInput {
  instruction: EncodedInstruction;
  pc: number;
  rs1Value: number;
  rs2Value: number;
  memoryReadValue: number;
}

export interface FetchStage {
  pc: number;
  instructionWord: number;
  instructionHex: string;
  sequentialNextPc: number;
}

export interface DecodeStage {
  mnemonic: Rv32iMnemonic;
  canonicalAssembly: string;
  rs1: number | null;
  rs2: number | null;
  rd: number | null;
  rs1Value: number;
  rs2Value: number;
  immediate: number | null;
  executionImmediate: number;
}

export interface ExecuteStage {
  inputA: number;
  inputB: number;
  operation: AluOperation;
  result: number;
  branchTaken: boolean;
  branchTarget: number | null;
  jumpTarget: number | null;
}

export interface MemoryStage {
  address: number;
  read: boolean;
  write: boolean;
  width: MemoryWidth | null;
  unsignedLoad: boolean;
  rawReadValue: number;
  readValue: number | null;
  writeValue: number | null;
  misaligned: boolean;
}

export interface WritebackStage {
  requested: boolean;
  enabled: boolean;
  suppressedByX0: boolean;
  source: WritebackSource;
  register: number | null;
  value: number | null;
}

export interface DatapathStageSignal {
  name: string;
  value: string;
}

export interface DatapathStage {
  id: 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';
  label: string;
  signals: readonly DatapathStageSignal[];
}

export interface SingleCycleResult {
  nextPc: number;
  registerWrite: { register: number; value: number } | null;
  memoryWrite: { address: number; width: MemoryWidth; value: number } | null;
}

export interface SingleCycleTrace {
  instruction: EncodedInstruction;
  control: SingleCycleControl;
  fetch: FetchStage;
  decode: DecodeStage;
  execute: ExecuteStage;
  memory: MemoryStage;
  writeback: WritebackStage;
  stages: readonly DatapathStage[];
  result: SingleCycleResult;
}

const R_TYPE_ALU: Record<RTypeMnemonic, AluOperation> = {
  add: 'add',
  sub: 'sub',
  and: 'and',
  or: 'or',
  xor: 'xor',
  sll: 'sll',
  srl: 'srl',
  sra: 'sra',
  slt: 'slt',
  sltu: 'sltu',
};

const I_TYPE_ALU: Partial<Record<ITypeMnemonic, AluOperation>> = {
  addi: 'add',
  andi: 'and',
  ori: 'or',
  xori: 'xor',
  slti: 'slt',
  sltiu: 'sltu',
  slli: 'sll',
  srli: 'srl',
  srai: 'sra',
};

const BRANCH_CONDITION: Record<BTypeMnemonic, BranchCondition> = {
  beq: 'eq',
  bne: 'ne',
  blt: 'lt',
  bge: 'ge',
  bltu: 'ltu',
  bgeu: 'geu',
};

function success<T>(value: T): DatapathResult<T> {
  return { ok: true, value };
}

function failure(code: DatapathErrorCode, message: string): DatapathResult<never> {
  return { ok: false, error: { code, message } };
}

function isUint32(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function u32(value: number): number {
  return value >>> 0;
}

function signed(value: number): number {
  return value | 0;
}

function formatHex(value: number): string {
  return `0x${u32(value).toString(16).padStart(8, '0')}`;
}

function memoryWidth(mnemonic: Rv32iMnemonic): MemoryWidth | null {
  if (mnemonic === 'lb' || mnemonic === 'lbu' || mnemonic === 'sb') return 8;
  if (mnemonic === 'lh' || mnemonic === 'lhu' || mnemonic === 'sh') return 16;
  if (mnemonic === 'lw' || mnemonic === 'sw') return 32;
  return null;
}

function controlFor(ast: InstructionAst): SingleCycleControl {
  const base: SingleCycleControl = {
    aluOperation: 'add',
    aluSourceA: 'rs1',
    aluSourceB: 'rs2',
    regWrite: false,
    memoryRead: false,
    memoryWrite: false,
    memoryWidth: null,
    memoryUnsigned: false,
    branchCondition: null,
    writebackSource: 'none',
    pcSource: 'sequential',
  };

  if (ast.format === 'R') {
    return { ...base, aluOperation: R_TYPE_ALU[ast.mnemonic], regWrite: true, writebackSource: 'alu' };
  }

  if (ast.format === 'I') {
    const operation = I_TYPE_ALU[ast.mnemonic];
    if (operation) {
      return {
        ...base,
        aluOperation: operation,
        aluSourceB: 'immediate',
        regWrite: true,
        writebackSource: 'alu',
      };
    }
    if (ast.mnemonic === 'jalr') {
      return {
        ...base,
        aluSourceB: 'immediate',
        regWrite: true,
        writebackSource: 'pc+4',
        pcSource: 'jump-register',
      };
    }
    return {
      ...base,
      aluSourceB: 'immediate',
      regWrite: true,
      memoryRead: true,
      memoryWidth: memoryWidth(ast.mnemonic),
      memoryUnsigned: ast.mnemonic === 'lbu' || ast.mnemonic === 'lhu',
      writebackSource: 'memory',
    };
  }

  if (ast.format === 'S') {
    return {
      ...base,
      aluSourceB: 'immediate',
      memoryWrite: true,
      memoryWidth: memoryWidth(ast.mnemonic),
    };
  }

  if (ast.format === 'B') {
    return {
      ...base,
      aluOperation: 'sub',
      branchCondition: BRANCH_CONDITION[ast.mnemonic],
      pcSource: 'branch',
    };
  }

  if (ast.format === 'U') {
    return ast.mnemonic === 'lui'
      ? {
          ...base,
          aluOperation: 'copy-b',
          aluSourceA: 'zero',
          aluSourceB: 'upper-immediate',
          regWrite: true,
          writebackSource: 'alu',
        }
      : {
          ...base,
          aluSourceA: 'pc',
          aluSourceB: 'upper-immediate',
          regWrite: true,
          writebackSource: 'alu',
        };
  }

  return {
    ...base,
    aluSourceA: 'pc',
    aluSourceB: 'immediate',
    regWrite: true,
    writebackSource: 'pc+4',
    pcSource: 'jump',
  };
}

function alu(operation: AluOperation, left: number, right: number): number {
  const shift = right & 0x1f;
  if (operation === 'add') return u32(left + right);
  if (operation === 'sub') return u32(left - right);
  if (operation === 'and') return u32(left & right);
  if (operation === 'or') return u32(left | right);
  if (operation === 'xor') return u32(left ^ right);
  if (operation === 'sll') return u32(left << shift);
  if (operation === 'srl') return left >>> shift;
  if (operation === 'sra') return u32(signed(left) >> shift);
  if (operation === 'slt') return signed(left) < signed(right) ? 1 : 0;
  if (operation === 'sltu') return left < right ? 1 : 0;
  return right;
}

function branchMatches(condition: BranchCondition | null, left: number, right: number): boolean {
  if (condition === 'eq') return left === right;
  if (condition === 'ne') return left !== right;
  if (condition === 'lt') return signed(left) < signed(right);
  if (condition === 'ge') return signed(left) >= signed(right);
  if (condition === 'ltu') return left < right;
  if (condition === 'geu') return left >= right;
  return false;
}

function extendLoad(raw: number, width: MemoryWidth, unsigned: boolean): number {
  if (width === 32) return raw;
  const mask = width === 8 ? 0xff : 0xffff;
  const narrowed = raw & mask;
  if (unsigned) return narrowed;
  const shift = 32 - width;
  return u32((narrowed << shift) >> shift);
}

function maskStore(value: number, width: MemoryWidth): number {
  if (width === 8) return value & 0xff;
  if (width === 16) return value & 0xffff;
  return value;
}

function executionImmediate(ast: InstructionAst): number {
  if (ast.immediate === null) return 0;
  return ast.format === 'U' ? u32(ast.immediate * 4096) : u32(ast.immediate);
}

function sourceA(control: SingleCycleControl, pc: number, rs1Value: number): number {
  if (control.aluSourceA === 'pc') return pc;
  if (control.aluSourceA === 'zero') return 0;
  return rs1Value;
}

function sourceB(control: SingleCycleControl, immediate: number, rs2Value: number): number {
  return control.aluSourceB === 'rs2' ? rs2Value : immediate;
}

export function executeSingleCycle(input: ExecuteSingleCycleInput): DatapathResult<SingleCycleTrace> {
  if (typeof input !== 'object' || input === null || typeof input.instruction !== 'object'
    || input.instruction === null || typeof input.instruction.word !== 'number'
    || typeof input.instruction.hex !== 'string' || typeof input.instruction.instruction !== 'object') {
    return failure('invalid-instruction', 'Single-cycle execution requires an encoded RV32I instruction.');
  }
  if (!isUint32(input.pc)) return failure('invalid-pc', 'PC must be an unsigned 32-bit integer.');
  if (!isUint32(input.rs1Value) || !isUint32(input.rs2Value)) {
    return failure('invalid-register-value', 'Register inputs must be unsigned 32-bit integers.');
  }
  if (!isUint32(input.memoryReadValue)) {
    return failure('invalid-memory-value', 'Memory read value must be an unsigned 32-bit integer.');
  }

  const ast = input.instruction.instruction;
  const control = controlFor(ast);
  const sequentialNextPc = u32(input.pc + 4);
  const immediate = executionImmediate(ast);
  const inputA = sourceA(control, input.pc, input.rs1Value);
  const inputB = sourceB(control, immediate, input.rs2Value);
  const aluResult = alu(control.aluOperation, inputA, inputB);
  const branchTaken = branchMatches(control.branchCondition, input.rs1Value, input.rs2Value);
  const branchTarget = ast.format === 'B' ? u32(input.pc + ast.immediate) : null;
  const jumpTarget = control.pcSource === 'jump'
    ? aluResult
    : control.pcSource === 'jump-register'
      ? aluResult & 0xffff_fffe
      : null;
  const width = control.memoryWidth;
  const readValue = control.memoryRead && width !== null
    ? extendLoad(input.memoryReadValue, width, control.memoryUnsigned)
    : null;
  const writeValue = control.memoryWrite && width !== null ? maskStore(input.rs2Value, width) : null;
  const misaligned = width !== null && width > 8 && aluResult % (width / 8) !== 0;
  const rd = ast.rd;
  const writebackValue = control.writebackSource === 'alu'
    ? aluResult
    : control.writebackSource === 'memory'
      ? readValue
      : control.writebackSource === 'pc+4'
        ? sequentialNextPc
        : null;
  const requestedWrite = control.regWrite && rd !== null && writebackValue !== null;
  const enabledWrite = requestedWrite && rd !== 0;
  const nextPc = control.pcSource === 'branch'
    ? branchTaken && branchTarget !== null ? branchTarget : sequentialNextPc
    : jumpTarget ?? sequentialNextPc;

  const fetch: FetchStage = {
    pc: input.pc,
    instructionWord: input.instruction.word,
    instructionHex: input.instruction.hex,
    sequentialNextPc,
  };
  const decode: DecodeStage = {
    mnemonic: ast.mnemonic,
    canonicalAssembly: ast.canonicalAssembly,
    rs1: ast.rs1,
    rs2: ast.rs2,
    rd: ast.rd,
    rs1Value: input.rs1Value,
    rs2Value: input.rs2Value,
    immediate: ast.immediate,
    executionImmediate: immediate,
  };
  const execute: ExecuteStage = {
    inputA,
    inputB,
    operation: control.aluOperation,
    result: aluResult,
    branchTaken,
    branchTarget,
    jumpTarget,
  };
  const memory: MemoryStage = {
    address: aluResult,
    read: control.memoryRead,
    write: control.memoryWrite,
    width,
    unsignedLoad: control.memoryUnsigned,
    rawReadValue: input.memoryReadValue,
    readValue,
    writeValue,
    misaligned,
  };
  const writeback: WritebackStage = {
    requested: requestedWrite,
    enabled: enabledWrite,
    suppressedByX0: requestedWrite && rd === 0,
    source: control.writebackSource,
    register: rd,
    value: writebackValue,
  };
  const result: SingleCycleResult = {
    nextPc,
    registerWrite: enabledWrite && rd !== null && writebackValue !== null
      ? { register: rd, value: writebackValue }
      : null,
    memoryWrite: control.memoryWrite && width !== null && writeValue !== null
      ? { address: aluResult, width, value: writeValue }
      : null,
  };
  const stages: readonly DatapathStage[] = [
    {
      id: 'IF',
      label: '取指',
      signals: [
        { name: 'PC', value: formatHex(fetch.pc) },
        { name: 'Instruction', value: fetch.instructionHex },
        { name: 'PC + 4', value: formatHex(fetch.sequentialNextPc) },
      ],
    },
    {
      id: 'ID',
      label: '译码 / 读寄存器',
      signals: [
        { name: 'Assembly', value: decode.canonicalAssembly },
        { name: 'rs1', value: decode.rs1 === null ? 'unused' : `x${decode.rs1} = ${formatHex(decode.rs1Value)}` },
        { name: 'rs2', value: decode.rs2 === null ? 'unused' : `x${decode.rs2} = ${formatHex(decode.rs2Value)}` },
        { name: 'Immediate', value: formatHex(decode.executionImmediate) },
      ],
    },
    {
      id: 'EX',
      label: '执行 / 地址计算',
      signals: [
        { name: 'ALU A', value: formatHex(execute.inputA) },
        { name: 'ALU B', value: formatHex(execute.inputB) },
        { name: 'ALU result', value: formatHex(execute.result) },
        { name: 'Branch', value: control.pcSource === 'branch' ? (execute.branchTaken ? 'taken' : 'not taken') : 'not a branch' },
      ],
    },
    {
      id: 'MEM',
      label: '访存',
      signals: [
        { name: 'Address', value: formatHex(memory.address) },
        { name: 'Read', value: memory.readValue === null ? 'disabled' : formatHex(memory.readValue) },
        { name: 'Write', value: memory.writeValue === null ? 'disabled' : formatHex(memory.writeValue) },
        { name: 'Alignment', value: memory.misaligned ? 'misaligned' : 'aligned' },
      ],
    },
    {
      id: 'WB',
      label: '写回 / 更新 PC',
      signals: [
        { name: 'Register', value: writeback.register === null ? 'none' : `x${writeback.register}` },
        { name: 'Writeback', value: writeback.value === null ? 'disabled' : formatHex(writeback.value) },
        { name: 'Commit', value: writeback.enabled ? 'enabled' : writeback.suppressedByX0 ? 'suppressed by x0' : 'disabled' },
        { name: 'Next PC', value: formatHex(result.nextPc) },
      ],
    },
  ];

  return success({ instruction: input.instruction, control, fetch, decode, execute, memory, writeback, stages, result });
}
