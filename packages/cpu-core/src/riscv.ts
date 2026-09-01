import { parseInteger } from './number';

export const CPU_EXPLORER_RISCV_SOURCE_COMMIT = '94194987e6ed72d437a7b3debdc14adb2aaa4619' as const;

export type InstructionFormat = 'R' | 'I' | 'S' | 'B' | 'U' | 'J';
export type RTypeMnemonic = 'add' | 'sub' | 'and' | 'or' | 'xor' | 'sll' | 'srl' | 'sra' | 'slt' | 'sltu';
export type ITypeMnemonic =
  | 'addi' | 'andi' | 'ori' | 'xori' | 'slti' | 'sltiu' | 'slli' | 'srli' | 'srai'
  | 'lb' | 'lh' | 'lw' | 'lbu' | 'lhu' | 'jalr';
export type STypeMnemonic = 'sb' | 'sh' | 'sw';
export type BTypeMnemonic = 'beq' | 'bne' | 'blt' | 'bge' | 'bltu' | 'bgeu';
export type UTypeMnemonic = 'lui' | 'auipc';
export type JTypeMnemonic = 'jal';
export type Rv32iMnemonic =
  | RTypeMnemonic | ITypeMnemonic | STypeMnemonic | BTypeMnemonic | UTypeMnemonic | JTypeMnemonic;

export type RiscvErrorCode =
  | 'empty-input'
  | 'invalid-input'
  | 'unknown-instruction'
  | 'operand-count'
  | 'invalid-register'
  | 'invalid-immediate'
  | 'immediate-out-of-range'
  | 'immediate-alignment'
  | 'invalid-ast'
  | 'invalid-machine-code'
  | 'reserved-encoding';

export interface RiscvError {
  code: RiscvErrorCode;
  message: string;
  details?: Readonly<Record<string, string | number>>;
}

export type RiscvResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RiscvError };

interface InstructionAstBase<M extends Rv32iMnemonic, F extends InstructionFormat> {
  mnemonic: M;
  format: F;
  canonicalAssembly: string;
}

export interface RTypeInstructionAst extends InstructionAstBase<RTypeMnemonic, 'R'> {
  rd: number;
  rs1: number;
  rs2: number;
  immediate: null;
}

export interface ITypeInstructionAst extends InstructionAstBase<ITypeMnemonic, 'I'> {
  rd: number;
  rs1: number;
  rs2: null;
  immediate: number;
}

export interface STypeInstructionAst extends InstructionAstBase<STypeMnemonic, 'S'> {
  rd: null;
  rs1: number;
  rs2: number;
  immediate: number;
}

export interface BTypeInstructionAst extends InstructionAstBase<BTypeMnemonic, 'B'> {
  rd: null;
  rs1: number;
  rs2: number;
  immediate: number;
}

export interface UTypeInstructionAst extends InstructionAstBase<UTypeMnemonic, 'U'> {
  rd: number;
  rs1: null;
  rs2: null;
  immediate: number;
}

export interface JTypeInstructionAst extends InstructionAstBase<JTypeMnemonic, 'J'> {
  rd: number;
  rs1: null;
  rs2: null;
  immediate: number;
}

export type InstructionAst =
  | RTypeInstructionAst
  | ITypeInstructionAst
  | STypeInstructionAst
  | BTypeInstructionAst
  | UTypeInstructionAst
  | JTypeInstructionAst;

export interface ParseAssemblyInput {
  text: string;
}

export interface EncodeInstructionInput {
  instruction: InstructionAst;
}

export type DecodeInstructionInput =
  | { word: number; hex?: never; bits?: never }
  | { word?: never; hex: string; bits?: never }
  | { word?: never; hex?: never; bits: string };

export interface RiscvBitField {
  name: string;
  value: number;
  bits: string;
  msb: number;
  lsb: number;
}

export interface RiscvImmediateField {
  value: number;
  bits: string;
  width: 12 | 13 | 20 | 21;
  fragments: readonly RiscvBitField[];
}

