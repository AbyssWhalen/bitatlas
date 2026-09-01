import { describe, expect, it } from 'vitest';
import {
  PIPELINE_PRESETS,
  PIPELINE_TIMING_PRESETS,
  analyzePipelineStageTiming,
  simulateFiveStagePipeline,
  type PipelineStageTimingAnalysis,
  type PipelineResult,
  type PipelineTrace,
} from './index';

function unwrap<T>(result: PipelineResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode(result: PipelineResult<PipelineTrace>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a pipeline validation error.');
  return result.error.code;
}

function timingErrorCode(result: PipelineResult<PipelineStageTimingAnalysis>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a pipeline timing validation error.');
  return result.error.code;
}

describe('general pipeline stage timing', () => {
  it('reproduces the 2009 Q18 four-stage bottleneck without claiming five-stage hazards', () => {
    const preset = PIPELINE_TIMING_PRESETS.find((candidate) => candidate.id === 'cn408-2009-q18-stage-clock');
    expect(preset).toBeDefined();
    if (!preset) throw new Error('Missing Q18 timing preset.');

    const analysis = unwrap(analyzePipelineStageTiming(preset.input));
    expect(preset).toMatchObject({
      expectedClockPeriodNs: 90,
      input: { stageDelaysNs: [90, 80, 70, 60], registerOverheadNs: 0 },
    });
    expect(preset.description).toContain('functional-stage timing');
    expect(analysis).toMatchObject({
      stageCount: 4,
      bottleneckStageIndices: [0],
      clockPeriodNs: 90,
      singleInstructionLatencyNs: 360,
      idealCycles: 4,
      totalTimeNs: 360,
      serialTotalTimeNs: 300,
      speedupVsSerial: 300 / 360,
    });
  });

  it('includes register overhead and reports every tied bottleneck deterministically', () => {
    const input = {
      stageDelaysNs: [10, 20, 20] as const,
      registerOverheadNs: 5,
      instructionCount: 100,
    };
    const first = unwrap(analyzePipelineStageTiming(input));
    const second = unwrap(analyzePipelineStageTiming(input));

    expect(first).toEqual(second);
    expect(first).toEqual({
      stageDelaysNs: [10, 20, 20],
      registerOverheadNs: 5,
      instructionCount: 100,
      stageCount: 3,
      bottleneckStageIndices: [1, 2],
      clockPeriodNs: 25,
      singleInstructionLatencyNs: 75,
      idealCycles: 102,
      totalTimeNs: 2550,
      steadyStateThroughputInstructionsPerNanosecond: 1 / 25,
      steadyStateThroughputInstructionsPerSecond: 1_000_000_000 / 25,
      serialTotalTimeNs: 5000,
      speedupVsSerial: 5000 / 2550,
    });
    expect(input.stageDelaysNs).toEqual([10, 20, 20]);
  });

  it('uses fill-and-drain cycles for one instruction and both accepted boundaries', () => {
    const minimum = unwrap(analyzePipelineStageTiming({
      stageDelaysNs: [1, 2],
      instructionCount: 1,
    }));
    expect(minimum).toMatchObject({
      registerOverheadNs: 0,
      stageCount: 2,
      idealCycles: 2,
      singleInstructionLatencyNs: 4,
      totalTimeNs: 4,
    });

    const maximum = unwrap(analyzePipelineStageTiming({
      stageDelaysNs: Array.from({ length: 16 }, () => 1),
      registerOverheadNs: 0,
      instructionCount: 1_000_000,
    }));
    expect(maximum).toMatchObject({ stageCount: 16, idealCycles: 1_000_015 });
  });

  it.each([
    [null, 'invalid-input'],
    [{ stageDelaysNs: [], instructionCount: 1 }, 'invalid-stage-count'],
    [{ stageDelaysNs: [1], instructionCount: 1 }, 'invalid-stage-count'],
    [{ stageDelaysNs: Array.from({ length: 17 }, () => 1), instructionCount: 1 }, 'invalid-stage-count'],
    [{ stageDelaysNs: [1, 0], instructionCount: 1 }, 'invalid-stage-delay'],
    [{ stageDelaysNs: [1, -1], instructionCount: 1 }, 'invalid-stage-delay'],
    [{ stageDelaysNs: [1, Number.NaN], instructionCount: 1 }, 'invalid-stage-delay'],
    [{ stageDelaysNs: [1, Number.POSITIVE_INFINITY], instructionCount: 1 }, 'invalid-stage-delay'],
    [{ stageDelaysNs: [1, 2], registerOverheadNs: -1, instructionCount: 1 }, 'invalid-register-overhead'],
    [{ stageDelaysNs: [1, 2], registerOverheadNs: Number.NaN, instructionCount: 1 }, 'invalid-register-overhead'],
    [{ stageDelaysNs: [1, 2], registerOverheadNs: Number.POSITIVE_INFINITY, instructionCount: 1 }, 'invalid-register-overhead'],
    [{ stageDelaysNs: [1, 2], instructionCount: 0 }, 'invalid-instruction-count'],
    [{ stageDelaysNs: [1, 2], instructionCount: 1.5 }, 'invalid-instruction-count'],
    [{ stageDelaysNs: [1, 2], instructionCount: 1_000_001 }, 'invalid-instruction-count'],
    [{ stageDelaysNs: [Number.MAX_VALUE, Number.MAX_VALUE], instructionCount: 1 }, 'timing-overflow'],
  ] as const)('rejects invalid timing input %#', (input, code) => {
    expect(timingErrorCode(analyzePipelineStageTiming(input as never))).toBe(code);
  });
});

describe('five-stage forwarding and hazards', () => {
  const forwardingProgram = [
    'addi x1, x0, 5',
    'add x2, x1, x1',
    'sub x3, x2, x1',
  ] as const;

  it('forwards from EX/MEM and MEM/WB with the youngest producer taking priority', () => {
    const trace = unwrap(simulateFiveStagePipeline({ program: forwardingProgram }));

    expect(trace.termination).toBe('drained');
    expect(trace.finalRegisters.slice(0, 4)).toEqual([0, 5, 10, 5]);
    expect(trace.summary).toMatchObject({
      cycles: 7,
      retired: 3,
      stalls: 0,
      flushes: 0,
      forwardings: 4,
    });
    expect(trace.cycles.flatMap((cycle) => cycle.events.forwarding).map((event) => (
      `${event.source}:${event.operand}:x${event.register}`
    ))).toEqual([
      'EX/MEM:rs1:x1',
      'EX/MEM:rs2:x1',
      'EX/MEM:rs1:x2',
      'MEM/WB:rs2:x1',
    ]);
  });

  it('inserts the necessary RAW stalls when forwarding is disabled', () => {
    const trace = unwrap(simulateFiveStagePipeline({
      program: forwardingProgram,
      forwarding: false,
    }));

    expect(trace.finalRegisters.slice(0, 4)).toEqual([0, 5, 10, 5]);
    expect(trace.summary).toMatchObject({
      cycles: 11,
      retired: 3,
      stalls: 4,
      forwardings: 0,
    });
    expect(trace.cycles.filter((cycle) => cycle.events.stall !== null)).toHaveLength(4);
    expect(trace.cycles.flatMap((cycle) => cycle.events.forwarding)).toEqual([]);
  });

  it('stalls once after lw, then forwards the loaded word and forwarded store data', () => {
    const trace = unwrap(simulateFiveStagePipeline({
      program: [
        'lw x2, 0(x1)',
        'add x3, x2, x2',
        'sw x3, 4(x1)',
      ],
      initialRegisters: [{ register: 1, value: 0x100 }],
      initialMemory: [{ address: 0x100, value: 7 }],
    }));

    expect(trace.finalRegisters[2]).toBe(7);
    expect(trace.finalRegisters[3]).toBe(14);
    expect(trace.initialRegisters[1]).toBe(0x100);
    expect(trace.initialMemory).toEqual([{ address: 0x100, value: 7 }]);
    expect(trace.finalMemory).toEqual([
      { address: 0x100, value: 7 },
      { address: 0x104, value: 14 },
    ]);
    expect(trace.summary).toMatchObject({ stalls: 1, forwardings: 3 });
    expect(trace.cycles.find((cycle) => cycle.events.stall !== null)?.events.stall).toMatchObject({
      kind: 'load-use',
      register: 2,
    });
    expect(trace.cycles.flatMap((cycle) => cycle.events.memoryAccess)).toEqual([
      expect.objectContaining({ operation: 'read', address: 0x100, value: 7, misaligned: false }),
      expect.objectContaining({ operation: 'write', address: 0x104, value: 14, misaligned: false }),
    ]);
  });

  it('waits for load writeback when forwarding is disabled', () => {
    const trace = unwrap(simulateFiveStagePipeline({
      program: ['lw x2, 0(x1)', 'addi x3, x2, 1'],
      initialRegisters: [{ register: 1, value: 0x100 }],
      initialMemory: [{ address: 0x100, value: 7 }],
      forwarding: false,
    }));

    expect(trace.finalRegisters[3]).toBe(8);
    expect(trace.summary).toMatchObject({ cycles: 8, stalls: 2, forwardings: 0 });
    expect(trace.cycles.filter((cycle) => cycle.events.stall?.kind === 'load-use')).toHaveLength(2);
  });
});

describe('five-stage control flow and architectural state', () => {
  it('resolves beq in EX, flushes both younger instructions, and fetches the target', () => {
    const trace = unwrap(simulateFiveStagePipeline({
      program: [
        'addi x1, x0, 1',
        'addi x2, x0, 1',
        'beq x1, x2, 12',
        'addi x3, x0, 99',
        'sw x3, 0(x0)',
        'addi x3, x0, 7',
      ],
    }));

    expect(trace.finalRegisters[3]).toBe(7);
    expect(trace.finalMemory).toEqual([]);
    expect(trace.summary).toMatchObject({ cycles: 10, retired: 4, flushes: 1 });
    const branchCycle = trace.cycles.find((cycle) => cycle.events.flush !== null);
    expect(branchCycle?.events.flush).toMatchObject({
      kind: 'taken-branch',
      targetPc: 20,
    });
    expect(branchCycle?.events.flush?.flushed.map((instruction) => instruction.programIndex)).toEqual([3, 4]);
    expect(branchCycle?.stages.find((stage) => stage.id === 'ID')?.status).toBe('flushed');
    expect(branchCycle?.stages.find((stage) => stage.id === 'IF')?.status).toBe('flushed');
  });

  it('suppresses x0 writes and wraps ALU results and addresses to uint32', () => {
    const trace = unwrap(simulateFiveStagePipeline({
      program: [
        'addi x0, x0, 1',
        'addi x2, x0, -1',
        'add x3, x2, x2',
        'sw x3, 8(x1)',
      ],
      initialRegisters: [
        { register: 0, value: 123 },
        { register: 1, value: 0xffff_fffc },
      ],
    }));

    expect(trace.finalRegisters[0]).toBe(0);
    expect(trace.finalRegisters[2]).toBe(0xffff_ffff);
    expect(trace.finalRegisters[3]).toBe(0xffff_fffe);
    expect(trace.finalMemory).toEqual([{ address: 4, value: 0xffff_fffe }]);
    expect(trace.cycles.flatMap((cycle) => cycle.events.registerWrite)).toContainEqual(
      expect.objectContaining({ register: 0, value: 1, suppressedByX0: true }),
    );
  });

  it('returns a bounded trace instead of losing evidence for a looping program', () => {
    const trace = unwrap(simulateFiveStagePipeline({
      program: ['beq x0, x0, 0'],
      maxCycles: 12,
    }));

    expect(trace.termination).toBe('max-cycles');
    expect(trace.cycles).toHaveLength(12);
    expect(trace.summary.cycles).toBe(12);
    expect(trace.summary.flushes).toBeGreaterThan(0);

    const fetched = trace.cycles
      .map((cycle) => cycle.stages.find((stage) => stage.id === 'IF')?.instruction ?? null)
      .filter((instruction) => instruction !== null);
    expect(new Set(fetched.map((instruction) => instruction.instanceId)).size).toBe(fetched.length);
    expect(new Set(fetched.map((instruction) => instruction.programIndex))).toEqual(new Set([0]));
  });
});

describe('pipeline input boundaries and presets', () => {
  it.each([
    [{ program: [] }, 'empty-program'],
    [{ program: Array.from({ length: 65 }, () => 'addi x1, x1, 1') }, 'program-too-large'],
    [{ program: ['and x1, x2, x3'] }, 'unsupported-instruction'],
    [{ program: ['not-an-instruction'] }, 'invalid-instruction'],
    [{ program: ['addi x1, x0, 1'], maxCycles: 0 }, 'invalid-max-cycles'],
    [{ program: ['addi x1, x0, 1'], maxCycles: 513 }, 'invalid-max-cycles'],
    [{ program: ['addi x1, x0, 1'], initialRegisters: [{ register: 32, value: 1 }] }, 'invalid-register'],
    [{ program: ['addi x1, x0, 1'], initialRegisters: [{ register: 1, value: -1 }] }, 'invalid-register-value'],
    [{
      program: ['addi x1, x0, 1'],
      initialRegisters: [{ register: 1, value: 1 }, { register: 1, value: 2 }],
    }, 'duplicate-register'],
    [{
      program: ['lw x1, 0(x0)'],
      initialMemory: [{ address: 0, value: 1 }, { address: 0, value: 2 }],
    }, 'duplicate-memory-address'],
  ] as const)('rejects invalid input %#', (input, code) => {
    expect(errorCode(simulateFiveStagePipeline(input))).toBe(code);
  });

  it('ships deterministic, runnable presets for each hazard class', () => {
    expect(PIPELINE_PRESETS.map((preset) => preset.id)).toEqual([
      'alu-forwarding-chain',
      'load-use-stall',
      'taken-branch-flush',
    ]);

    for (const preset of PIPELINE_PRESETS) {
      const input = {
        program: preset.program,
        initialRegisters: preset.initialRegisters,
        initialMemory: preset.initialMemory,
        forwarding: preset.forwarding,
      };
      const first = unwrap(simulateFiveStagePipeline(input));
      const second = unwrap(simulateFiveStagePipeline(input));
      expect(first).toEqual(second);
      expect(first.termination).toBe('drained');
    }
  });
});
