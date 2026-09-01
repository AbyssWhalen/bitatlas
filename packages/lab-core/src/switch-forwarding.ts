export interface SwitchForwardingEntry {
  readonly macAddress: string;
  readonly port: string;
}

export interface SwitchForwardingConfig {
  readonly destinationMac: string;
  readonly forwardingTable: readonly SwitchForwardingEntry[];
}

export type SwitchForwardingStepId =
  | 'normalize-destination'
  | 'normalize-table'
  | 'lookup-destination'
  | 'select-port'
  | 'source-conclusion';

export interface SwitchForwardingStep {
  readonly id: SwitchForwardingStepId;
  readonly label: string;
  readonly operation: string;
  readonly result: string;
}

export interface SwitchForwardingTrace {
  readonly config: SwitchForwardingConfig;
  readonly normalizedDestinationMac: string;
  readonly normalizedTable: readonly SwitchForwardingEntry[];
  readonly matchedEntry: SwitchForwardingEntry | null;
  readonly selectedPort: string | null;
  readonly layer: 'data-link';
  readonly addressType: 'destination-physical';
  readonly sourceAnswer: 'A';
  readonly steps: readonly SwitchForwardingStep[];
}

export const SWITCH_FORWARDING_Q36_PRESET = {
  sourceQuestionId: 'cn408-2009-q36',
  reviewStatus: 'needs-review',
  config: {
    destinationMac: '00:11:22:33:44:55',
    forwardingTable: [
      { macAddress: '00:11:22:33:44:55', port: 'P3' },
      { macAddress: '10:20:30:40:50:60', port: 'P1' },
      { macAddress: 'AA:BB:CC:DD:EE:FF', port: 'P4' },
    ],
  },
} as const satisfies {
  readonly sourceQuestionId: 'cn408-2009-q36';
  readonly reviewStatus: 'needs-review';
  readonly config: SwitchForwardingConfig;
};

const MAX_TABLE_ENTRIES = 8;
const MAC_GROUP_PATTERN = /^[0-9a-f]{2}$/iu;
const PORT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,11}$/u;

function normalizeMac(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string`);
  }
  const text = input.trim();
  const separator = text.includes('-') ? '-' : ':';
  const groups = text.split(separator);
  if (groups.length !== 6 || groups.some((group) => !MAC_GROUP_PATTERN.test(group))) {
    throw new RangeError(`${label} must contain six hexadecimal octets`);
  }
  if (text.includes(':') && text.includes('-')) {
    throw new RangeError(`${label} must use one MAC separator`);
  }
  return groups.map((group) => group.toUpperCase()).join(':');
}

function normalizePort(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string`);
  }
  const port = input.trim();
  if (!PORT_PATTERN.test(port)) {
    throw new RangeError(`${label} must be 1-12 ASCII letters, digits, '_' or '-'`);
  }
  return port;
}

function validateConfig(config: SwitchForwardingConfig): SwitchForwardingConfig {
  if (typeof config !== 'object' || config === null) {
    throw new TypeError('switch forwarding configuration must be an object');
  }
  if (!Array.isArray(config.forwardingTable) || config.forwardingTable.length > MAX_TABLE_ENTRIES) {
    throw new RangeError(`forwarding table must contain 0-${MAX_TABLE_ENTRIES} entries`);
  }

  const destinationMac = normalizeMac(config.destinationMac, 'destination MAC');
  const seen = new Set<string>();
  const forwardingTable = config.forwardingTable.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new TypeError(`forwarding table entry ${index + 1} must be an object`);
    }
    const macAddress = normalizeMac(entry.macAddress, `forwarding table MAC ${index + 1}`);
    if (seen.has(macAddress)) {
      throw new RangeError(`forwarding table contains duplicate MAC ${macAddress}`);
    }
    seen.add(macAddress);
    return {
      macAddress,
      port: normalizePort(entry.port, `forwarding table port ${index + 1}`),
    };
  });

  return { destinationMac, forwardingTable };
}

export function traceSwitchForwarding(config: SwitchForwardingConfig): SwitchForwardingTrace {
  const normalizedConfig = validateConfig(config);
  const normalizedDestinationMac = normalizedConfig.destinationMac;
  const normalizedTable = normalizedConfig.forwardingTable.map((entry) => ({ ...entry }));
  const matchedEntry = normalizedTable.find((entry) => entry.macAddress === normalizedDestinationMac) ?? null;
  const selectedPort = matchedEntry?.port ?? null;
  const tableSummary = normalizedTable.length === 0
    ? '空转发表'
    : normalizedTable.map((entry) => `${entry.macAddress} → ${entry.port}`).join('；');

  const steps: readonly SwitchForwardingStep[] = [
    {
      id: 'normalize-destination',
      label: '规范化目的 MAC',
      operation: '统一为六组大写十六进制字节',
      result: normalizedDestinationMac,
    },
    {
      id: 'normalize-table',
      label: '读取静态转发表',
      operation: `检查 ${normalizedTable.length} 个有限表项`,
      result: tableSummary,
    },
    {
      id: 'lookup-destination',
      label: '比较目的物理地址',
      operation: `${normalizedDestinationMac} === 表项 MAC`,
      result: matchedEntry ? `命中 ${matchedEntry.macAddress}` : '未命中任何表项',
    },
    {
      id: 'select-port',
      label: '报告转发决策',
      operation: '命中项的端口作为本示例出口',
      result: selectedPort ? `出口端口 ${selectedPort}` : '本示例没有匹配项；不决定泛洪',
    },
    {
      id: 'source-conclusion',
      label: '回到题目结论',
      operation: '数据链路层交换机读取目的物理地址',
      result: '答案 A：目的物理地址',
    },
  ];

  return {
    config: {
      destinationMac: normalizedConfig.destinationMac,
      forwardingTable: normalizedTable.map((entry) => ({ ...entry })),
    },
    normalizedDestinationMac,
    normalizedTable,
    matchedEntry: matchedEntry ? { ...matchedEntry } : null,
    selectedPort,
    layer: 'data-link',
    addressType: 'destination-physical',
    sourceAnswer: 'A',
    steps,
  };
}