export interface EncodedInstructionFields {
  format: InstructionFormat;
  opcode: RiscvBitField;
  rd: RiscvBitField | null;
  rs1: RiscvBitField | null;
  rs2: RiscvBitField | null;
  funct3: RiscvBitField | null;
  funct7: RiscvBitField | null;
  immediate: RiscvImmediateField | null;
}

export interface EncodedInstruction {
  instruction: InstructionAst;
  canonicalAssembly: string;
  word: number;
  hex: string;
  bits: string;
  fields: EncodedInstructionFields;
}

type InstructionSyntax = 'r' | 'i' | 'shift' | 'load' | 'jalr' | 'store' | 'branch' | 'upper' | 'jump';

interface InstructionDefinition {
  mnemonic: Rv32iMnemonic;
  format: InstructionFormat;
  syntax: InstructionSyntax;
  opcode: number;
  funct3: number | null;
  funct7: number | null;
}

const DEFINITIONS: readonly InstructionDefinition[] = [
  { mnemonic: 'add', format: 'R', syntax: 'r', opcode: 0x33, funct3: 0, funct7: 0x00 },
  { mnemonic: 'sub', format: 'R', syntax: 'r', opcode: 0x33, funct3: 0, funct7: 0x20 },
  { mnemonic: 'and', format: 'R', syntax: 'r', opcode: 0x33, funct3: 7, funct7: 0x00 },
  { mnemonic: 'or', format: 'R', syntax: 'r', opcode: 0x33, funct3: 6, funct7: 0x00 },
  { mnemonic: 'xor', format: 'R', syntax: 'r', opcode: 0x33, funct3: 4, funct7: 0x00 },
  { mnemonic: 'sll', format: 'R', syntax: 'r', opcode: 0x33, funct3: 1, funct7: 0x00 },
  { mnemonic: 'srl', format: 'R', syntax: 'r', opcode: 0x33, funct3: 5, funct7: 0x00 },
  { mnemonic: 'sra', format: 'R', syntax: 'r', opcode: 0x33, funct3: 5, funct7: 0x20 },
  { mnemonic: 'slt', format: 'R', syntax: 'r', opcode: 0x33, funct3: 2, funct7: 0x00 },
  { mnemonic: 'sltu', format: 'R', syntax: 'r', opcode: 0x33, funct3: 3, funct7: 0x00 },
  { mnemonic: 'addi', format: 'I', syntax: 'i', opcode: 0x13, funct3: 0, funct7: null },
  { mnemonic: 'andi', format: 'I', syntax: 'i', opcode: 0x13, funct3: 7, funct7: null },
  { mnemonic: 'ori', format: 'I', syntax: 'i', opcode: 0x13, funct3: 6, funct7: null },
  { mnemonic: 'xori', format: 'I', syntax: 'i', opcode: 0x13, funct3: 4, funct7: null },
  { mnemonic: 'slti', format: 'I', syntax: 'i', opcode: 0x13, funct3: 2, funct7: null },
  { mnemonic: 'sltiu', format: 'I', syntax: 'i', opcode: 0x13, funct3: 3, funct7: null },
  { mnemonic: 'slli', format: 'I', syntax: 'shift', opcode: 0x13, funct3: 1, funct7: 0x00 },
  { mnemonic: 'srli', format: 'I', syntax: 'shift', opcode: 0x13, funct3: 5, funct7: 0x00 },
  { mnemonic: 'srai', format: 'I', syntax: 'shift', opcode: 0x13, funct3: 5, funct7: 0x20 },
  { mnemonic: 'lb', format: 'I', syntax: 'load', opcode: 0x03, funct3: 0, funct7: null },
  { mnemonic: 'lh', format: 'I', syntax: 'load', opcode: 0x03, funct3: 1, funct7: null },
  { mnemonic: 'lw', format: 'I', syntax: 'load', opcode: 0x03, funct3: 2, funct7: null },
  { mnemonic: 'lbu', format: 'I', syntax: 'load', opcode: 0x03, funct3: 4, funct7: null },
  { mnemonic: 'lhu', format: 'I', syntax: 'load', opcode: 0x03, funct3: 5, funct7: null },
  { mnemonic: 'jalr', format: 'I', syntax: 'jalr', opcode: 0x67, funct3: 0, funct7: null },
  { mnemonic: 'sb', format: 'S', syntax: 'store', opcode: 0x23, funct3: 0, funct7: null },
  { mnemonic: 'sh', format: 'S', syntax: 'store', opcode: 0x23, funct3: 1, funct7: null },
  { mnemonic: 'sw', format: 'S', syntax: 'store', opcode: 0x23, funct3: 2, funct7: null },
  { mnemonic: 'beq', format: 'B', syntax: 'branch', opcode: 0x63, funct3: 0, funct7: null },
  { mnemonic: 'bne', format: 'B', syntax: 'branch', opcode: 0x63, funct3: 1, funct7: null },
  { mnemonic: 'blt', format: 'B', syntax: 'branch', opcode: 0x63, funct3: 4, funct7: null },
  { mnemonic: 'bge', format: 'B', syntax: 'branch', opcode: 0x63, funct3: 5, funct7: null },
  { mnemonic: 'bltu', format: 'B', syntax: 'branch', opcode: 0x63, funct3: 6, funct7: null },
  { mnemonic: 'bgeu', format: 'B', syntax: 'branch', opcode: 0x63, funct3: 7, funct7: null },
  { mnemonic: 'lui', format: 'U', syntax: 'upper', opcode: 0x37, funct3: null, funct7: null },
  { mnemonic: 'auipc', format: 'U', syntax: 'upper', opcode: 0x17, funct3: null, funct7: null },
  { mnemonic: 'jal', format: 'J', syntax: 'jump', opcode: 0x6f, funct3: null, funct7: null },
];

