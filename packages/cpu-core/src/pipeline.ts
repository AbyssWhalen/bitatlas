import {
  decodeInstruction,
  encodeInstruction,
  parseAssembly,
  type EncodedInstruction,
  type InstructionAst,
} from './riscv';

export type PipelineMnemonic = 'add' | 'sub' | 'addi' | 'lw' | 'sw' | 'beq';
export type PipelineTermination = 'drained' | 'max-cycles';
export type PipelineStageId = 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';
export type PipelineStageStatus = 'active' | 'stalled' | 'flushed' | 'bubble';
export type PipelineForwardingSource = 'EX/MEM' | 'MEM/WB';

export type PipelineErrorCode =
  | 'invalid-input'
  | 'empty-program'
  | 'program-too-large'
  | 'invalid-instruction'
  | 'unsupported-instruction'
  | 'invalid-register'
  | 'invalid-register-value'
  | 'duplicate-register'
  | 'invalid-memory-address'
  | 'invalid-memory-value'
  | 'duplicate-memory-address'
  | 'invalid-max-cycles'
  | 'invalid-forwarding'
  | 'invalid-stage-count'
  | 'invalid-stage-delay'
  | 'invalid-register-overhead'
  | 'invalid-instruction-count'
  | 'timing-overflow';

export interface PipelineError {
  code: PipelineErrorCode;
  message: string;
  details?: Readonly<Record<string, string | number>>;
}

export type PipelineResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PipelineError };

export interface PipelineRegisterValue {
  register: number;
  value: number;
}

export interface PipelineMemoryWord {
  address: number;
  value: number;
}

export interface SimulateFiveStagePipelineInput {
  program: readonly (string | EncodedInstruction)[];
  initialRegisters?: readonly PipelineRegisterValue[];
  initialMemory?: readonly PipelineMemoryWord[];
  forwarding?: boolean;
  maxCycles?: number;
}

export interface PipelineProgramInstruction {
  programIndex: number;
  pc: number;
  instruction: EncodedInstruction;
}

export interface PipelineInstructionRef {
  instanceId: number;
  programIndex: number;
  pc: number;
  mnemonic: PipelineMnemonic;
  canonicalAssembly: string;
  word: number;
  hex: string;
}

export interface PipelineStageState {
  id: PipelineStageId;
  label: string;
  status: PipelineStageStatus;
  instruction: PipelineInstructionRef | null;
}

export interface PipelineForwardingEvent {
  source: PipelineForwardingSource;
  target: 'EX';
  operand: 'rs1' | 'rs2';
  register: number;
  value: number;
  producer: PipelineInstructionRef;
  consumer: PipelineInstructionRef;
}

export interface PipelineStallEvent {
  kind: 'load-use' | 'raw';
  register: number;
  producerStage: 'EX' | 'MEM';
  producer: PipelineInstructionRef;
  consumer: PipelineInstructionRef;
}

export interface PipelineFlushEvent {
  kind: 'taken-branch';
  branch: PipelineInstructionRef;
  targetPc: number;
  flushed: readonly PipelineInstructionRef[];
}

export interface PipelineRegisterWriteEvent {
  instruction: PipelineInstructionRef;
  register: number;
  value: number;
  suppressedByX0: boolean;
}

export interface PipelineMemoryAccessEvent {
  instruction: PipelineInstructionRef;
  operation: 'read' | 'write';
  address: number;
  value: number;
  misaligned: boolean;
}

export interface PipelineCycleEvents {
  forwarding: readonly PipelineForwardingEvent[];
  stall: PipelineStallEvent | null;
  flush: PipelineFlushEvent | null;
  registerWrite: readonly PipelineRegisterWriteEvent[];
  memoryAccess: readonly PipelineMemoryAccessEvent[];
}

export interface PipelineCycleTrace {
  cycle: number;
  stages: readonly PipelineStageState[];
  events: PipelineCycleEvents;
  nextFetchPc: number;
}

export interface PipelineSummary {
  cycles: number;
  retired: number;
  stalls: number;
  flushes: number;
  flushedInstructions: number;
  forwardings: number;
  registerWrites: number;
  memoryReads: number;
  memoryWrites: number;
}

