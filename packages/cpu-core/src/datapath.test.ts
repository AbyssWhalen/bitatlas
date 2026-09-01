import { describe, expect, it } from 'vitest';
import { encodeInstruction, parseAssembly, type EncodedInstruction, type RiscvResult } from './riscv';
import { executeSingleCycle, type DatapathResult, type SingleCycleTrace } from './datapath';

function unwrap<T>(result: RiscvResult<T> | DatapathResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function encoded(assembly: string): EncodedInstruction {
  return unwrap(encodeInstruction({ instruction: unwrap(parseAssembly({ text: assembly })) }));
}

function run(
  assembly: string,
  input: Partial<{ pc: number; rs1Value: number; rs2Value: number; memoryReadValue: number }> = {},
): SingleCycleTrace {
  return unwrap(executeSingleCycle({
    instruction: encoded(assembly),
    pc: input.pc ?? 0x1000,
    rs1Value: input.rs1Value ?? 0,
    rs2Value: input.rs2Value ?? 0,
    memoryReadValue: input.memoryReadValue ?? 0,
  }));
}

describe('RV32I single-cycle control', () => {
  it.each([
    ['add x1, x2, x3', { aluOperation: 'add', aluSourceA: 'rs1', aluSourceB: 'rs2', regWrite: true, memoryRead: false, memoryWrite: false, writebackSource: 'alu', pcSource: 'sequential' }],
    ['addi x1, x2, -1', { aluOperation: 'add', aluSourceA: 'rs1', aluSourceB: 'immediate', regWrite: true, memoryRead: false, memoryWrite: false, writebackSource: 'alu', pcSource: 'sequential' }],
    ['lw x1, 4(x2)', { aluOperation: 'add', regWrite: true, memoryRead: true, memoryWrite: false, memoryWidth: 32, writebackSource: 'memory', pcSource: 'sequential' }],
    ['sw x3, 4(x2)', { aluOperation: 'add', regWrite: false, memoryRead: false, memoryWrite: true, memoryWidth: 32, writebackSource: 'none', pcSource: 'sequential' }],
    ['beq x1, x2, 8', { aluOperation: 'sub', regWrite: false, branchCondition: 'eq', writebackSource: 'none', pcSource: 'branch' }],
    ['lui x1, 0x12345', { aluOperation: 'copy-b', aluSourceA: 'zero', aluSourceB: 'upper-immediate', regWrite: true, writebackSource: 'alu', pcSource: 'sequential' }],
    ['auipc x1, 0x12345', { aluOperation: 'add', aluSourceA: 'pc', aluSourceB: 'upper-immediate', regWrite: true, writebackSource: 'alu', pcSource: 'sequential' }],
    ['jal x1, 8', { aluOperation: 'add', aluSourceA: 'pc', aluSourceB: 'immediate', regWrite: true, writebackSource: 'pc+4', pcSource: 'jump' }],
    ['jalr x1, 4(x2)', { aluOperation: 'add', aluSourceA: 'rs1', aluSourceB: 'immediate', regWrite: true, writebackSource: 'pc+4', pcSource: 'jump-register' }],
  ] as const)('derives deterministic control for %s', (assembly, control) => {
    expect(run(assembly).control).toMatchObject(control);
  });

  it.each([
    ['add x1, x2, x3', 'add'],
    ['sub x1, x2, x3', 'sub'],
    ['and x1, x2, x3', 'and'],
    ['or x1, x2, x3', 'or'],
    ['xor x1, x2, x3', 'xor'],
    ['sll x1, x2, x3', 'sll'],
    ['srl x1, x2, x3', 'srl'],
    ['sra x1, x2, x3', 'sra'],
    ['slt x1, x2, x3', 'slt'],
    ['sltu x1, x2, x3', 'sltu'],
    ['addi x1, x2, 1', 'add'],
    ['andi x1, x2, 1', 'and'],
    ['ori x1, x2, 1', 'or'],
    ['xori x1, x2, 1', 'xor'],
    ['slti x1, x2, 1', 'slt'],
    ['sltiu x1, x2, 1', 'sltu'],
    ['slli x1, x2, 1', 'sll'],
    ['srli x1, x2, 1', 'srl'],
    ['srai x1, x2, 1', 'sra'],
  ] as const)('maps %s to the %s ALU operation', (assembly, operation) => {
    expect(run(assembly).control.aluOperation).toBe(operation);
  });

  it.each([
    ['lb x1, 0(x2)', true, false, 8, false],
    ['lh x1, 0(x2)', true, false, 16, false],
    ['lw x1, 0(x2)', true, false, 32, false],
    ['lbu x1, 0(x2)', true, false, 8, true],
    ['lhu x1, 0(x2)', true, false, 16, true],
    ['sb x3, 0(x2)', false, true, 8, false],
    ['sh x3, 0(x2)', false, true, 16, false],
    ['sw x3, 0(x2)', false, true, 32, false],
  ] as const)('derives memory controls for %s', (assembly, read, write, width, unsigned) => {
    expect(run(assembly).control).toMatchObject({
      memoryRead: read,
      memoryWrite: write,
      memoryWidth: width,
      memoryUnsigned: unsigned,
    });
  });

  it.each([
    ['beq x1, x2, 8', 'eq', 7, 7],
    ['bne x1, x2, 8', 'ne', 7, 8],
    ['blt x1, x2, 8', 'lt', 0xffff_ffff, 1],
    ['bge x1, x2, 8', 'ge', 1, 0xffff_ffff],
    ['bltu x1, x2, 8', 'ltu', 1, 0xffff_ffff],
    ['bgeu x1, x2, 8', 'geu', 0xffff_ffff, 1],
  ] as const)('evaluates %s with the %s comparator', (assembly, condition, rs1Value, rs2Value) => {
    const trace = run(assembly, { rs1Value, rs2Value });
    expect(trace.control.branchCondition).toBe(condition);
    expect(trace.execute.branchTaken).toBe(true);
  });
});

describe('RV32I single-cycle execution', () => {
  it('wraps 32-bit arithmetic and suppresses writes to x0', () => {
    expect(run('add x1, x2, x3', { rs1Value: 0xffff_ffff, rs2Value: 2 }).result.registerWrite)
      .toEqual({ register: 1, value: 1 });

    const x0 = run('addi x0, x2, 1', { rs1Value: 41 });
    expect(x0.writeback).toMatchObject({ requested: true, enabled: false, suppressedByX0: true, register: 0, value: 42 });
    expect(x0.result.registerWrite).toBeNull();
  });

  it('distinguishes signed and unsigned ALU comparisons', () => {
    const negativeOne = 0xffff_ffff;
    expect(run('slt x1, x2, x3', { rs1Value: negativeOne, rs2Value: 1 }).execute.result).toBe(1);
    expect(run('sltu x1, x2, x3', { rs1Value: negativeOne, rs2Value: 1 }).execute.result).toBe(0);
    expect(run('sra x1, x2, x3', { rs1Value: 0x8000_0000, rs2Value: 1 }).execute.result).toBe(0xc000_0000);
    expect(run('srl x1, x2, x3', { rs1Value: 0x8000_0000, rs2Value: 1 }).execute.result).toBe(0x4000_0000);
  });

  it('sign-extends and zero-extends loads and masks store data', () => {
    const signedByte = run('lb x5, 4(x2)', { rs1Value: 0x1000, memoryReadValue: 0x0000_0080 });
    expect(signedByte.memory).toMatchObject({ address: 0x1004, read: true, width: 8, readValue: 0xffff_ff80 });
    expect(signedByte.result.registerWrite).toEqual({ register: 5, value: 0xffff_ff80 });

    const unsignedHalf = run('lhu x5, 4(x2)', { rs1Value: 0x1000, memoryReadValue: 0xffff_8001 });
    expect(unsignedHalf.memory.readValue).toBe(0x8001);

    const store = run('sb x3, -1(x2)', { rs1Value: 0x1000, rs2Value: 0x1234_56ab });
    expect(store.result.memoryWrite).toEqual({ address: 0x0fff, width: 8, value: 0xab });
  });

  it('chooses taken and not-taken branch PCs with signed and unsigned comparisons', () => {
    const taken = run('beq x1, x2, 12', { pc: 0x1000, rs1Value: 7, rs2Value: 7 });
    expect(taken.execute).toMatchObject({ branchTaken: true, branchTarget: 0x100c });
    expect(taken.result.nextPc).toBe(0x100c);

    const notTaken = run('beq x1, x2, 12', { pc: 0x1000, rs1Value: 7, rs2Value: 8 });
    expect(notTaken.execute.branchTaken).toBe(false);
    expect(notTaken.result.nextPc).toBe(0x1004);

    expect(run('blt x1, x2, 8', { rs1Value: 0xffff_ffff, rs2Value: 1 }).execute.branchTaken).toBe(true);
    expect(run('bltu x1, x2, 8', { rs1Value: 0xffff_ffff, rs2Value: 1 }).execute.branchTaken).toBe(false);
  });

  it('executes upper-immediate and jump address paths with uint32 wrapping', () => {
    expect(run('lui x1, 0xabcde').result.registerWrite).toEqual({ register: 1, value: 0xabcde000 });
    expect(run('auipc x1, 1', { pc: 0xffff_f800 }).result.registerWrite)
      .toEqual({ register: 1, value: 0x0000_0800 });

    const jal = run('jal x1, 8', { pc: 0xffff_fffc });
    expect(jal.result).toMatchObject({ nextPc: 4, registerWrite: { register: 1, value: 0 } });

    const jalr = run('jalr x1, 3(x2)', { pc: 0x1000, rs1Value: 0x2000 });
    expect(jalr.execute.result).toBe(0x2003);
    expect(jalr.result.nextPc).toBe(0x2002);
    expect(jalr.result.registerWrite).toEqual({ register: 1, value: 0x1004 });
  });

  it('returns all five stages and is deterministic for identical inputs', () => {
    const first = run('sw x3, 4(x2)', { pc: 12, rs1Value: 100, rs2Value: 200 });
    const second = run('sw x3, 4(x2)', { pc: 12, rs1Value: 100, rs2Value: 200 });
    expect(first.stages.map((stage) => stage.id)).toEqual(['IF', 'ID', 'EX', 'MEM', 'WB']);
    expect(second).toEqual(first);
  });

  it.each([
    [{ pc: -1 }, 'invalid-pc'],
    [{ pc: 2 ** 32 }, 'invalid-pc'],
    [{ rs1Value: Number.NaN }, 'invalid-register-value'],
    [{ rs2Value: 2 ** 32 }, 'invalid-register-value'],
    [{ memoryReadValue: -1 }, 'invalid-memory-value'],
  ] as const)('rejects invalid uint32 inputs %#', (overrides, code) => {
    const result = executeSingleCycle({
      instruction: encoded('add x1, x2, x3'),
      pc: 0,
      rs1Value: 0,
      rs2Value: 0,
      memoryReadValue: 0,
      ...overrides,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected datapath validation failure.');
    expect(result.error.code).toBe(code);
  });
});
