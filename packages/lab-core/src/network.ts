const UINT32_SIZE = 2 ** 32;
const UINT32_MAX = UINT32_SIZE - 1;

export const MAX_MATERIALIZED_SUBNETS = 4096 as const;

export type NetworkErrorCode =
  | 'invalid-ipv4'
  | 'invalid-uint32'
  | 'invalid-cidr'
  | 'invalid-prefix'
  | 'invalid-host-count'
  | 'invalid-subnet-count'
  | 'insufficient-address-space'
  | 'result-too-large'
  | 'too-few-cidrs'
  | 'non-contiguous'
  | 'overlapping-cidrs'
  | 'aggregate-not-cidr'
  | 'misaligned-aggregate'
  | 'invalid-route';

export interface NetworkError {
  code: NetworkErrorCode;
  message: string;
  details?: Readonly<Record<string, string | number>>;
}

export type NetworkResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: NetworkError };

export interface Ipv4Address {
  value: number;
  text: string;
  octets: readonly [number, number, number, number];
  bits: string;
  dottedBits: string;
}

export interface NetworkCalculationStep {
  id: string;
  label: string;
  operation: string;
  result: string;
  bits?: string;
}

export interface Ipv4Network {
  input: string;
  canonicalCidr: string;
  prefixLength: number;
  inputAddress: Ipv4Address;
  networkAddress: Ipv4Address;
  subnetMask: Ipv4Address;
  wildcardMask: Ipv4Address;
  broadcastAddress: Ipv4Address;
  firstUsableHost: Ipv4Address | null;
  lastUsableHost: Ipv4Address | null;
  totalAddressCount: number;
  usableHostCount: number;
  hostSemantics: 'traditional';
  prefixBits: string;
  hostBits: string;
  steps: readonly NetworkCalculationStep[];
}

export interface FormatCidrInput {
  address: number;
  prefixLength: number;
}

export interface SplitByUsableHostsInput {
  cidr: string;
  minimumUsableHosts: number;
}

export interface SplitBySubnetCountInput {
  cidr: string;
  subnetCount: number;
}

interface SubnetSplitBase {
  parent: Ipv4Network;
  childPrefixLength: number;
  borrowedBits: number;
  generatedSubnetCount: number;
  subnets: readonly Ipv4Network[];
  steps: readonly NetworkCalculationStep[];
}

export interface UsableHostSubnetSplit extends SubnetSplitBase {
  mode: 'usable-hosts';
  minimumUsableHosts: number;
}

export interface SubnetCountSplit extends SubnetSplitBase {
  mode: 'subnet-count';
  requestedSubnetCount: number;
  unusedSubnetCount: number;
}

export interface AggregateCidrsInput {
  cidrs: readonly string[];
}

export interface CidrAggregation {
  children: readonly Ipv4Network[];
  aggregate: Ipv4Network;
  steps: readonly NetworkCalculationStep[];
}

export interface RouteInput {
  id: string;
  cidr: string;
  nextHop?: string;
  metric?: number;
}

export interface LongestPrefixMatchInput {
  address: string;
  routes: readonly RouteInput[];
}

export interface RouteEvaluation {
  route: RouteInput;
  network: Ipv4Network;
  inputIndex: number;
  metric: number;
  matched: boolean;
  destinationPrefixBits: string;
  routePrefixBits: string;
}

export interface LongestPrefixMatchResult {
  address: Ipv4Address;
  evaluations: readonly RouteEvaluation[];
  selected: RouteEvaluation | null;
  steps: readonly NetworkCalculationStep[];
}

export const NETWORK_Q47_PRESET = {
  baseCidr: '202.118.1.0/24',
  requiredSubnetCount: 2,
  expectedSubnets: ['202.118.1.0/25', '202.118.1.128/25'],
  expectedUsableHostsPerSubnet: 126,
  dnsHostRoute: '202.118.3.2/32',
  defaultRoute: '0.0.0.0/0',
  r2Aggregate: '202.118.1.0/24',
  lpmProbeAddress: '202.118.3.2',
} as const;