const DEFINITION_BY_MNEMONIC = new Map(DEFINITIONS.map((definition) => [definition.mnemonic, definition]));
const ABI_REGISTERS = new Map<string, number>([
  ['zero', 0], ['ra', 1], ['sp', 2], ['gp', 3], ['tp', 4], ['t0', 5], ['t1', 6], ['t2', 7],
  ['s0', 8], ['fp', 8], ['s1', 9], ['a0', 10], ['a1', 11], ['a2', 12], ['a3', 13],
  ['a4', 14], ['a5', 15], ['a6', 16], ['a7', 17], ['s2', 18], ['s3', 19], ['s4', 20],
  ['s5', 21], ['s6', 22], ['s7', 23], ['s8', 24], ['s9', 25], ['s10', 26], ['s11', 27],
  ['t3', 28], ['t4', 29], ['t5', 30], ['t6', 31],
]);

function success<T>(value: T): RiscvResult<T> {
  return { ok: true, value };
}

function failure(
  code: RiscvErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number>>,
): RiscvResult<never> {
  return details ? { ok: false, error: { code, message, details } } : { ok: false, error: { code, message } };
}

function parseRegister(token: string): RiscvResult<number> {
  const normalized = token.trim().toLowerCase();
  if (/^x(?:[0-9]|[12][0-9]|3[01])$/u.test(normalized)) {
    return success(Number(normalized.slice(1)));
  }
  const alias = ABI_REGISTERS.get(normalized);
  return alias === undefined
    ? failure('invalid-register', `Invalid RV32I register ${token}.`)
    : success(alias);
}

function parseOperands(rest: string): string[] {
  if (!rest.trim()) return [];
  return rest.includes(',') ? rest.split(',').map((operand) => operand.trim()) : rest.trim().split(/\s+/u);
}

