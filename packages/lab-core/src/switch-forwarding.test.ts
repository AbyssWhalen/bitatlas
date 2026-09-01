import { describe, expect, it } from 'vitest';
import {
  SWITCH_FORWARDING_Q36_PRESET,
  traceSwitchForwarding,
  type SwitchForwardingConfig,
} from './switch-forwarding';

describe('traceSwitchForwarding', () => {
  it('replays the source-backed destination physical address lookup', () => {
    const trace = traceSwitchForwarding(SWITCH_FORWARDING_Q36_PRESET.config);

    expect(trace.normalizedDestinationMac).toBe('00:11:22:33:44:55');
    expect(trace.selectedPort).toBe('P3');
    expect(trace.matchedEntry).toEqual({ macAddress: '00:11:22:33:44:55', port: 'P3' });
    expect(trace.steps.find((step) => step.id === 'select-port')?.result).toContain('P3');
  });

  it('reports a bounded miss without inventing a flooding decision', () => {
    const config: SwitchForwardingConfig = {
      destinationMac: 'aa:bb:cc:dd:ee:ff',
      forwardingTable: [{ macAddress: '00:11:22:33:44:55', port: 'P3' }],
    };

    const trace = traceSwitchForwarding(config);

    expect(trace.matchedEntry).toBeNull();
    expect(trace.selectedPort).toBeNull();
    expect(trace.steps.find((step) => step.id === 'select-port')?.result).toContain('没有匹配项');
  });

  it('normalizes input and keeps snapshots isolated from caller mutation', () => {
    const table = [{ macAddress: 'aa-bb-cc-dd-ee-ff', port: 'uplink-1' }];
    const config: SwitchForwardingConfig = {
      destinationMac: 'AA:BB:CC:DD:EE:FF',
      forwardingTable: table,
    };

    const trace = traceSwitchForwarding(config);
    table[0]!.port = 'changed';

    expect(trace.normalizedDestinationMac).toBe('AA:BB:CC:DD:EE:FF');
    expect(trace.normalizedTable[0]).toEqual({ macAddress: 'AA:BB:CC:DD:EE:FF', port: 'uplink-1' });
    expect(trace.selectedPort).toBe('uplink-1');
  });

  it.each([
    { name: 'malformed destination', config: { destinationMac: '00:11:22:33:44', forwardingTable: [] } },
    { name: 'duplicate table address', config: { destinationMac: '00:11:22:33:44:55', forwardingTable: [
      { macAddress: '00:11:22:33:44:55', port: 'P1' },
      { macAddress: '00:11:22:33:44:55', port: 'P2' },
    ] } },
    { name: 'invalid port', config: { destinationMac: '00:11:22:33:44:55', forwardingTable: [{ macAddress: '00:11:22:33:44:55', port: 'port with space' }] } },
  ])('rejects $name', ({ config }) => {
    expect(() => traceSwitchForwarding(config)).toThrow();
  });
});