export interface Q47NetworkGolden {
  split: SubnetCountSplit;
  r2Aggregation: CidrAggregation;
  lpm: LongestPrefixMatchResult;
}

function success<T>(value: T): NetworkResult<T> {
  return { ok: true, value };
}

function failure(
  code: NetworkErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number>>,
): NetworkResult<never> {
  return details ? { ok: false, error: { code, message, details } } : { ok: false, error: { code, message } };
}

function isUint32(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= UINT32_MAX;
}

function toIpv4Address(value: number): Ipv4Address {
  const first = Math.floor(value / 2 ** 24);
  const firstRemainder = value - first * 2 ** 24;
  const second = Math.floor(firstRemainder / 2 ** 16);
  const secondRemainder = firstRemainder - second * 2 ** 16;
  const third = Math.floor(secondRemainder / 2 ** 8);
  const fourth = secondRemainder - third * 2 ** 8;
  const octets = [first, second, third, fourth] as const;
  const bits = value.toString(2).padStart(32, '0');
  return {
    value,
    text: octets.join('.'),
    octets,
    bits,
    dottedBits: bits.match(/.{8}/gu)?.join('.') ?? bits,
  };
}

export function parseIpv4Address(input: unknown): NetworkResult<Ipv4Address> {
  if (typeof input !== 'string') return failure('invalid-ipv4', 'IPv4 address must be a string.');
  const text = input.trim();
  const tokens = text.split('.');
  if (tokens.length !== 4 || tokens.some((token) => !/^(?:0|[1-9][0-9]{0,2})$/u.test(token))) {
    return failure('invalid-ipv4', `Invalid IPv4 address ${JSON.stringify(input)}.`);
  }
  const octets = tokens.map(Number);
  if (octets.some((octet) => octet > 255)) {
    return failure('invalid-ipv4', `IPv4 octets must be between 0 and 255 in ${JSON.stringify(input)}.`);
  }
  const value = octets[0]! * 2 ** 24 + octets[1]! * 2 ** 16 + octets[2]! * 2 ** 8 + octets[3]!;
  return success(toIpv4Address(value));
}

export function formatIpv4Address(value: number): NetworkResult<string> {
  return isUint32(value)
    ? success(toIpv4Address(value).text)
    : failure('invalid-uint32', 'IPv4 value must be a safe unsigned 32-bit integer.', { value: String(value) });
}

function validatePrefixLength(prefixLength: number): NetworkResult<number> {
  return Number.isInteger(prefixLength) && prefixLength >= 0 && prefixLength <= 32
    ? success(prefixLength)
    : failure('invalid-prefix', 'CIDR prefix length must be an integer from 0 through 32.', {
      prefixLength: String(prefixLength),
    });
}