function requireOperandCount(operands: readonly string[], expected: number): RiscvResult<readonly string[]> {
  return operands.length === expected && operands.every(Boolean)
    ? success(operands)
    : failure('operand-count', `Expected ${expected} operands, received ${operands.length}.`, {
      expected,
      actual: operands.length,
    });
}

function parseImmediate(token: string, min: bigint, max: bigint, alignment = 1): RiscvResult<number> {
  const parsed = parseInteger({ text: token });
  if (!parsed.ok) {
    return failure('invalid-immediate', `Invalid immediate ${token}.`, { reason: parsed.error.code });
  }
  if (parsed.value.value < min || parsed.value.value > max) {
    return failure('immediate-out-of-range', `Immediate ${token} is outside [${min}, ${max}].`, {
      min: min.toString(),
      max: max.toString(),
    });
  }
  if (parsed.value.value % BigInt(alignment) !== 0n) {
    return failure('immediate-alignment', `Immediate ${token} must be aligned to ${alignment} bytes.`, { alignment });
  }
  return success(Number(parsed.value.value));
}

function parseMemoryOperand(token: string): RiscvResult<{ immediateToken: string; baseToken: string }> {
  const match = /^(.+)\(\s*([^()\s]+)\s*\)$/u.exec(token.trim());
  return match?.[1] && match[2]
    ? success({ immediateToken: match[1].trim(), baseToken: match[2] })
    : failure('invalid-immediate', `Invalid memory operand ${token}.`);
}

function registerName(index: number): string {
  return `x${index}`;
}

