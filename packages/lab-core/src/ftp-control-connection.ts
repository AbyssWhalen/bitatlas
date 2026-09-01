export type FtpChannel = 'control' | 'data';

export interface FtpConnectionConfig {
  readonly selectedChannel: FtpChannel;
}

export interface FtpConnection {
  readonly channel: FtpChannel;
  readonly transport: 'TCP';
  readonly port: 21 | 20;
  readonly purpose: 'FTP 命令' | '文件数据';
}

export type FtpConnectionStepId =
  | 'select-channel'
  | 'identify-transport'
  | 'resolve-port'
  | 'describe-purpose'
  | 'source-conclusion';

export interface FtpConnectionStep {
  readonly id: FtpConnectionStepId;
  readonly label: string;
  readonly operation: string;
  readonly result: string;
}

export interface FtpConnectionTrace {
  readonly config: FtpConnectionConfig;
  readonly selectedChannel: FtpChannel;
  readonly controlConnection: FtpConnection;
  readonly dataConnection: FtpConnection;
  readonly selectedConnection: FtpConnection;
  readonly model: '2009-basic';
  readonly sourceAnswer: 'A';
  readonly steps: readonly FtpConnectionStep[];
}

export const FTP_CONTROL_CONNECTION_Q40_PRESET = {
  sourceQuestionId: 'cn408-2009-q40',
  reviewStatus: 'needs-review',
  config: { selectedChannel: 'control' },
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q40';
  readonly reviewStatus: 'needs-review';
  readonly config: FtpConnectionConfig;
};

function validateConfig(config: FtpConnectionConfig): FtpConnectionConfig {
  if (typeof config !== 'object' || config === null) {
    throw new TypeError('FTP connection configuration must be an object');
  }
  if (config.selectedChannel !== 'control' && config.selectedChannel !== 'data') {
    throw new RangeError('FTP selected channel must be control or data');
  }
  return { selectedChannel: config.selectedChannel };
}

function connection(channel: FtpChannel): FtpConnection {
  return channel === 'control'
    ? { channel, transport: 'TCP', port: 21, purpose: 'FTP 命令' }
    : { channel, transport: 'TCP', port: 20, purpose: '文件数据' };
}

export function traceFtpConnections(config: FtpConnectionConfig): FtpConnectionTrace {
  const normalizedConfig = validateConfig(config);
  const controlConnection = connection('control');
  const dataConnection = connection('data');
  const selectedConnection = normalizedConfig.selectedChannel === 'control'
    ? { ...controlConnection }
    : { ...dataConnection };
  const selectedLabel = normalizedConfig.selectedChannel === 'control' ? '控制连接' : '数据连接';

  const steps: readonly FtpConnectionStep[] = [
    {
      id: 'select-channel',
      label: '选择 FTP 事件',
      operation: '命令事件走控制通道；文件事件走数据通道',
      result: `当前事件：${selectedLabel}`,
    },
    {
      id: 'identify-transport',
      label: '识别传输层协议',
      operation: `${selectedLabel} 建立在传输层之上`,
      result: 'TCP',
    },
    {
      id: 'resolve-port',
      label: '读取基础模型端口',
      operation: `${selectedLabel} 的题设端口映射`,
      result: `TCP/${selectedConnection.port}`,
    },
    {
      id: 'describe-purpose',
      label: '确定连接用途',
      operation: '把通道职责与 FTP 事件对应',
      result: selectedConnection.purpose,
    },
    {
      id: 'source-conclusion',
      label: '回到题目结论',
      operation: '题目询问 FTP 命令连接',
      result: normalizedConfig.selectedChannel === 'control'
        ? '答案 A：建立在 TCP 之上的控制连接'
        : '文件传输使用数据连接；题目问命令时答案仍为 A',
    },
  ];

  return {
    config: normalizedConfig,
    selectedChannel: normalizedConfig.selectedChannel,
    controlConnection: { ...controlConnection },
    dataConnection: { ...dataConnection },
    selectedConnection,
    model: '2009-basic',
    sourceAnswer: 'A',
    steps,
  };
}
