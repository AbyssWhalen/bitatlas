import { describe, expect, it } from 'vitest';
import {
  NETWORK_Q47_PRESET,
  aggregateCidrs,
  buildQ47NetworkGolden,
  formatCidr,
  formatIpv4Address,
  longestPrefixMatch,
  parseCidr,
  parseIpv4Address,
  splitBySubnetCount,
  splitByUsableHosts,
  type NetworkResult,
} from './network';

function unwrap<T>(result: NetworkResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode<T>(result: NetworkResult<T>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a network error.');
  return result.error.code;
}

describe('strict IPv4 parsing and formatting', () => {
  it.each([
    ['0.0.0.0', 0, '00000000000000000000000000000000'],
    ['202.118.1.255', 3_396_731_391, '11001010011101100000000111111111'],
    ['255.255.255.255', 4_294_967_295, '11111111111111111111111111111111'],
  ])('parses %s as an unsigned 32-bit value', (text, value, bits) => {
    expect(unwrap(parseIpv4Address(text))).toEqual({
      value,
      text,
      octets: text.split('.').map(Number),
      bits,
      dottedBits: bits.match(/.{8}/gu)?.join('.'),
    });
    expect(unwrap(formatIpv4Address(value))).toBe(text);
  });

  it.each([
    '',
    '1.2.3',
    '1.2.3.4.5',
    '1.2.3.-1',
    '1.2.3.256',
    '01.2.3.4',
    '1.2.3.4tail',
    '1..3.4',
  ])('rejects malformed address %j', (input) => {
    expect(errorCode(parseIpv4Address(input))).toBe('invalid-ipv4');
  });

  it('rejects invalid unsigned formatter values', () => {
    expect(errorCode(formatIpv4Address(-1))).toBe('invalid-uint32');
    expect(errorCode(formatIpv4Address(2 ** 32))).toBe('invalid-uint32');
    expect(errorCode(formatIpv4Address(Number.NaN))).toBe('invalid-uint32');
    expect(errorCode(formatIpv4Address(1.5))).toBe('invalid-uint32');
  });
});

describe('CIDR network calculation', () => {
  it('normalizes a host address and returns mask, broadcast, host range, and visualization fields', () => {
    const network = unwrap(parseCidr('202.118.1.42/24'));
    expect(network.canonicalCidr).toBe('202.118.1.0/24');
    expect(network.inputAddress.text).toBe('202.118.1.42');
    expect(network.networkAddress.text).toBe('202.118.1.0');
    expect(network.subnetMask.text).toBe('255.255.255.0');
    expect(network.wildcardMask.text).toBe('0.0.0.255');
    expect(network.broadcastAddress.text).toBe('202.118.1.255');
    expect(network.firstUsableHost?.text).toBe('202.118.1.1');
    expect(network.lastUsableHost?.text).toBe('202.118.1.254');
    expect(network.totalAddressCount).toBe(256);
    expect(network.usableHostCount).toBe(254);
    expect(network.prefixBits).toBe('110010100111011000000001');
    expect(network.hostBits).toBe('00000000');
    expect(network.steps.map((step) => step.id)).toEqual(['mask', 'network', 'broadcast', 'hosts']);
  });

  it('covers /0, /31, and /32 under explicit traditional host semantics', () => {
    const all = unwrap(parseCidr('255.255.255.255/0'));
    expect(all.canonicalCidr).toBe('0.0.0.0/0');
    expect(all.subnetMask.text).toBe('0.0.0.0');
    expect(all.broadcastAddress.text).toBe('255.255.255.255');
    expect(all.totalAddressCount).toBe(2 ** 32);
    expect(all.usableHostCount).toBe(2 ** 32 - 2);
    expect(all.prefixBits).toBe('');
    expect(all.hostBits).toBe('0'.repeat(32));

    for (const cidr of ['192.0.2.4/31', '192.0.2.4/32']) {
      const network = unwrap(parseCidr(cidr));
      expect(network.hostSemantics).toBe('traditional');
      expect(network.usableHostCount).toBe(0);
      expect(network.firstUsableHost).toBeNull();
      expect(network.lastUsableHost).toBeNull();
    }
  });

  it('formats only valid address/prefix pairs as canonical networks', () => {
    expect(unwrap(formatCidr({ address: 3_396_731_178, prefixLength: 24 }))).toBe('202.118.1.0/24');
    expect(errorCode(formatCidr({ address: 0, prefixLength: 33 }))).toBe('invalid-prefix');
  });

  it.each(['1.2.3.4', '1.2.3.4/', '1.2.3.4/01', '1.2.3.4/-1', '1.2.3.4/33', '1.2.3.4/24tail'])(
    'rejects malformed CIDR %j',
    (input) => {
      expect(errorCode(parseCidr(input))).toMatch(/^invalid-(?:cidr|prefix)$/u);
    },
  );
});

describe('deterministic subnet splitting', () => {
  it('splits the Q47 /24 into two /25 networks with 126 usable hosts each', () => {
    const result = unwrap(splitBySubnetCount({ cidr: '202.118.1.0/24', subnetCount: 2 }));
    expect(result.requestedSubnetCount).toBe(2);
    expect(result.generatedSubnetCount).toBe(2);
    expect(result.borrowedBits).toBe(1);
    expect(result.subnets.map((subnet) => subnet.canonicalCidr)).toEqual([
      '202.118.1.0/25',
      '202.118.1.128/25',
    ]);
    expect(result.subnets.map((subnet) => subnet.usableHostCount)).toEqual([126, 126]);
  });

  it('uses the smallest subnet size that satisfies a usable-host requirement', () => {
    const result = unwrap(splitByUsableHosts({ cidr: '10.0.0.0/24', minimumUsableHosts: 30 }));
    expect(result.childPrefixLength).toBe(27);
    expect(result.generatedSubnetCount).toBe(8);
    expect(result.subnets[0]?.canonicalCidr).toBe('10.0.0.0/27');
    expect(result.subnets[7]?.canonicalCidr).toBe('10.0.0.224/27');
    expect(result.subnets.every((subnet) => subnet.usableHostCount === 30)).toBe(true);
  });

  it('rounds a non-power-of-two subnet request up deterministically', () => {
    const first = unwrap(splitBySubnetCount({ cidr: '10.0.0.0/24', subnetCount: 3 }));
    const second = unwrap(splitBySubnetCount({ cidr: '10.0.0.0/24', subnetCount: 3 }));
    expect(first.generatedSubnetCount).toBe(4);
    expect(first.unusedSubnetCount).toBe(1);
    expect(first).toEqual(second);
  });

  it('rejects impossible, malformed, and dangerously large materializations', () => {
    expect(errorCode(splitByUsableHosts({ cidr: '192.0.2.0/30', minimumUsableHosts: 3 })))
      .toBe('insufficient-address-space');
    expect(errorCode(splitByUsableHosts({ cidr: '192.0.2.0/24', minimumUsableHosts: 0 })))
      .toBe('invalid-host-count');
    expect(errorCode(splitBySubnetCount({ cidr: '192.0.2.0/24', subnetCount: 0 })))
      .toBe('invalid-subnet-count');
    expect(errorCode(splitBySubnetCount({ cidr: '0.0.0.0/0', subnetCount: 8192 })))
      .toBe('result-too-large');
  });
});

describe('strict route aggregation', () => {
  it('aggregates the two Q47 R2 /25 routes into exactly one /24 route', () => {
    const result = unwrap(aggregateCidrs({ cidrs: ['202.118.1.128/25', '202.118.1.0/25'] }));
    expect(result.aggregate.canonicalCidr).toBe('202.118.1.0/24');
    expect(result.children.map((child) => child.canonicalCidr)).toEqual([
      '202.118.1.0/25',
      '202.118.1.128/25',
    ]);
    expect(result.steps.map((step) => step.id)).toEqual(['sort', 'contiguous', 'size', 'alignment', 'aggregate']);
  });

  it('supports exact mixed-prefix unions and rejects gaps, overlaps, and non-power-of-two unions', () => {
    expect(unwrap(aggregateCidrs({
      cidrs: ['10.0.0.0/25', '10.0.0.128/26', '10.0.0.192/26'],
    })).aggregate.canonicalCidr).toBe('10.0.0.0/24');

    expect(errorCode(aggregateCidrs({ cidrs: ['10.0.0.0/25', '10.0.1.0/25'] }))).toBe('non-contiguous');
    expect(errorCode(aggregateCidrs({ cidrs: ['10.0.0.0/25', '10.0.0.0/26'] }))).toBe('overlapping-cidrs');
    expect(errorCode(aggregateCidrs({
      cidrs: ['10.0.0.0/26', '10.0.0.64/26', '10.0.0.128/26'],
    }))).toBe('aggregate-not-cidr');
    expect(errorCode(aggregateCidrs({ cidrs: ['10.0.0.0/25'] }))).toBe('too-few-cidrs');
  });
});

describe('longest-prefix matching', () => {
  const routes = [
    { id: 'default', cidr: '0.0.0.0/0', nextHop: '198.51.100.1', metric: 100 },
    { id: 'r2-summary', cidr: '202.118.1.0/24', nextHop: '192.0.2.2', metric: 10 },
    { id: 'dns-host', cidr: '202.118.1.2/32', nextHop: 'direct', metric: 50 },
  ] as const;

  it('chooses a DNS /32 host route ahead of an aggregate and default route', () => {
    const result = unwrap(longestPrefixMatch({ address: '202.118.1.2', routes }));
    expect(result.selected?.route.id).toBe('dns-host');
    expect(result.selected?.network.prefixLength).toBe(32);
    expect(result.evaluations.map((evaluation) => [evaluation.route.id, evaluation.matched])).toEqual([
      ['default', true],
      ['r2-summary', true],
      ['dns-host', true],
    ]);
    expect(result.steps.at(-1)?.result).toContain('dns-host');
  });

  it('falls back to /24 and then /0, and returns no match without a default route', () => {
    expect(unwrap(longestPrefixMatch({ address: '202.118.1.88', routes })).selected?.route.id).toBe('r2-summary');
    expect(unwrap(longestPrefixMatch({ address: '203.0.113.7', routes })).selected?.route.id).toBe('default');
    expect(unwrap(longestPrefixMatch({ address: '203.0.113.7', routes: routes.slice(1) })).selected).toBeNull();
  });

  it('uses metric and then input order as deterministic equal-prefix tie breakers', () => {
    const byMetric = unwrap(longestPrefixMatch({
      address: '10.0.0.1',
      routes: [
        { id: 'high', cidr: '10.0.0.0/24', metric: 20 },
        { id: 'low', cidr: '10.0.0.0/24', metric: 10 },
      ],
    }));
    expect(byMetric.selected?.route.id).toBe('low');

    const byOrder = unwrap(longestPrefixMatch({
      address: '10.0.0.1',
      routes: [
        { id: 'first', cidr: '10.0.0.0/24' },
        { id: 'second', cidr: '10.0.0.0/24' },
      ],
    }));
    expect(byOrder.selected?.route.id).toBe('first');
  });

  it('rejects invalid addresses, routes, and metrics', () => {
    expect(errorCode(longestPrefixMatch({ address: '999.1.1.1', routes }))).toBe('invalid-ipv4');
    expect(errorCode(longestPrefixMatch({ address: '10.0.0.1', routes: [{ id: '', cidr: '0.0.0.0/0' }] })))
      .toBe('invalid-route');
    expect(errorCode(longestPrefixMatch({
      address: '10.0.0.1', routes: [{ id: 'bad', cidr: '0.0.0.0/0', metric: -1 }],
    }))).toBe('invalid-route');
  });
});

describe('2009 Q47 network golden preset', () => {
  it('keeps the exercise inputs and all derived answers mutually consistent', () => {
    expect(NETWORK_Q47_PRESET).toEqual({
      baseCidr: '202.118.1.0/24',
      requiredSubnetCount: 2,
      expectedSubnets: ['202.118.1.0/25', '202.118.1.128/25'],
      expectedUsableHostsPerSubnet: 126,
      dnsHostRoute: '202.118.3.2/32',
      defaultRoute: '0.0.0.0/0',
      r2Aggregate: '202.118.1.0/24',
      lpmProbeAddress: '202.118.3.2',
    });

    const golden = unwrap(buildQ47NetworkGolden());
    expect(golden.split.subnets.map((subnet) => subnet.canonicalCidr)).toEqual(NETWORK_Q47_PRESET.expectedSubnets);
    expect(golden.r2Aggregation.aggregate.canonicalCidr).toBe(NETWORK_Q47_PRESET.r2Aggregate);
    expect(golden.lpm.selected?.route.id).toBe('dns-host');
  });
});