export function parseAssembly(input: ParseAssemblyInput): RiscvResult<InstructionAst> {
  if (typeof input !== 'object' || input === null || typeof input.text !== 'string') {
    return failure('invalid-input', 'Assembly input must contain a text string.');
  }
  const text = input.text.trim().toLowerCase();
  if (!text) return failure('empty-input', 'Assembly input cannot be empty.');
  const match = /^([a-z][a-z0-9]*)\b(.*)$/u.exec(text);
  if (!match?.[1]) return failure('unknown-instruction', 'Assembly must begin with an instruction mnemonic.');
  const definition = DEFINITION_BY_MNEMONIC.get(match[1] as Rv32iMnemonic);
  if (!definition) return failure('unknown-instruction', `Unknown RV32I instruction ${match[1]}.`);
  const operands = parseOperands(match[2] ?? '');

  if (definition.syntax === 'r') {
    const count = requireOperandCount(operands, 3);
    if (!count.ok) return count;
    const rd = parseRegister(operands[0]!);
    const rs1 = parseRegister(operands[1]!);
    const rs2 = parseRegister(operands[2]!);
    if (!rd.ok) return rd;
    if (!rs1.ok) return rs1;
    if (!rs2.ok) return rs2;
    return success({
      mnemonic: definition.mnemonic as RTypeMnemonic,
      format: 'R', rd: rd.value, rs1: rs1.value, rs2: rs2.value, immediate: null,
      canonicalAssembly: `${definition.mnemonic} ${registerName(rd.value)}, ${registerName(rs1.value)}, ${registerName(rs2.value)}`,
    });
  }

  if (definition.syntax === 'i' || definition.syntax === 'shift') {
    const count = requireOperandCount(operands, 3);
    if (!count.ok) return count;
    const rd = parseRegister(operands[0]!);
    const rs1 = parseRegister(operands[1]!);
    const immediate = definition.syntax === 'shift'
      ? parseImmediate(operands[2]!, 0n, 31n)
      : parseImmediate(operands[2]!, -2048n, 2047n);
    if (!rd.ok) return rd;
    if (!rs1.ok) return rs1;
    if (!immediate.ok) return immediate;
    return success({
      mnemonic: definition.mnemonic as ITypeMnemonic,
      format: 'I', rd: rd.value, rs1: rs1.value, rs2: null, immediate: immediate.value,
      canonicalAssembly: `${definition.mnemonic} ${registerName(rd.value)}, ${registerName(rs1.value)}, ${immediate.value}`,
    });
  }

  if (definition.syntax === 'load' || definition.syntax === 'jalr') {
    let rdToken: string;
    let baseToken: string;
    let immediateToken: string;
    if (definition.syntax === 'jalr' && operands.length === 3) {
      [rdToken, baseToken, immediateToken] = operands as [string, string, string];
    } else {
      const count = requireOperandCount(operands, 2);
      if (!count.ok) return count;
      rdToken = operands[0]!;
      const memory = parseMemoryOperand(operands[1]!);
      if (!memory.ok) return memory;
      ({ baseToken, immediateToken } = memory.value);
    }
    const rd = parseRegister(rdToken);
    const rs1 = parseRegister(baseToken);
    const immediate = parseImmediate(immediateToken, -2048n, 2047n);
    if (!rd.ok) return rd;
    if (!rs1.ok) return rs1;
    if (!immediate.ok) return immediate;
    return success({
      mnemonic: definition.mnemonic as ITypeMnemonic,
      format: 'I', rd: rd.value, rs1: rs1.value, rs2: null, immediate: immediate.value,
      canonicalAssembly: `${definition.mnemonic} ${registerName(rd.value)}, ${immediate.value}(${registerName(rs1.value)})`,
    });
  }

  if (definition.syntax === 'store') {
    const count = requireOperandCount(operands, 2);
    if (!count.ok) return count;
    const memory = parseMemoryOperand(operands[1]!);
    if (!memory.ok) return memory;
    const rs2 = parseRegister(operands[0]!);
    const rs1 = parseRegister(memory.value.baseToken);
    const immediate = parseImmediate(memory.value.immediateToken, -2048n, 2047n);
    if (!rs2.ok) return rs2;
    if (!rs1.ok) return rs1;
    if (!immediate.ok) return immediate;
    return success({
      mnemonic: definition.mnemonic as STypeMnemonic,
      format: 'S', rd: null, rs1: rs1.value, rs2: rs2.value, immediate: immediate.value,
      canonicalAssembly: `${definition.mnemonic} ${registerName(rs2.value)}, ${immediate.value}(${registerName(rs1.value)})`,
    });
  }

  if (definition.syntax === 'branch') {
    const count = requireOperandCount(operands, 3);
    if (!count.ok) return count;
    const rs1 = parseRegister(operands[0]!);
    const rs2 = parseRegister(operands[1]!);
    const immediate = parseImmediate(operands[2]!, -4096n, 4094n, 2);
    if (!rs1.ok) return rs1;
    if (!rs2.ok) return rs2;
    if (!immediate.ok) return immediate;
    return success({
      mnemonic: definition.mnemonic as BTypeMnemonic,
      format: 'B', rd: null, rs1: rs1.value, rs2: rs2.value, immediate: immediate.value,
      canonicalAssembly: `${definition.mnemonic} ${registerName(rs1.value)}, ${registerName(rs2.value)}, ${immediate.value}`,
    });
  }

  if (definition.syntax === 'upper') {
    const count = requireOperandCount(operands, 2);
    if (!count.ok) return count;
    const rd = parseRegister(operands[0]!);
    const immediate = parseImmediate(operands[1]!, 0n, 0xfffffn);
    if (!rd.ok) return rd;
    if (!immediate.ok) return immediate;
    return success({
      mnemonic: definition.mnemonic as UTypeMnemonic,
      format: 'U', rd: rd.value, rs1: null, rs2: null, immediate: immediate.value,
      canonicalAssembly: `${definition.mnemonic} ${registerName(rd.value)}, ${immediate.value}`,
    });
  }

  const count = requireOperandCount(operands, 2);
  if (!count.ok) return count;
  const rd = parseRegister(operands[0]!);
  const immediate = parseImmediate(operands[1]!, -1048576n, 1048574n, 2);
  if (!rd.ok) return rd;
  if (!immediate.ok) return immediate;
  return success({
    mnemonic: definition.mnemonic as JTypeMnemonic,
    format: 'J', rd: rd.value, rs1: null, rs2: null, immediate: immediate.value,
    canonicalAssembly: `${definition.mnemonic} ${registerName(rd.value)}, ${immediate.value}`,
  });
}