export interface PipelineTrace {
  program: readonly PipelineProgramInstruction[];
  forwarding: boolean;
  maxCycles: number;
  initialRegisters: readonly number[];
  initialMemory: readonly PipelineMemoryWord[];
  termination: PipelineTermination;
  cycles: readonly PipelineCycleTrace[];
  finalRegisters: readonly number[];
  finalMemory: readonly PipelineMemoryWord[];
  summary: PipelineSummary;
}

export interface PipelinePreset {
  id: 'alu-forwarding-chain' | 'load-use-stall' | 'taken-branch-flush';
  label: string;
  description: string;
  program: readonly string[];
  initialRegisters: readonly PipelineRegisterValue[];
  initialMemory: readonly PipelineMemoryWord[];
  forwarding: boolean;
}

export interface PipelineStageTimingInput {
  stageDelaysNs: readonly number[];
  registerOverheadNs?: number;
  instructionCount: number;
}

export interface PipelineStageTimingAnalysis {
  stageDelaysNs: readonly number[];
  registerOverheadNs: number;
  instructionCount: number;
  stageCount: number;
  bottleneckStageIndices: readonly number[];
  clockPeriodNs: number;
  singleInstructionLatencyNs: number;
  idealCycles: number;
  totalTimeNs: number;
  steadyStateThroughputInstructionsPerNanosecond: number;
  steadyStateThroughputInstructionsPerSecond: number;
  serialTotalTimeNs: number;
  speedupVsSerial: number;
}

export interface PipelineStageTimingPreset {
  id: 'cn408-2009-q18-stage-clock';
  label: string;
  description: string;
  input: Readonly<PipelineStageTimingInput>;
  expectedClockPeriodNs: number;
}

export const PIPELINE_PRESETS = [
  {
    id: 'alu-forwarding-chain',
    label: 'ALU forwarding chain',
    description: 'Two dependent ALU instructions use EX/MEM and MEM/WB forwarding without stalls.',
    program: ['addi x1, x0, 5', 'add x2, x1, x1', 'sub x3, x2, x1'],
    initialRegisters: [],
    initialMemory: [],
    forwarding: true,
  },
  {
    id: 'load-use-stall',
    label: 'Load-use stall',
    description: 'A dependent add waits one cycle for lw, then forwards the value to EX.',
    program: ['lw x2, 0(x1)', 'add x3, x2, x2', 'sw x3, 4(x1)'],
    initialRegisters: [{ register: 1, value: 0x100 }],
    initialMemory: [{ address: 0x100, value: 7 }],
    forwarding: true,
  },
  {
    id: 'taken-branch-flush',
    label: 'Taken branch flush',
    description: 'A taken beq flushes the younger IF and ID instructions before fetching its target.',
    program: [
      'addi x1, x0, 1',
      'addi x2, x0, 1',
      'beq x1, x2, 12',
      'addi x3, x0, 99',
      'sw x3, 0(x0)',
      'addi x3, x0, 7',
    ],
    initialRegisters: [],
    initialMemory: [],
    forwarding: true,
  },
] as const satisfies readonly PipelinePreset[];

export const PIPELINE_TIMING_PRESETS = [
  {
    id: 'cn408-2009-q18-stage-clock',
    label: '2009 Q18 stage clock',
    description: 'Four functional-stage timing only; this preset does not model five-stage instruction hazards.',
    input: {
      stageDelaysNs: [90, 80, 70, 60],
      registerOverheadNs: 0,
      instructionCount: 1,
    },
    expectedClockPeriodNs: 90,
  },
] as const satisfies readonly PipelineStageTimingPreset[];

const SUPPORTED_MNEMONICS = new Set<PipelineMnemonic>(['add', 'sub', 'addi', 'lw', 'sw', 'beq']);
const MAX_PROGRAM_LENGTH = 64;
const DEFAULT_MAX_CYCLES = 256;
const MAX_CYCLES = 512;
const MIN_TIMING_STAGE_COUNT = 2;
const MAX_TIMING_STAGE_COUNT = 16;
const MAX_TIMING_INSTRUCTION_COUNT = 1_000_000;

