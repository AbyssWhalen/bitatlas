import { describe, expect, it } from 'vitest';
import {
  CPU_EXPLORER_RISCV_SOURCE_COMMIT,
  decodeInstruction,
  encodeInstruction,
  parseAssembly,
  type RiscvResult,
} from './index';

function unwrap<T>(result: RiscvResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode<T>(result: RiscvResult<T>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected an error result.');
  return result.error.code;
}

function encode(assembly: string) {
  return unwrap(encodeInstruction({ instruction: unwrap(parseAssembly({ text: assembly })) }));
}

describe('RV32I provenance and parsing', () => {
  it('records the pinned CPU Explorer source commit', () => {
    expect(CPU_EXPLORER_RISCV_SOURCE_COMMIT).toBe('94194987e6ed72d437a7b3debdc14adb2aaa4619');
  });

  it('normalizes ABI aliases and memory operands into a strict AST', () => {
    expect(unwrap(parseAssembly({ text: 'add ra, sp, gp' }))).toMatchObject({
      mnemonic: 'add',
      format: 'R',
      rd: 1,
      rs1: 2,
      rs2: 3,
      immediate: null,
      canonicalAssembly: 'add x1, x2, x3',
    });
    expect(unwrap(parseAssembly({ text: 'jalr ra, -4(sp)' }))).toMatchObject({
      mnemonic: 'jalr',
      format: 'I',
      rd: 1,
      rs1: 2,
      rs2: null,
      immediate: -4,
      canonicalAssembly: 'jalr x1, -4(x2)',
    });
  });

  it.each([
    ['add x1abc, x2, x3', 'invalid-register'],
    ['add x1, x2', 'operand-count'],
    ['add x1, x2, x3, x4', 'operand-count'],
    ['addi x1, x2, NaN', 'invalid-immediate'],
    ['addi x1, x2, 12tail', 'invalid-immediate'],
    ['addi x1, x2, 2048', 'immediate-out-of-range'],
    ['slli x1, x2, 32', 'immediate-out-of-range'],
    ['beq x1, x2, 3', 'immediate-alignment'],
    ['jal x1, 1048576', 'immediate-out-of-range'],
    ['lw x1, 4x(x2)', 'invalid-immediate'],
  ])('rejects malformed assembly %s', (text, code) => {
    expect(errorCode(parseAssembly({ text }))).toBe(code);
  });
});

describe('RV32I compatibility golden vectors', () => {
  it.each([
    ['add x1, x2, x3', '0x003100b3'],
    ['addi x1, x2, -1', '0xfff10093'],
    ['lw x5, -4(x6)', '0xffc32283'],
    ['sw x5, 12(x6)', '0x00532623'],
    ['beq x1, x2, 16', '0x00208863'],
    ['lui x5, 0x12345', '0x123452b7'],
    ['jal x1, 8', '0x008000ef'],
  ])('%s encodes to %s and decodes canonically', (assembly, hex) => {
    const encoded = encode(assembly);
    expect(encoded.hex).toBe(hex);
    expect(encoded.word).toBe(Number.parseInt(hex.slice(2), 16));
    expect(encoded.bits).toHaveLength(32);
    expect(unwrap(decodeInstruction({ hex })).canonicalAssembly).toBe(encoded.canonicalAssembly);
  });

  it('returns structured fields for instruction visualization', () => {
    const result = encode('add x1, x2, x3');
    expect(result.fields).toMatchObject({
      format: 'R',
      opcode: { value: 0b0110011, bits: '0110011', msb: 6, lsb: 0 },
      rd: { value: 1, bits: '00001', msb: 11, lsb: 7 },
      rs1: { value: 2, bits: '00010', msb: 19, lsb: 15 },
      rs2: { value: 3, bits: '00011', msb: 24, lsb: 20 },
      funct3: { value: 0, bits: '000', msb: 14, lsb: 12 },
      funct7: { value: 0, bits: '0000000', msb: 31, lsb: 25 },
      immediate: null,
    });

    expect(encode('addi x1, x2, -1').fields.immediate).toMatchObject({
      value: -1,
      bits: '111111111111',
      width: 12,
    });
  });
});

describe('RV32I supported instruction set', () => {
  const instructions = [
    ...['add', 'sub', 'and', 'or', 'xor', 'sll', 'srl', 'sra', 'slt', 'sltu']
      .map((mnemonic) => `${mnemonic} x1, x2, x3`),
    ...['addi', 'andi', 'ori', 'xori', 'slti', 'sltiu']
      .map((mnemonic) => `${mnemonic} x1, x2, -1`),
    ...['slli', 'srli', 'srai'].map((mnemonic) => `${mnemonic} x1, x2, 31`),
    ...['lb', 'lh', 'lw', 'lbu', 'lhu'].map((mnemonic) => `${mnemonic} x1, -4(x2)`),
    ...['sb', 'sh', 'sw'].map((mnemonic) => `${mnemonic} x3, 12(x2)`),
    ...['beq', 'bne', 'blt', 'bge', 'bltu', 'bgeu'].map((mnemonic) => `${mnemonic} x1, x2, 16`),
    'lui x1, 0x12345',
    'auipc x1, 0x12345',
    'jal x1, 8',
    'jalr x1, -4(x2)',
  ];

  it.each(instructions)('round-trips %s through AST, word, and canonical assembly', (assembly) => {
    const encoded = encode(assembly);
    const decoded = unwrap(decodeInstruction({ word: encoded.word }));
    expect(decoded.canonicalAssembly).toBe(encoded.canonicalAssembly);
    expect(decoded.word).toBe(encoded.word);
  });
});

describe('RV32I machine-code validation', () => {
  it('rejects reserved jalr and shift encodings', () => {
    expect(errorCode(decodeInstruction({ hex: '0x00001067' }))).toBe('reserved-encoding');
    expect(errorCode(decodeInstruction({ hex: '0x02001013' }))).toBe('reserved-encoding');
  });

  it('rejects NaN, trailing characters, malformed bits, and ambiguous inputs', () => {
    expect(errorCode(decodeInstruction({ word: Number.NaN }))).toBe('invalid-machine-code');
    expect(errorCode(decodeInstruction({ hex: '0x003100b3tail' }))).toBe('invalid-machine-code');
    expect(errorCode(decodeInstruction({ bits: `${'0'.repeat(31)}x` }))).toBe('invalid-machine-code');
    expect(errorCode(decodeInstruction({ bits: '0'.repeat(31) }))).toBe('invalid-machine-code');
    expect(errorCode(decodeInstruction({ word: 0, hex: '0x00000000' } as never))).toBe('invalid-machine-code');
  });
});