function describeNetwork(inputAddress: Ipv4Address, prefixLength: number, input: string): Ipv4Network {
  const totalAddressCount = 2 ** (32 - prefixLength);
  const networkValue = Math.floor(inputAddress.value / totalAddressCount) * totalAddressCount;
  const broadcastValue = networkValue + totalAddressCount - 1;
  const maskValue = UINT32_MAX - (totalAddressCount - 1);
  const wildcardValue = totalAddressCount - 1;
  const networkAddress = toIpv4Address(networkValue);
  const subnetMask = toIpv4Address(maskValue);
  const wildcardMask = toIpv4Address(wildcardValue);
  const broadcastAddress = toIpv4Address(broadcastValue);
  const hasTraditionalHosts = prefixLength <= 30;
  const firstUsableHost = hasTraditionalHosts ? toIpv4Address(networkValue + 1) : null;
  const lastUsableHost = hasTraditionalHosts ? toIpv4Address(broadcastValue - 1) : null;
  const usableHostCount = hasTraditionalHosts ? totalAddressCount - 2 : 0;
  const prefixBits = networkAddress.bits.slice(0, prefixLength);
  const hostBits = networkAddress.bits.slice(prefixLength);
  const canonicalCidr = `${networkAddress.text}/${prefixLength}`;
  const steps: readonly NetworkCalculationStep[] = [
    {
      id: 'mask',
      label: 'Subnet mask',
      operation: `${prefixLength} network bits followed by ${32 - prefixLength} host bits`,
      result: subnetMask.text,
      bits: subnetMask.dottedBits,
    },
    {
      id: 'network',
      label: 'Network address',
      operation: 'address AND subnet mask (evaluated with unsigned arithmetic)',
      result: networkAddress.text,
      bits: networkAddress.dottedBits,
    },
    {
      id: 'broadcast',
      label: 'Broadcast address',
      operation: 'network address + address count - 1',
      result: broadcastAddress.text,
      bits: broadcastAddress.dottedBits,
    },
    {
      id: 'hosts',
      label: 'Traditional usable host range',
      operation: hasTraditionalHosts ? 'network + 1 through broadcast - 1' : 'no traditional usable host addresses',
      result: firstUsableHost && lastUsableHost
        ? `${firstUsableHost.text} - ${lastUsableHost.text} (${usableHostCount})`
        : 'none (0)',
    },
  ];
  return {
    input,
    canonicalCidr,
    prefixLength,
    inputAddress,
    networkAddress,
    subnetMask,
    wildcardMask,
    broadcastAddress,
    firstUsableHost,
    lastUsableHost,
    totalAddressCount,
    usableHostCount,
    hostSemantics: 'traditional',
    prefixBits,
    hostBits,
    steps,
  };
}

export function parseCidr(input: unknown): NetworkResult<Ipv4Network> {
  if (typeof input !== 'string') return failure('invalid-cidr', 'CIDR must be a string.');
  const text = input.trim();
  const match = /^([^/]+)\/(0|[1-9][0-9]?)$/u.exec(text);
  if (!match?.[1] || match[2] === undefined) {
    return failure('invalid-cidr', `Invalid CIDR ${JSON.stringify(input)}.`);
  }
  const address = parseIpv4Address(match[1]);
  if (!address.ok) return address;
  const prefixLength = Number(match[2]);
  const validPrefix = validatePrefixLength(prefixLength);
  if (!validPrefix.ok) return validPrefix;
  return success(describeNetwork(address.value, validPrefix.value, text));
}

export function formatCidr(input: FormatCidrInput): NetworkResult<string> {
  if (typeof input !== 'object' || input === null) return failure('invalid-cidr', 'CIDR format input must be an object.');
  if (!isUint32(input.address)) {
    return failure('invalid-uint32', 'CIDR address must be a safe unsigned 32-bit integer.', {
      address: String(input.address),
    });
  }
  const prefixLength = validatePrefixLength(input.prefixLength);
  if (!prefixLength.ok) return prefixLength;
  return success(describeNetwork(toIpv4Address(input.address), prefixLength.value, '').canonicalCidr);
}

function validateMaterializationCount(count: number): NetworkResult<number> {
  return count <= MAX_MATERIALIZED_SUBNETS
    ? success(count)
    : failure(
      'result-too-large',
      `Refusing to materialize ${count} subnets; the deterministic limit is ${MAX_MATERIALIZED_SUBNETS}.`,
      { count, limit: MAX_MATERIALIZED_SUBNETS },
    );
}

function materializeSubnets(parent: Ipv4Network, childPrefixLength: number): NetworkResult<readonly Ipv4Network[]> {
  const count = 2 ** (childPrefixLength - parent.prefixLength);
  const withinLimit = validateMaterializationCount(count);
  if (!withinLimit.ok) return withinLimit;
  const childAddressCount = 2 ** (32 - childPrefixLength);
  const subnets = Array.from({ length: count }, (_, index) => {
    const address = toIpv4Address(parent.networkAddress.value + index * childAddressCount);
    return describeNetwork(address, childPrefixLength, `${address.text}/${childPrefixLength}`);
  });
  return success(subnets);
}