function sameAst(left: InstructionAst, right: InstructionAst): boolean {
  return left.mnemonic === right.mnemonic && left.format === right.format && left.rd === right.rd
    && left.rs1 === right.rs1 && left.rs2 === right.rs2 && left.immediate === right.immediate
    && left.canonicalAssembly === right.canonicalAssembly;
}

function validateAst(input: unknown): RiscvResult<InstructionAst> {
  if (typeof input !== 'object' || input === null || !('canonicalAssembly' in input)
    || typeof input.canonicalAssembly !== 'string') {
    return failure('invalid-ast', 'Instruction AST must include canonicalAssembly.');
  }
  const reparsed = parseAssembly({ text: input.canonicalAssembly });
  if (!reparsed.ok || !sameAst(input as InstructionAst, reparsed.value)) {
    return failure('invalid-ast', 'Instruction AST fields do not match its canonical assembly.');
  }
  return reparsed;
}

function toBits(value: number, width: number): string {
  return (value >>> 0).toString(2).padStart(width, '0').slice(-width);
}

function bitField(name: string, value: number, width: number, msb: number, lsb: number): RiscvBitField {
  return { name, value, bits: toBits(value, width), msb, lsb };
}

function immediateField(ast: InstructionAst, word: number): RiscvImmediateField | null {
  if (ast.immediate === null) return null;
  if (ast.format === 'I') {
    const encoded = (word >>> 20) & 0xfff;
    return {
      value: ast.immediate, bits: toBits(encoded, 12), width: 12,
      fragments: [bitField('imm[11:0]', encoded, 12, 31, 20)],
    };
  }
  if (ast.format === 'S') {
    const high = (word >>> 25) & 0x7f;
    const low = (word >>> 7) & 0x1f;
    return {
      value: ast.immediate, bits: toBits(ast.immediate & 0xfff, 12), width: 12,
      fragments: [bitField('imm[11:5]', high, 7, 31, 25), bitField('imm[4:0]', low, 5, 11, 7)],
    };
  }
  if (ast.format === 'B') {
    return {
      value: ast.immediate, bits: toBits(ast.immediate & 0x1fff, 13), width: 13,
      fragments: [
        bitField('imm[12]', (word >>> 31) & 1, 1, 31, 31),
        bitField('imm[10:5]', (word >>> 25) & 0x3f, 6, 30, 25),
        bitField('imm[4:1]', (word >>> 8) & 0xf, 4, 11, 8),
        bitField('imm[11]', (word >>> 7) & 1, 1, 7, 7),
      ],
    };
  }
  if (ast.format === 'U') {
    return {
      value: ast.immediate, bits: toBits(ast.immediate, 20), width: 20,
      fragments: [bitField('imm[31:12]', ast.immediate, 20, 31, 12)],
    };
  }
  return {
    value: ast.immediate, bits: toBits(ast.immediate & 0x1fffff, 21), width: 21,
    fragments: [
      bitField('imm[20]', (word >>> 31) & 1, 1, 31, 31),
      bitField('imm[10:1]', (word >>> 21) & 0x3ff, 10, 30, 21),
      bitField('imm[11]', (word >>> 20) & 1, 1, 20, 20),
      bitField('imm[19:12]', (word >>> 12) & 0xff, 8, 19, 12),
    ],
  };
}

