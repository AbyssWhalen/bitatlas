import { describe, expect, it } from 'vitest';
import {
  HRRN_Q24_PRESET,
  traceHrrnScheduling,
  type HrrnSchedulingConfig,
} from './hrrn-scheduling';

describe('Q24 highest response ratio next scheduling', () => {
  it('replays the bounded teaching example with response-ratio aging', () => {
    const trace = traceHrrnScheduling(HRRN_Q24_PRESET.config);

    expect(trace.schedule.map((entry) => entry.processId)).toEqual(['P1', 'P3', 'P4', 'P2']);
    expect(trace.schedule.map((entry) => [entry.startTime, entry.endTime])).toEqual([
      [0, 3],
      [3, 5],
      [5, 6],
      [6, 11],
    ]);
    expect(trace.schedule.find((entry) => entry.processId === 'P3')).toMatchObject({
      waitingTime: 1,
      responseRatio: 1.5,
    });
    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial', 'dispatch', 'complete', 'evaluate', 'dispatch', 'complete',
      'evaluate', 'dispatch', 'complete', 'evaluate', 'dispatch', 'complete',
    ]);
    expect(trace.averageWaitingTime).toBe(1.75);
    expect(trace.totalIdleTime).toBe(0);
  });

  it('handles CPU idle time and stable ties without mutating input', () => {
    const config: HrrnSchedulingConfig = {
      processes: [
        { id: 'B', arrivalTime: 4, serviceTime: 2 },
        { id: 'A', arrivalTime: 4, serviceTime: 2 },
      ],
    };
    const first = traceHrrnScheduling(config);
    const second = traceHrrnScheduling(config);

    expect(first).toEqual(second);
    expect(first.steps.map((step) => step.kind)).toEqual([
      'initial', 'idle', 'evaluate', 'dispatch', 'complete', 'evaluate', 'dispatch', 'complete',
    ]);
    expect(first.schedule.map((entry) => entry.processId)).toEqual(['B', 'A']);
    expect(first.totalIdleTime).toBe(4);
    expect(config).toEqual({
      processes: [
        { id: 'B', arrivalTime: 4, serviceTime: 2 },
        { id: 'A', arrivalTime: 4, serviceTime: 2 },
      ],
    });
    expect(first.steps).not.toBe(second.steps);
  });

  it('rejects malformed, duplicate, and oversized process inputs', () => {
    const config = HRRN_Q24_PRESET.config;

    expect(() => traceHrrnScheduling({ processes: [] })).toThrow(/processes/iu);
    expect(() => traceHrrnScheduling({
      processes: [{ id: 'P1', arrivalTime: 0, serviceTime: 0 }],
    })).toThrow(/serviceTime/iu);
    expect(() => traceHrrnScheduling({
      processes: [{ id: 'P1', arrivalTime: 0, serviceTime: 1 }, { id: 'P1', arrivalTime: 1, serviceTime: 1 }],
    })).toThrow(/duplicate/iu);
    expect(() => traceHrrnScheduling({
      processes: Array.from({ length: 13 }, (_, index) => ({ id: `P${index}`, arrivalTime: index, serviceTime: 1 })),
    })).toThrow(/12/iu);
    expect(config.processes).toHaveLength(4);
  });
});