export function splitByUsableHosts(input: SplitByUsableHostsInput): NetworkResult<UsableHostSubnetSplit> {
  if (typeof input !== 'object' || input === null) {
    return failure('invalid-host-count', 'Usable-host split input must be an object.');
  }
  const parent = parseCidr(input.cidr);
  if (!parent.ok) return parent;
  if (!Number.isSafeInteger(input.minimumUsableHosts) || input.minimumUsableHosts < 1
    || input.minimumUsableHosts > UINT32_SIZE - 2) {
    return failure('invalid-host-count', 'Minimum usable hosts must be an integer from 1 through 4294967294.', {
      minimumUsableHosts: String(input.minimumUsableHosts),
    });
  }
  let requiredHostBits = 2;
  while (2 ** requiredHostBits - 2 < input.minimumUsableHosts && requiredHostBits < 32) requiredHostBits += 1;
  const childPrefixLength = 32 - requiredHostBits;
  if (childPrefixLength < parent.value.prefixLength) {
    return failure(
      'insufficient-address-space',
      `${parent.value.canonicalCidr} cannot provide ${input.minimumUsableHosts} traditional usable hosts per subnet.`,
      { minimumUsableHosts: input.minimumUsableHosts },
    );
  }
  const subnets = materializeSubnets(parent.value, childPrefixLength);
  if (!subnets.ok) return subnets;
  const borrowedBits = childPrefixLength - parent.value.prefixLength;
  const generatedSubnetCount = subnets.value.length;
  return success({
    mode: 'usable-hosts',
    parent: parent.value,
    minimumUsableHosts: input.minimumUsableHosts,
    childPrefixLength,
    borrowedBits,
    generatedSubnetCount,
    subnets: subnets.value,
    steps: [
      {
        id: 'host-bits',
        label: 'Choose host bits',
        operation: `smallest h where 2^h - 2 >= ${input.minimumUsableHosts}`,
        result: `${requiredHostBits} host bits; /${childPrefixLength}`,
      },
      {
        id: 'borrow',
        label: 'Borrow subnet bits',
        operation: `${childPrefixLength} - ${parent.value.prefixLength}`,
        result: `${borrowedBits} bits`,
      },
      {
        id: 'materialize',
        label: 'Enumerate subnets',
        operation: `2^${borrowedBits}`,
        result: `${generatedSubnetCount} subnets`,
      },
    ],
  });
}

export function splitBySubnetCount(input: SplitBySubnetCountInput): NetworkResult<SubnetCountSplit> {
  if (typeof input !== 'object' || input === null) {
    return failure('invalid-subnet-count', 'Subnet-count split input must be an object.');
  }
  const parent = parseCidr(input.cidr);
  if (!parent.ok) return parent;
  if (!Number.isSafeInteger(input.subnetCount) || input.subnetCount < 1 || input.subnetCount > UINT32_SIZE) {
    return failure('invalid-subnet-count', 'Subnet count must be an integer from 1 through 4294967296.', {
      subnetCount: String(input.subnetCount),
    });
  }
  const borrowedBits = Math.ceil(Math.log2(input.subnetCount));
  const childPrefixLength = parent.value.prefixLength + borrowedBits;
  if (childPrefixLength > 32) {
    return failure(
      'insufficient-address-space',
      `${parent.value.canonicalCidr} cannot be split into ${input.subnetCount} subnets.`,
      { subnetCount: input.subnetCount },
    );
  }
  const generatedSubnetCount = 2 ** borrowedBits;
  const withinLimit = validateMaterializationCount(generatedSubnetCount);
  if (!withinLimit.ok) return withinLimit;
  const subnets = materializeSubnets(parent.value, childPrefixLength);
  if (!subnets.ok) return subnets;
  return success({
    mode: 'subnet-count',
    parent: parent.value,
    requestedSubnetCount: input.subnetCount,
    childPrefixLength,
    borrowedBits,
    generatedSubnetCount,
    unusedSubnetCount: generatedSubnetCount - input.subnetCount,
    subnets: subnets.value,
    steps: [
      {
        id: 'borrow',
        label: 'Choose subnet bits',
        operation: `smallest s where 2^s >= ${input.subnetCount}`,
        result: `${borrowedBits} bits; /${childPrefixLength}`,
      },
      {
        id: 'materialize',
        label: 'Enumerate subnets',
        operation: `2^${borrowedBits}`,
        result: `${generatedSubnetCount} subnets`,
      },
    ],
  });
}