function encodeAst(ast: InstructionAst): EncodedInstruction {
  const definition = DEFINITION_BY_MNEMONIC.get(ast.mnemonic)!;
  let word: number;
  if (ast.format === 'R') {
    word = ((definition.funct7! << 25) | (ast.rs2 << 20) | (ast.rs1 << 15)
      | (definition.funct3! << 12) | (ast.rd << 7) | definition.opcode) >>> 0;
  } else if (ast.format === 'I') {
    const encodedImmediate = definition.syntax === 'shift'
      ? (definition.funct7! << 5) | ast.immediate
      : ast.immediate & 0xfff;
    word = ((encodedImmediate << 20) | (ast.rs1 << 15) | (definition.funct3! << 12)
      | (ast.rd << 7) | definition.opcode) >>> 0;
  } else if (ast.format === 'S') {
    const immediate = ast.immediate & 0xfff;
    word = ((((immediate >>> 5) & 0x7f) << 25) | (ast.rs2 << 20) | (ast.rs1 << 15)
      | (definition.funct3! << 12) | ((immediate & 0x1f) << 7) | definition.opcode) >>> 0;
  } else if (ast.format === 'B') {
    const immediate = ast.immediate & 0x1fff;
    word = ((((immediate >>> 12) & 1) << 31) | (((immediate >>> 5) & 0x3f) << 25)
      | (ast.rs2 << 20) | (ast.rs1 << 15) | (definition.funct3! << 12)
      | (((immediate >>> 1) & 0xf) << 8) | (((immediate >>> 11) & 1) << 7)
      | definition.opcode) >>> 0;
  } else if (ast.format === 'U') {
    word = ((ast.immediate << 12) | (ast.rd << 7) | definition.opcode) >>> 0;
  } else {
    const immediate = ast.immediate & 0x1fffff;
    word = ((((immediate >>> 20) & 1) << 31) | (((immediate >>> 1) & 0x3ff) << 21)
      | (((immediate >>> 11) & 1) << 20) | (((immediate >>> 12) & 0xff) << 12)
      | (ast.rd << 7) | definition.opcode) >>> 0;
  }

  const fields: EncodedInstructionFields = {
    format: ast.format,
    opcode: bitField('opcode', definition.opcode, 7, 6, 0),
    rd: ast.rd === null ? null : bitField('rd', ast.rd, 5, 11, 7),
    rs1: ast.rs1 === null ? null : bitField('rs1', ast.rs1, 5, 19, 15),
    rs2: ast.rs2 === null ? null : bitField('rs2', ast.rs2, 5, 24, 20),
    funct3: definition.funct3 === null ? null : bitField('funct3', definition.funct3, 3, 14, 12),
    funct7: definition.funct7 === null ? null : bitField('funct7', definition.funct7, 7, 31, 25),
    immediate: immediateField(ast, word),
  };
  return {
    instruction: ast,
    canonicalAssembly: ast.canonicalAssembly,
    word,
    hex: `0x${word.toString(16).padStart(8, '0')}`,
    bits: toBits(word, 32),
    fields,
  };
}

export function encodeInstruction(input: EncodeInstructionInput): RiscvResult<EncodedInstruction> {
  if (typeof input !== 'object' || input === null || !('instruction' in input)) {
    return failure('invalid-input', 'Encoding requires an Instruction AST.');
  }
  const instruction = validateAst(input.instruction);
  return instruction.ok ? success(encodeAst(instruction.value)) : instruction;
}

function decodeWordInput(input: DecodeInstructionInput): RiscvResult<number> {
  if (typeof input !== 'object' || input === null) {
    return failure('invalid-machine-code', 'Machine-code input must be an object.');
  }
  const sources = ['word', 'hex', 'bits'].filter((key) => key in input && input[key as keyof typeof input] !== undefined);
  if (sources.length !== 1) return failure('invalid-machine-code', 'Provide exactly one of word, hex, or bits.');
  if ('word' in input) {
    return Number.isInteger(input.word) && input.word! >= 0 && input.word! <= 0xffffffff
      ? success(input.word! >>> 0)
      : failure('invalid-machine-code', 'word must be a uint32 integer.');
  }
  if ('hex' in input) {
    return typeof input.hex === 'string' && /^0x[0-9a-f]{1,8}$/iu.test(input.hex)
      ? success(Number.parseInt(input.hex.slice(2), 16) >>> 0)
      : failure('invalid-machine-code', 'hex must contain 1 to 8 hexadecimal digits after 0x.');
  }
  return typeof input.bits === 'string' && /^[01]{32}$/u.test(input.bits)
    ? success(Number.parseInt(input.bits, 2) >>> 0)
    : failure('invalid-machine-code', 'bits must contain exactly 32 binary digits.');
}