interface DynamicInstruction extends PipelineInstructionRef {
  instruction: EncodedInstruction;
}

interface ExecutedInstruction {
  dynamic: DynamicInstruction;
  aluResult: number;
  storeValue: number | null;
  branchTaken: boolean;
  branchTarget: number | null;
}

interface CompletedInstruction {
  dynamic: DynamicInstruction;
  registerWrite: { register: number; value: number } | null;
}

interface ForwardingValue {
  register: number;
  value: number;
  producer: DynamicInstruction;
}

function success<T>(value: T): PipelineResult<T> {
  return { ok: true, value };
}

function failure(
  code: PipelineErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number>>,
): PipelineResult<never> {
  return details ? { ok: false, error: { code, message, details } } : { ok: false, error: { code, message } };
}

function isUint32(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function u32(value: number): number {
  return value >>> 0;
}

function isSupportedMnemonic(value: string): value is PipelineMnemonic {
  return SUPPORTED_MNEMONICS.has(value as PipelineMnemonic);
}

function normalizeInstruction(
  input: string | EncodedInstruction,
  programIndex: number,
): PipelineResult<PipelineProgramInstruction> {
  let instruction: EncodedInstruction;
  if (typeof input === 'string') {
    const parsed = parseAssembly({ text: input });
    if (!parsed.ok) {
      return failure('invalid-instruction', `Program instruction ${programIndex} is invalid.`, {
        programIndex,
        reason: parsed.error.code,
      });
    }
    const encoded = encodeInstruction({ instruction: parsed.value });
    if (!encoded.ok) {
      return failure('invalid-instruction', `Program instruction ${programIndex} cannot be encoded.`, {
        programIndex,
        reason: encoded.error.code,
      });
    }
    instruction = encoded.value;
  } else if (typeof input === 'object' && input !== null && isUint32(input.word)) {
    const decoded = decodeInstruction({ word: input.word });
    if (!decoded.ok) {
      return failure('invalid-instruction', `Program instruction ${programIndex} has invalid machine code.`, {
        programIndex,
        reason: decoded.error.code,
      });
    }
    instruction = decoded.value;
  } else {
    return failure('invalid-instruction', `Program instruction ${programIndex} must be assembly or encoded RV32I.`, {
      programIndex,
    });
  }

  if (!isSupportedMnemonic(instruction.instruction.mnemonic)) {
    return failure(
      'unsupported-instruction',
      `Instruction ${instruction.instruction.mnemonic} is outside the five-stage teaching subset.`,
      { programIndex, mnemonic: instruction.instruction.mnemonic },
    );
  }
  return success({ programIndex, pc: programIndex * 4, instruction });
}

function normalizeProgram(input: unknown): PipelineResult<readonly PipelineProgramInstruction[]> {
  if (!Array.isArray(input)) return failure('invalid-input', 'Pipeline program must be an array.');
  if (input.length === 0) return failure('empty-program', 'Pipeline program must contain at least one instruction.');
  if (input.length > MAX_PROGRAM_LENGTH) {
    return failure('program-too-large', `Pipeline program is limited to ${MAX_PROGRAM_LENGTH} instructions.`, {
      instructions: input.length,
      maximum: MAX_PROGRAM_LENGTH,
    });
  }

  const program: PipelineProgramInstruction[] = [];
  for (const [programIndex, rawInstruction] of input.entries()) {
    const normalized = normalizeInstruction(rawInstruction as string | EncodedInstruction, programIndex);
    if (!normalized.ok) return normalized;
    program.push(normalized.value);
  }
  return success(program);
}

function initializeRegisters(input: unknown): PipelineResult<number[]> {
  if (input !== undefined && !Array.isArray(input)) {
    return failure('invalid-input', 'Initial registers must be an array.');
  }
  const registers = Array.from({ length: 32 }, () => 0);
  const seen = new Set<number>();
  for (const rawEntry of (input ?? []) as readonly PipelineRegisterValue[]) {
    if (typeof rawEntry !== 'object' || rawEntry === null || !Number.isInteger(rawEntry.register)
      || rawEntry.register < 0 || rawEntry.register > 31) {
      return failure('invalid-register', 'Initial register index must be an integer from 0 to 31.');
    }
    if (seen.has(rawEntry.register)) {
      return failure('duplicate-register', `Initial register x${rawEntry.register} is listed more than once.`, {
        register: rawEntry.register,
      });
    }
    if (!isUint32(rawEntry.value)) {
      return failure('invalid-register-value', 'Initial register values must be unsigned 32-bit integers.', {
        register: rawEntry.register,
      });
    }
    seen.add(rawEntry.register);
    if (rawEntry.register !== 0) registers[rawEntry.register] = rawEntry.value;
  }
  return success(registers);
}

function initializeMemory(input: unknown): PipelineResult<Map<number, number>> {
  if (input !== undefined && !Array.isArray(input)) {
    return failure('invalid-input', 'Initial memory must be an array.');
  }
  const memory = new Map<number, number>();
  for (const rawEntry of (input ?? []) as readonly PipelineMemoryWord[]) {
    if (typeof rawEntry !== 'object' || rawEntry === null || !isUint32(rawEntry.address)) {
      return failure('invalid-memory-address', 'Initial memory addresses must be unsigned 32-bit integers.');
    }
    if (memory.has(rawEntry.address)) {
      return failure('duplicate-memory-address', `Memory address ${rawEntry.address} is listed more than once.`, {
        address: rawEntry.address,
      });
    }
    if (!isUint32(rawEntry.value)) {
      return failure('invalid-memory-value', 'Initial memory values must be unsigned 32-bit integers.', {
        address: rawEntry.address,
      });
    }
    memory.set(rawEntry.address, rawEntry.value);
  }
  return success(memory);
}

function instructionSources(ast: InstructionAst): readonly { operand: 'rs1' | 'rs2'; register: number }[] {
  if (!isSupportedMnemonic(ast.mnemonic)) return [];
  if (ast.mnemonic === 'add' || ast.mnemonic === 'sub' || ast.mnemonic === 'sw' || ast.mnemonic === 'beq') {
    return [
      { operand: 'rs1', register: ast.rs1! },
      { operand: 'rs2', register: ast.rs2! },
    ];
  }
  return [{ operand: 'rs1', register: ast.rs1! }];
}

function destinationRegister(ast: InstructionAst): number | null {
  return ast.mnemonic === 'add' || ast.mnemonic === 'sub' || ast.mnemonic === 'addi' || ast.mnemonic === 'lw'
    ? ast.rd
    : null;
}

function instructionRef(dynamic: DynamicInstruction): PipelineInstructionRef {
  return {
    instanceId: dynamic.instanceId,
    programIndex: dynamic.programIndex,
    pc: dynamic.pc,
    mnemonic: dynamic.mnemonic,
    canonicalAssembly: dynamic.canonicalAssembly,
    word: dynamic.word,
    hex: dynamic.hex,
  };
}

function forwardingFromMem(slot: ExecutedInstruction | null): ForwardingValue | null {
  if (!slot || slot.dynamic.mnemonic === 'lw') return null;
  const register = destinationRegister(slot.dynamic.instruction.instruction);
  if (register === null || register === 0) return null;
  return { register, value: slot.aluResult, producer: slot.dynamic };
}

function forwardingFromWb(slot: CompletedInstruction | null): ForwardingValue | null {
  if (!slot?.registerWrite || slot.registerWrite.register === 0) return null;
  return {
    register: slot.registerWrite.register,
    value: slot.registerWrite.value,
    producer: slot.dynamic,
  };
}

function executeInstruction(
  dynamic: DynamicInstruction,
  registers: readonly number[],
  memSlot: ExecutedInstruction | null,
  wbSlot: CompletedInstruction | null,
  forwarding: boolean,
): { executed: ExecutedInstruction; events: readonly PipelineForwardingEvent[] } {
  const ast = dynamic.instruction.instruction;
  const events: PipelineForwardingEvent[] = [];
  const memValue = forwarding ? forwardingFromMem(memSlot) : null;
  const wbValue = forwarding ? forwardingFromWb(wbSlot) : null;
  const operandValues = new Map<'rs1' | 'rs2', number>();

  for (const source of instructionSources(ast)) {
    let value = registers[source.register] ?? 0;
    let forwarded: { source: PipelineForwardingSource; value: ForwardingValue } | null = null;
    if (source.register !== 0 && memValue?.register === source.register) {
      forwarded = { source: 'EX/MEM', value: memValue };
    } else if (source.register !== 0 && wbValue?.register === source.register) {
      forwarded = { source: 'MEM/WB', value: wbValue };
    }
    if (forwarded) {
      value = forwarded.value.value;
      events.push({
        source: forwarded.source,
        target: 'EX',
        operand: source.operand,
        register: source.register,
        value,
        producer: instructionRef(forwarded.value.producer),
        consumer: instructionRef(dynamic),
      });
    }
    operandValues.set(source.operand, value);
  }

  const rs1Value = operandValues.get('rs1') ?? 0;
  const rs2Value = operandValues.get('rs2') ?? 0;
  let aluResult = 0;
  let storeValue: number | null = null;
  let branchTaken = false;
  let branchTarget: number | null = null;

  if (ast.mnemonic === 'add') aluResult = u32(rs1Value + rs2Value);
  else if (ast.mnemonic === 'sub') aluResult = u32(rs1Value - rs2Value);
  else if (ast.mnemonic === 'addi') aluResult = u32(rs1Value + ast.immediate);
  else if (ast.mnemonic === 'lw') aluResult = u32(rs1Value + ast.immediate);
  else if (ast.mnemonic === 'sw') {
    aluResult = u32(rs1Value + ast.immediate);
    storeValue = rs2Value;
  } else {
    branchTaken = rs1Value === rs2Value;
    branchTarget = u32(dynamic.pc + (ast.immediate ?? 0));
    aluResult = u32(rs1Value - rs2Value);
  }

  return {
    executed: { dynamic, aluResult, storeValue, branchTaken, branchTarget },
    events,
  };
}

function completeMemoryStage(
  slot: ExecutedInstruction | null,
  memory: Map<number, number>,
): { completed: CompletedInstruction | null; event: PipelineMemoryAccessEvent | null } {
  if (!slot) return { completed: null, event: null };
  const ast = slot.dynamic.instruction.instruction;
  let registerWrite: CompletedInstruction['registerWrite'] = null;
  let event: PipelineMemoryAccessEvent | null = null;

  if (ast.mnemonic === 'lw') {
    const value = memory.get(slot.aluResult) ?? 0;
    registerWrite = { register: ast.rd, value };
    event = {
      instruction: instructionRef(slot.dynamic),
      operation: 'read',
      address: slot.aluResult,
      value,
      misaligned: slot.aluResult % 4 !== 0,
    };
  } else if (ast.mnemonic === 'sw') {
    const value = slot.storeValue ?? 0;
    memory.set(slot.aluResult, value);
    event = {
      instruction: instructionRef(slot.dynamic),
      operation: 'write',
      address: slot.aluResult,
      value,
      misaligned: slot.aluResult % 4 !== 0,
    };
  } else {
    const register = destinationRegister(ast);
    if (register !== null) registerWrite = { register, value: slot.aluResult };
  }
  return { completed: { dynamic: slot.dynamic, registerWrite }, event };
}

function detectStall(
  idSlot: DynamicInstruction | null,
  exSlot: DynamicInstruction | null,
  memSlot: ExecutedInstruction | null,
  forwarding: boolean,
): PipelineStallEvent | null {
  if (!idSlot) return null;
  const sources = instructionSources(idSlot.instruction.instruction).filter((source) => source.register !== 0);
  const exDestination = exSlot ? destinationRegister(exSlot.instruction.instruction) : null;
  if (exSlot && exDestination !== null && exDestination !== 0) {
    const dependency = sources.find((source) => source.register === exDestination);
    if (dependency && (!forwarding || exSlot.mnemonic === 'lw')) {
      return {
        kind: exSlot.mnemonic === 'lw' ? 'load-use' : 'raw',
        register: dependency.register,
        producerStage: 'EX',
        producer: instructionRef(exSlot),
        consumer: instructionRef(idSlot),
      };
    }
  }

  if (!forwarding && memSlot) {
    const memDestination = destinationRegister(memSlot.dynamic.instruction.instruction);
    if (memDestination !== null && memDestination !== 0) {
      const dependency = sources.find((source) => source.register === memDestination);
      if (dependency) {
        return {
          kind: memSlot.dynamic.mnemonic === 'lw' ? 'load-use' : 'raw',
          register: dependency.register,
          producerStage: 'MEM',
          producer: instructionRef(memSlot.dynamic),
          consumer: instructionRef(idSlot),
        };
      }
    }
  }
  return null;
}

function stageState(
  id: PipelineStageId,
  label: string,
  dynamic: DynamicInstruction | null,
  status: PipelineStageStatus = dynamic ? 'active' : 'bubble',
): PipelineStageState {
  return { id, label, status: dynamic ? status : 'bubble', instruction: dynamic ? instructionRef(dynamic) : null };
}

function snapshotStages(
  ifSlot: DynamicInstruction | null,
  idSlot: DynamicInstruction | null,
  exSlot: DynamicInstruction | null,
  memSlot: ExecutedInstruction | null,
  wbSlot: CompletedInstruction | null,
  stalled: boolean,
  flushed: boolean,
): readonly PipelineStageState[] {
  const youngerStatus: PipelineStageStatus = flushed ? 'flushed' : stalled ? 'stalled' : 'active';
  return [
    stageState('IF', 'Fetch', ifSlot, youngerStatus),
    stageState('ID', 'Decode', idSlot, youngerStatus),
    stageState('EX', 'Execute', exSlot),
    stageState('MEM', 'Memory', memSlot?.dynamic ?? null),
    stageState('WB', 'Writeback', wbSlot?.dynamic ?? null),
  ];
}

function sortedMemory(memory: ReadonlyMap<number, number>): PipelineMemoryWord[] {
  return [...memory.entries()]
    .sort(([left], [right]) => left - right)
    .map(([address, value]) => ({ address, value }));
}

export function analyzePipelineStageTiming(
  input: PipelineStageTimingInput,
): PipelineResult<PipelineStageTimingAnalysis> {
  if (typeof input !== 'object' || input === null || !Array.isArray(input.stageDelaysNs)) {
    return failure('invalid-input', 'Pipeline timing input must contain a stage delay array.');
  }
  const stageCount = input.stageDelaysNs.length;
  if (stageCount < MIN_TIMING_STAGE_COUNT || stageCount > MAX_TIMING_STAGE_COUNT) {
    return failure(
      'invalid-stage-count',
      `Pipeline timing requires ${MIN_TIMING_STAGE_COUNT} to ${MAX_TIMING_STAGE_COUNT} stages.`,
      { stageCount, minimum: MIN_TIMING_STAGE_COUNT, maximum: MAX_TIMING_STAGE_COUNT },
    );
  }

  const stageDelaysNs = [...input.stageDelaysNs];
  for (const [stageIndex, delayNs] of stageDelaysNs.entries()) {
    if (typeof delayNs !== 'number' || !Number.isFinite(delayNs) || delayNs <= 0) {
      return failure('invalid-stage-delay', 'Every stage delay must be a positive finite number of nanoseconds.', {
        stageIndex,
      });
    }
  }

  const registerOverheadNs = input.registerOverheadNs ?? 0;
  if (typeof registerOverheadNs !== 'number' || !Number.isFinite(registerOverheadNs)
    || registerOverheadNs < 0) {
    return failure(
      'invalid-register-overhead',
      'Pipeline register overhead must be a non-negative finite number of nanoseconds.',
    );
  }
  if (!Number.isInteger(input.instructionCount) || input.instructionCount < 1
    || input.instructionCount > MAX_TIMING_INSTRUCTION_COUNT) {
    return failure(
      'invalid-instruction-count',
      `Instruction count must be an integer from 1 to ${MAX_TIMING_INSTRUCTION_COUNT}.`,
      { instructionCount: input.instructionCount, maximum: MAX_TIMING_INSTRUCTION_COUNT },
    );
  }

  const maximumStageDelayNs = Math.max(...stageDelaysNs);
  const bottleneckStageIndices = stageDelaysNs
    .map((delayNs, stageIndex) => delayNs === maximumStageDelayNs ? stageIndex : -1)
    .filter((stageIndex) => stageIndex >= 0);
  const clockPeriodNs = maximumStageDelayNs + registerOverheadNs;
  const singleInstructionLatencyNs = stageCount * clockPeriodNs;
  const idealCycles = stageCount + input.instructionCount - 1;
  const totalTimeNs = idealCycles * clockPeriodNs;
  const steadyStateThroughputInstructionsPerNanosecond = 1 / clockPeriodNs;
  const steadyStateThroughputInstructionsPerSecond = 1_000_000_000 / clockPeriodNs;
  const stageDelaySumNs = stageDelaysNs.reduce((sum, delayNs) => sum + delayNs, 0);
  const serialTotalTimeNs = stageDelaySumNs * input.instructionCount;
  const speedupVsSerial = serialTotalTimeNs / totalTimeNs;
  const derivedValues = [
    clockPeriodNs,
    singleInstructionLatencyNs,
    totalTimeNs,
    steadyStateThroughputInstructionsPerNanosecond,
    steadyStateThroughputInstructionsPerSecond,
    stageDelaySumNs,
    serialTotalTimeNs,
    speedupVsSerial,
  ];
  if (derivedValues.some((value) => !Number.isFinite(value) || value <= 0)) {
    return failure('timing-overflow', 'Pipeline timing values exceed the finite numeric range.');
  }

  return success({
    stageDelaysNs,
    registerOverheadNs,
    instructionCount: input.instructionCount,
    stageCount,
    bottleneckStageIndices,
    clockPeriodNs,
    singleInstructionLatencyNs,
    idealCycles,
    totalTimeNs,
    steadyStateThroughputInstructionsPerNanosecond,
    steadyStateThroughputInstructionsPerSecond,
    serialTotalTimeNs,
    speedupVsSerial,
  });
}

export function simulateFiveStagePipeline(input: SimulateFiveStagePipelineInput): PipelineResult<PipelineTrace> {
  if (typeof input !== 'object' || input === null) {
    return failure('invalid-input', 'Pipeline simulation input must be an object.');
  }
  const programResult = normalizeProgram(input.program);
  if (!programResult.ok) return programResult;
  const registersResult = initializeRegisters(input.initialRegisters);
  if (!registersResult.ok) return registersResult;
  const memoryResult = initializeMemory(input.initialMemory);
  if (!memoryResult.ok) return memoryResult;
  if (input.forwarding !== undefined && typeof input.forwarding !== 'boolean') {
    return failure('invalid-forwarding', 'Forwarding must be a boolean when provided.');
  }
  const maxCycles = input.maxCycles ?? DEFAULT_MAX_CYCLES;
  if (!Number.isInteger(maxCycles) || maxCycles < 1 || maxCycles > MAX_CYCLES) {
    return failure('invalid-max-cycles', `maxCycles must be an integer from 1 to ${MAX_CYCLES}.`, {
      maxCycles,
      maximum: MAX_CYCLES,
    });
  }

  const program = programResult.value;
  const registers = registersResult.value;
  const memory = memoryResult.value;
  const initialRegisters = [...registers];
  const initialMemory = sortedMemory(memory);
  const forwarding = input.forwarding ?? true;
  let nextInstanceId = 0;
  const fetchAt = (pc: number): DynamicInstruction | null => {
    if (pc % 4 !== 0) return null;
    const staticInstruction = program[pc / 4];
    if (!staticInstruction) return null;
    const ast = staticInstruction.instruction.instruction;
    return {
      instanceId: nextInstanceId++,
      programIndex: staticInstruction.programIndex,
      pc,
      mnemonic: ast.mnemonic as PipelineMnemonic,
      canonicalAssembly: staticInstruction.instruction.canonicalAssembly,
      word: staticInstruction.instruction.word,
      hex: staticInstruction.instruction.hex,
      instruction: staticInstruction.instruction,
    };
  };

  let ifSlot = fetchAt(0);
  let idSlot: DynamicInstruction | null = null;
  let exSlot: DynamicInstruction | null = null;
  let memSlot: ExecutedInstruction | null = null;
  let wbSlot: CompletedInstruction | null = null;
  let nextFetchPc = 4;
  let retired = 0;
  let stalls = 0;
  let flushes = 0;
  let flushedInstructions = 0;
  let forwardingCount = 0;
  let registerWrites = 0;
  let memoryReads = 0;
  let memoryWrites = 0;
  const cycles: PipelineCycleTrace[] = [];
  let termination: PipelineTermination = 'max-cycles';

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    const registerWriteEvents: PipelineRegisterWriteEvent[] = [];
    if (wbSlot) {
      retired += 1;
      if (wbSlot.registerWrite) {
        const { register, value } = wbSlot.registerWrite;
        const suppressedByX0 = register === 0;
        if (!suppressedByX0) {
          registers[register] = value;
          registerWrites += 1;
        }
        registerWriteEvents.push({
          instruction: instructionRef(wbSlot.dynamic),
          register,
          value,
          suppressedByX0,
        });
      }
    }
    registers[0] = 0;

    const memoryStage = completeMemoryStage(memSlot, memory);
    const memoryAccessEvents = memoryStage.event ? [memoryStage.event] : [];
    if (memoryStage.event?.operation === 'read') memoryReads += 1;
    if (memoryStage.event?.operation === 'write') memoryWrites += 1;

    const execution: ReturnType<typeof executeInstruction> | null = exSlot
      ? executeInstruction(exSlot, registers, memSlot, wbSlot, forwarding)
      : null;
    const forwardingEvents = execution?.events ?? [];
    forwardingCount += forwardingEvents.length;
    const branchTaken = execution?.executed.branchTaken === true;
    const branchTarget = execution?.executed.branchTarget ?? null;
    const stallEvent = branchTaken ? null : detectStall(idSlot, exSlot, memSlot, forwarding);
    if (stallEvent) stalls += 1;

    let flushEvent: PipelineFlushEvent | null = null;
    if (branchTaken && exSlot && branchTarget !== null) {
      const flushed = [idSlot, ifSlot]
        .filter((dynamic): dynamic is DynamicInstruction => dynamic !== null)
        .map(instructionRef);
      flushEvent = {
        kind: 'taken-branch',
        branch: instructionRef(exSlot),
        targetPc: branchTarget,
        flushed,
      };
      flushes += 1;
      flushedInstructions += flushed.length;
    }

    const stages = snapshotStages(ifSlot, idSlot, exSlot, memSlot, wbSlot, stallEvent !== null, flushEvent !== null);
    let followingIf: DynamicInstruction | null;
    let followingId: DynamicInstruction | null;
    let followingEx: DynamicInstruction | null;
    if (flushEvent) {
      followingEx = null;
      followingId = null;
      followingIf = fetchAt(flushEvent.targetPc);
      nextFetchPc = u32(flushEvent.targetPc + 4);
    } else if (stallEvent) {
      followingEx = null;
      followingId = idSlot;
      followingIf = ifSlot;
    } else {
      followingEx = idSlot;
      followingId = ifSlot;
      followingIf = fetchAt(nextFetchPc);
      nextFetchPc = u32(nextFetchPc + 4);
    }

    cycles.push({
      cycle,
      stages,
      events: {
        forwarding: forwardingEvents,
        stall: stallEvent,
        flush: flushEvent,
        registerWrite: registerWriteEvents,
        memoryAccess: memoryAccessEvents,
      },
      nextFetchPc,
    });

    wbSlot = memoryStage.completed;
    memSlot = execution?.executed ?? null;
    exSlot = followingEx;
    idSlot = followingId;
    ifSlot = followingIf;

    if (!ifSlot && !idSlot && !exSlot && !memSlot && !wbSlot) {
      termination = 'drained';
      break;
    }
  }

  return success({
    program,
    forwarding,
    maxCycles,
    initialRegisters,
    initialMemory,
    termination,
    cycles,
    finalRegisters: [...registers],
    finalMemory: sortedMemory(memory),
    summary: {
      cycles: cycles.length,
      retired,
      stalls,
      flushes,
      flushedInstructions,
      forwardings: forwardingCount,
      registerWrites,
      memoryReads,
      memoryWrites,
    },
  });
}