export function aggregateCidrs(input: AggregateCidrsInput): NetworkResult<CidrAggregation> {
  if (typeof input !== 'object' || input === null || !Array.isArray(input.cidrs) || input.cidrs.length < 2) {
    return failure('too-few-cidrs', 'At least two CIDRs are required for aggregation.');
  }
  const parsed: Ipv4Network[] = [];
  for (const cidr of input.cidrs) {
    const network = parseCidr(cidr);
    if (!network.ok) return network;
    parsed.push(network.value);
  }
  const children = [...parsed].sort((left, right) =>
    left.networkAddress.value - right.networkAddress.value || left.prefixLength - right.prefixLength);
  for (let index = 1; index < children.length; index += 1) {
    const previous = children[index - 1]!;
    const current = children[index]!;
    if (current.networkAddress.value <= previous.broadcastAddress.value) {
      return failure('overlapping-cidrs', `${previous.canonicalCidr} overlaps ${current.canonicalCidr}.`);
    }
    if (current.networkAddress.value !== previous.broadcastAddress.value + 1) {
      return failure('non-contiguous', `${previous.canonicalCidr} and ${current.canonicalCidr} leave an address gap.`);
    }
  }
  const totalAddressCount = children.reduce((total, child) => total + child.totalAddressCount, 0);
  const aggregateHostBits = Math.log2(totalAddressCount);
  if (!Number.isInteger(aggregateHostBits)) {
    return failure('aggregate-not-cidr', `${totalAddressCount} addresses cannot form one CIDR block.`, {
      totalAddressCount,
    });
  }
  const firstAddress = children[0]!.networkAddress.value;
  if (firstAddress % totalAddressCount !== 0) {
    return failure('misaligned-aggregate', 'The contiguous address range is not aligned to its aggregate size.', {
      firstAddress,
      totalAddressCount,
    });
  }
  const aggregatePrefix = 32 - aggregateHostBits;
  const aggregate = describeNetwork(
    toIpv4Address(firstAddress),
    aggregatePrefix,
    `${toIpv4Address(firstAddress).text}/${aggregatePrefix}`,
  );
  if (aggregate.broadcastAddress.value !== children.at(-1)!.broadcastAddress.value) {
    return failure('aggregate-not-cidr', 'The candidate aggregate contains addresses outside the input CIDRs.');
  }
  return success({
    children,
    aggregate,
    steps: [
      {
        id: 'sort',
        label: 'Sort networks',
        operation: 'ascending unsigned network address',
        result: children.map((child) => child.canonicalCidr).join(', '),
      },
      {
        id: 'contiguous',
        label: 'Check continuity',
        operation: 'each next network starts after the previous broadcast',
        result: 'no gaps or overlaps',
      },
      {
        id: 'size',
        label: 'Check total size',
        operation: `sum address counts and require a power of two`,
        result: `${totalAddressCount} = 2^${aggregateHostBits}`,
      },
      {
        id: 'alignment',
        label: 'Check alignment',
        operation: `${firstAddress} mod ${totalAddressCount}`,
        result: '0',
      },
      {
        id: 'aggregate',
        label: 'Build aggregate',
        operation: `32 - ${aggregateHostBits} host bits`,
        result: aggregate.canonicalCidr,
        bits: `${aggregate.prefixBits}${'-'.repeat(aggregate.hostBits.length)}`,
      },
    ],
  });
}