function signExtend(value: number, width: number): number {
  const shift = 32 - width;
  return (value << shift) >> shift;
}

function definitionForWord(word: number): RiscvResult<InstructionDefinition> {
  const opcode = word & 0x7f;
  const candidates = DEFINITIONS.filter((definition) => definition.opcode === opcode);
  if (candidates.length === 0) return failure('reserved-encoding', `Unsupported or reserved opcode 0x${opcode.toString(16)}.`);
  const funct3 = (word >>> 12) & 0x7;
  const funct7 = (word >>> 25) & 0x7f;
  const definition = candidates.find((candidate) =>
    (candidate.funct3 === null || candidate.funct3 === funct3)
    && (candidate.funct7 === null || candidate.funct7 === funct7));
  return definition
    ? success(definition)
    : failure('reserved-encoding', 'Instruction uses a reserved funct3/funct7 encoding.');
}

function decodedAssembly(word: number, definition: InstructionDefinition): string {
  const rd = (word >>> 7) & 0x1f;
  const rs1 = (word >>> 15) & 0x1f;
  const rs2 = (word >>> 20) & 0x1f;
  if (definition.format === 'R') return `${definition.mnemonic} x${rd}, x${rs1}, x${rs2}`;
  if (definition.format === 'I') {
    const immediate = definition.syntax === 'shift'
      ? (word >>> 20) & 0x1f
      : signExtend((word >>> 20) & 0xfff, 12);
    return definition.syntax === 'load' || definition.syntax === 'jalr'
      ? `${definition.mnemonic} x${rd}, ${immediate}(x${rs1})`
      : `${definition.mnemonic} x${rd}, x${rs1}, ${immediate}`;
  }
  if (definition.format === 'S') {
    const immediate = signExtend((((word >>> 25) & 0x7f) << 5) | ((word >>> 7) & 0x1f), 12);
    return `${definition.mnemonic} x${rs2}, ${immediate}(x${rs1})`;
  }
  if (definition.format === 'B') {
    const immediate = signExtend(
      (((word >>> 31) & 1) << 12) | (((word >>> 7) & 1) << 11)
      | (((word >>> 25) & 0x3f) << 5) | (((word >>> 8) & 0xf) << 1),
      13,
    );
    return `${definition.mnemonic} x${rs1}, x${rs2}, ${immediate}`;
  }
  if (definition.format === 'U') return `${definition.mnemonic} x${rd}, ${(word >>> 12) & 0xfffff}`;
  const immediate = signExtend(
    (((word >>> 31) & 1) << 20) | (((word >>> 12) & 0xff) << 12)
    | (((word >>> 20) & 1) << 11) | (((word >>> 21) & 0x3ff) << 1),
    21,
  );
  return `${definition.mnemonic} x${rd}, ${immediate}`;
}

export function decodeInstruction(input: DecodeInstructionInput): RiscvResult<EncodedInstruction> {
  const word = decodeWordInput(input);
  if (!word.ok) return word;
  const definition = definitionForWord(word.value);
  if (!definition.ok) return definition;
  const instruction = parseAssembly({ text: decodedAssembly(word.value, definition.value) });
  if (!instruction.ok) return failure('reserved-encoding', 'Decoded fields do not form a legal RV32I instruction.');
  const encoded = encodeAst(instruction.value);
  return encoded.word === word.value
    ? success(encoded)
    : failure('reserved-encoding', 'Decoded instruction does not round-trip to the original word.');
}
