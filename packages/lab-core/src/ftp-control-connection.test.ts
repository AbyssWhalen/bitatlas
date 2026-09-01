import { describe, expect, it } from 'vitest';
import {
  FTP_CONTROL_CONNECTION_Q40_PRESET,
  traceFtpConnections,
  type FtpConnectionConfig,
} from './ftp-control-connection';

describe('traceFtpConnections', () => {
  it('maps FTP commands to the TCP control connection on port 21', () => {
    const trace = traceFtpConnections(FTP_CONTROL_CONNECTION_Q40_PRESET.config);

    expect(trace.selectedChannel).toBe('control');
    expect(trace.selectedConnection).toEqual({
      channel: 'control',
      transport: 'TCP',
      port: 21,
      purpose: 'FTP 命令',
    });
    expect(trace.sourceAnswer).toBe('A');
    expect(trace.steps.find((step) => step.id === 'source-conclusion')?.result).toContain('答案 A');
  });

  it('keeps the data connection distinct for a file-transfer event', () => {
    const trace = traceFtpConnections({ selectedChannel: 'data' });

    expect(trace.selectedConnection).toEqual({
      channel: 'data',
      transport: 'TCP',
      port: 20,
      purpose: '文件数据',
    });
    expect(trace.steps.find((step) => step.id === 'select-channel')?.result).toContain('数据连接');
  });

  it('returns stable independent snapshots', () => {
    const config: FtpConnectionConfig = { selectedChannel: 'control' };
    const first = traceFtpConnections(config);
    const second = traceFtpConnections(config);

    expect(first).toEqual(second);
    expect(first.controlConnection).not.toBe(second.controlConnection);
    expect(first.steps).not.toBe(second.steps);
  });

  it.each([
    undefined,
    { selectedChannel: 'udp' },
    { selectedChannel: '' },
  ])('rejects an unsupported channel value: %j', (config) => {
    expect(() => traceFtpConnections(config as FtpConnectionConfig)).toThrow();
  });
});