function validateRoute(route: RouteInput, inputIndex: number): NetworkResult<{ network: Ipv4Network; metric: number }> {
  if (typeof route !== 'object' || route === null || typeof route.id !== 'string' || route.id.trim() === '') {
    return failure('invalid-route', `Route ${inputIndex} must have a non-empty id.`, { inputIndex });
  }
  if (route.metric !== undefined
    && (!Number.isSafeInteger(route.metric) || route.metric < 0)) {
    return failure('invalid-route', `Route ${route.id} has an invalid metric.`, { inputIndex });
  }
  if (route.nextHop !== undefined && typeof route.nextHop !== 'string') {
    return failure('invalid-route', `Route ${route.id} has an invalid next hop.`, { inputIndex });
  }
  const network = parseCidr(route.cidr);
  if (!network.ok) return failure('invalid-route', `Route ${route.id} has an invalid CIDR.`, { inputIndex });
  return success({ network: network.value, metric: route.metric ?? 0 });
}

export function longestPrefixMatch(input: LongestPrefixMatchInput): NetworkResult<LongestPrefixMatchResult> {
  if (typeof input !== 'object' || input === null || !Array.isArray(input.routes)) {
    return failure('invalid-route', 'Longest-prefix-match input must include a route array.');
  }
  const address = parseIpv4Address(input.address);
  if (!address.ok) return address;
  const evaluations: RouteEvaluation[] = [];
  for (const [inputIndex, route] of input.routes.entries()) {
    const validated = validateRoute(route, inputIndex);
    if (!validated.ok) return validated;
    const { network, metric } = validated.value;
    const matched = address.value.value >= network.networkAddress.value
      && address.value.value <= network.broadcastAddress.value;
    evaluations.push({
      route,
      network,
      inputIndex,
      metric,
      matched,
      destinationPrefixBits: address.value.bits.slice(0, network.prefixLength),
      routePrefixBits: network.prefixBits,
    });
  }
  const selected = evaluations
    .filter((evaluation) => evaluation.matched)
    .sort((left, right) =>
      right.network.prefixLength - left.network.prefixLength
      || left.metric - right.metric
      || left.inputIndex - right.inputIndex)[0] ?? null;
  const comparisonSteps = evaluations.map<NetworkCalculationStep>((evaluation) => ({
    id: `route-${evaluation.inputIndex}`,
    label: `Compare ${evaluation.route.id}`,
    operation: `${evaluation.destinationPrefixBits || '(empty)'} vs ${evaluation.routePrefixBits || '(empty)'} at /${evaluation.network.prefixLength}`,
    result: evaluation.matched ? 'match' : 'no match',
    bits: evaluation.routePrefixBits,
  }));
  return success({
    address: address.value,
    evaluations,
    selected,
    steps: [
      ...comparisonSteps,
      {
        id: 'select',
        label: 'Select route',
        operation: 'longest prefix, then lowest metric, then earliest input',
        result: selected ? `${selected.route.id} (${selected.network.canonicalCidr})` : 'no matching route',
      },
    ],
  });
}

export function buildQ47NetworkGolden(): NetworkResult<Q47NetworkGolden> {
  const split = splitBySubnetCount({
    cidr: NETWORK_Q47_PRESET.baseCidr,
    subnetCount: NETWORK_Q47_PRESET.requiredSubnetCount,
  });
  if (!split.ok) return split;
  const r2Aggregation = aggregateCidrs({ cidrs: NETWORK_Q47_PRESET.expectedSubnets });
  if (!r2Aggregation.ok) return r2Aggregation;
  const lpm = longestPrefixMatch({
    address: NETWORK_Q47_PRESET.lpmProbeAddress,
    routes: [
      { id: 'default', cidr: NETWORK_Q47_PRESET.defaultRoute, nextHop: 'upstream', metric: 100 },
      { id: 'r2-summary', cidr: NETWORK_Q47_PRESET.r2Aggregate, nextHop: 'R2', metric: 10 },
      { id: 'dns-host', cidr: NETWORK_Q47_PRESET.dnsHostRoute, nextHop: 'direct', metric: 50 },
    ],
  });
  if (!lpm.ok) return lpm;
  return success({ split: split.value, r2Aggregation: r2Aggregation.value, lpm: lpm.value });
}
