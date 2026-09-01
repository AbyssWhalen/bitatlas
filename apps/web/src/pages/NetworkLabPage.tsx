import {
  NETWORK_Q47_PRESET,
  aggregateCidrs,
  longestPrefixMatch,
  parseCidr,
  splitBySubnetCount,
  type Ipv4Network,
  type NetworkError,
  type RouteEvaluation,
  type RouteInput,
} from '@408os/lab-core';
import { ArrowRight, Binary, BookOpenCheck, Combine, GitFork, Network, RotateCcw, Route } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { NetworkModuleTabs } from '../components/NetworkModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

interface R1Route extends RouteInput {
  label: string;
  destination: string;
  mask: string;
  nextHopLabel: string;
  interfaceName: string;
}

const Q47_R1_ROUTES: readonly R1Route[] = [
  {
    id: 'lan-1',
    label: '局域网 1',
    destination: '202.118.1.0',
    mask: '255.255.255.128',
    cidr: '202.118.1.0/25',
    nextHopLabel: '直连',
    interfaceName: 'E1',
    metric: 0,
  },
  {
    id: 'lan-2',
    label: '局域网 2',
    destination: '202.118.1.128',
    mask: '255.255.255.128',
    cidr: '202.118.1.128/25',
    nextHopLabel: '直连',
    interfaceName: 'E2',
    metric: 0,
  },
  {
    id: 'dns-host',
    label: 'DNS 主机',
    destination: '202.118.3.2',
    mask: '255.255.255.255',
    cidr: NETWORK_Q47_PRESET.dnsHostRoute,
    nextHop: '202.118.2.2',
    nextHopLabel: '202.118.2.2',
    interfaceName: 'L0',
    metric: 0,
  },
  {
    id: 'default',
    label: '互联网',
    destination: '0.0.0.0',
    mask: '0.0.0.0',
    cidr: NETWORK_Q47_PRESET.defaultRoute,
    nextHop: '202.118.2.2',
    nextHopLabel: '202.118.2.2',
    interfaceName: 'L0',
    metric: 0,
  },
] as const;

const routeById = new Map(Q47_R1_ROUTES.map((route) => [route.id, route]));
const Q47_PRESET_ID = 'cn408-2009-q47';

interface NetworkDraft {
  readonly baseCidr: string;
  readonly subnetCountText: string;
  readonly destination: string;
}

const q47Draft: NetworkDraft = {
  baseCidr: NETWORK_Q47_PRESET.baseCidr,
  subnetCountText: String(NETWORK_Q47_PRESET.requiredSubnetCount),
  destination: NETWORK_Q47_PRESET.lpmProbeAddress,
};

function buildParams(draft: NetworkDraft) {
  return {
    module: 'cidr',
    cidr: draft.baseCidr,
    subnets: draft.subnetCountText,
    destination: draft.destination,
  };
}

function networkErrorText(error: NetworkError): string {
  const messages: Record<NetworkError['code'], string> = {
    'invalid-ipv4': 'IPv4 地址必须由 4 个 0 至 255 的十进制字段组成。',
    'invalid-uint32': '地址数值必须位于无符号 32 位范围内。',
    'invalid-cidr': '请输入“IPv4 地址/前缀长度”格式的 CIDR。',
    'invalid-prefix': 'CIDR 前缀长度必须是 0 至 32 的整数。',
    'invalid-host-count': '可用主机数必须是有效的正整数。',
    'invalid-subnet-count': '子网数必须是有效的正整数。',
    'insufficient-address-space': '父网络没有足够的地址空间完成这次划分。',
    'result-too-large': '划分结果过大；一次最多生成 4096 个子网。',
    'too-few-cidrs': '至少需要两个子网才能演示路由聚合。',
    'non-contiguous': '这些子网不连续，不能无损聚合。',
    'overlapping-cidrs': '这些子网存在重叠，不能进行聚合。',
    'aggregate-not-cidr': '这些地址不能恰好组成一个 CIDR 聚合块。',
    'misaligned-aggregate': '连续地址块没有对齐到可聚合的网络边界。',
    'invalid-route': '路由表中存在无效的 CIDR、下一跳或度量值。',
  };
  return messages[error.code];
}

function hostRange(network: Ipv4Network): string {
  if (!network.firstUsableHost || !network.lastUsableHost) return '无传统可用主机地址';
  return `${network.firstUsableHost.text} - ${network.lastUsableHost.text}`;
}

function PrefixRuler({ network }: { network: Ipv4Network }) {
  const hostLength = 32 - network.prefixLength;
  const legendColumns = [
    network.prefixLength > 0 ? `${network.prefixLength}fr` : null,
    hostLength > 0 ? `${hostLength}fr` : null,
  ].filter((column): column is string => column !== null).join(' ');
  return (
    <div className="network-prefix-visual">
      <div
        className="network-prefix-legend"
        aria-hidden="true"
        style={{ gridTemplateColumns: legendColumns }}
      >
        {network.prefixLength > 0 && <span className="prefix">网络前缀 {network.prefixLength} bit</span>}
        {hostLength > 0 && <span className="host">主机部分 {hostLength} bit</span>}
      </div>
      <div
        className="network-bit-ruler"
        role="img"
        aria-label={`${network.canonicalCidr} 的 32 位地址；前 ${network.prefixLength} 位是网络前缀，后 ${32 - network.prefixLength} 位是主机部分`}
      >
        {[...network.inputAddress.bits].map((bit, index) => (
          <span
            key={`${index}-${bit}`}
            className={`${index < network.prefixLength ? 'prefix' : 'host'}${index > 0 && index % 8 === 0 ? ' octet-start' : ''}`}
          >
            <small>{31 - index}</small>
            {bit}
          </span>
        ))}
      </div>
    </div>
  );
}

function NetworkFacts({ network }: { network: Ipv4Network }) {
  const facts = [
    ['规范网络', network.canonicalCidr],
    ['子网掩码', network.subnetMask.text],
    ['广播地址', network.broadcastAddress.text],
    ['可用主机范围', hostRange(network)],
  ] as const;

  return (
    <dl className="network-fact-grid">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd><code>{value}</code></dd>
        </div>
      ))}
    </dl>
  );
}

function EvaluationBits({ evaluation }: { evaluation: RouteEvaluation }) {
  const prefixLength = evaluation.network.prefixLength;
  if (prefixLength === 0) return <code className="network-route-bits">/0 匹配任意地址</code>;
  return (
    <code className="network-route-bits">
      {evaluation.destinationPrefixBits.match(/.{1,8}/gu)?.join('.')}
      <span aria-hidden="true"> {evaluation.matched ? '=' : '\u2260'} </span>
      <span className="sr-only">{evaluation.matched ? '等于' : '不等于'}</span>
      {evaluation.routePrefixBits.match(/.{1,8}/gu)?.join('.')}
      {` /${prefixLength}`}
    </code>
  );
}

function buildExplorerSteps(
  parent: ReturnType<typeof parseCidr>,
  split: ReturnType<typeof splitBySubnetCount>,
  aggregate: ReturnType<typeof aggregateCidrs> | null,
  lpm: ReturnType<typeof longestPrefixMatch>,
): ExplorerStep[] {
  const steps: ExplorerStep[] = [];
  if (parent.ok) {
    steps.push(
      {
        id: 'parent-mask',
        label: '展开父网络前缀',
        value: `/${parent.value.prefixLength} = ${parent.value.prefixLength} 位网络号 + ${32 - parent.value.prefixLength} 位主机号`,
      },
      {
        id: 'parent-boundary',
        label: '求网络与广播边界',
        value: `${parent.value.networkAddress.text} - ${parent.value.broadcastAddress.text}`,
      },
    );
  }
  if (split.ok) {
    steps.push(
      {
        id: 'split-borrow',
        label: '确定借位数',
        value: `最小 s 使 2^s \u2265 ${split.value.requestedSubnetCount}，所以 s = ${split.value.borrowedBits}`,
      },
      {
        id: 'split-prefix',
        label: '得到子网前缀',
        value: `/${split.value.parent.prefixLength} + ${split.value.borrowedBits} = /${split.value.childPrefixLength}`,
      },
      {
        id: 'split-enumerate',
        label: '枚举子网边界',
        value: `${split.value.generatedSubnetCount} 个子网，每个 ${split.value.subnets[0]?.totalAddressCount ?? 0} 个地址`,
      },
    );
  }
  if (aggregate?.ok) {
    steps.push(
      {
        id: 'aggregate-contiguous',
        label: '检查地址连续性与对齐',
        value: `${aggregate.value.children[0]?.canonicalCidr} 到 ${aggregate.value.children.at(-1)?.canonicalCidr}，无空洞、无重叠`,
      },
      {
        id: 'aggregate-result',
        label: '恢复公共前缀',
        value: `${aggregate.value.children.length} 个子网聚合为 ${aggregate.value.aggregate.canonicalCidr}`,
      },
    );
  }
  if (lpm.ok) {
    steps.push(...lpm.value.evaluations.map((evaluation) => ({
      id: `lpm-${evaluation.route.id}`,
      label: `匹配 ${routeById.get(evaluation.route.id)?.label ?? evaluation.route.id} 路由`,
      value: `${evaluation.network.canonicalCidr} \u00b7 ${evaluation.matched ? '前缀命中' : '前缀不匹配'}`,
    })));
    steps.push({
      id: 'lpm-select',
      label: '选择最长匹配前缀',
      value: lpm.value.selected
        ? `${routeById.get(lpm.value.selected.route.id)?.label ?? lpm.value.selected.route.id} \u00b7 /${lpm.value.selected.network.prefixLength}`
        : '没有可用路由',
    });
  }
  return steps;
}

export function NetworkLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === Q47_PRESET_ID;
  const draft = useMemo<NetworkDraft>(() => (presetSelected ? q47Draft : {
    baseCidr: searchParams.get('cidr') ?? q47Draft.baseCidr,
    subnetCountText: searchParams.get('subnets') ?? q47Draft.subnetCountText,
    destination: searchParams.get('destination') ?? q47Draft.destination,
  }), [presetSelected, searchParams]);
  const { baseCidr, subnetCountText, destination } = draft;
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const parent = useMemo(() => parseCidr(baseCidr), [baseCidr]);
  const subnetCount = Number(subnetCountText);
  const split = useMemo(
    () => splitBySubnetCount({ cidr: baseCidr, subnetCount }),
    [baseCidr, subnetCount],
  );
  const aggregate = useMemo(() => {
    if (!split.ok || split.value.subnets.length < 2) return null;
    return aggregateCidrs({ cidrs: split.value.subnets.map((subnet) => subnet.canonicalCidr) });
  }, [split]);
  const lpm = useMemo(() => longestPrefixMatch({
    address: destination,
    routes: Q47_R1_ROUTES,
  }), [destination]);
  const steps = useMemo(
    () => buildExplorerSteps(parent, split, aggregate, lpm),
    [aggregate, lpm, parent, split],
  );
  const questionId = useMemo(
    () => questions.find((question) => question.year === 2009 && question.number === 47)?.id ?? null,
    [questions],
  );
  const visibleSubnets = useMemo(() => {
    if (!split.ok || split.value.subnets.length <= 128) return split.ok ? split.value.subnets : [];
    return [...split.value.subnets.slice(0, 64), ...split.value.subnets.slice(-64)];
  }, [split]);

  const patchDraft = useCallback((patch: Partial<NetworkDraft>) => {
    setSearchParams(buildParams({ ...draft, ...patch }), { replace: true });
  }, [draft, setSearchParams]);

  const resetPreset = () => {
    setSearchParams({ module: 'cidr', preset: Q47_PRESET_ID }, { replace: true });
  };

  const practiceQ47 = async () => {
    if (!questionId || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([questionId], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : '第 47 题练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page cpu-lab-page network-lab-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">NETWORK LAB / CIDR</span>
          <h1>计算机网络实验室</h1>
          <p>把子网划分、路由聚合与最长前缀匹配放在同一条 32 位地址轴上。</p>
        </div>
        <button
          type="button"
          className="secondary-command"
          disabled={!questionId || starting}
          onClick={() => void practiceQ47()}
        >
          <BookOpenCheck size={17} aria-hidden="true" />
          {starting ? '创建中' : '练习 2009 第 47 题'}
        </button>
      </header>

      <LabSectionNav />
      <NetworkModuleTabs active="cidr" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}
      <p className="network-review-note">
        题包当前为待人工审核状态；本页展示的是可复算的本地预设推导，不称为官方答案。
      </p>

      <div className="lab-module-heading">
        <Network size={18} aria-hidden="true" />
        <span>2009 第 47 题 · CIDR 与路由</span>
        <Route size={14} aria-hidden="true" />
      </div>

      <div className="lab-panel-grid network-lab-grid">
        <div className="network-workbench">
          <section className="lab-control-panel" aria-labelledby="network-input-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">Q47 PRESET</span><h2 id="network-input-heading">地址规划输入</h2></div>
              <button type="button" className="secondary-command" onClick={resetPreset}>
                <RotateCcw size={16} aria-hidden="true" />典型预设复位
              </button>
            </div>
            <div className="lab-field-row">
              <label className="lab-input-field grow" htmlFor="network-base-cidr">
                <span>父 CIDR</span>
                <input
                  id="network-base-cidr"
                  value={baseCidr}
                  onChange={(event) => patchDraft({ baseCidr: event.target.value })}
                  placeholder="202.118.1.0/24"
                  spellCheck={false}
                />
              </label>
              <label className="lab-input-field" htmlFor="network-subnet-count">
                <span>所需子网数</span>
                <input
                  id="network-subnet-count"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={subnetCountText}
                  onChange={(event) => patchDraft({ subnetCountText: event.target.value })}
                />
              </label>
              <label className="lab-input-field grow" htmlFor="network-destination">
                <span>LPM 目的地址</span>
                <input
                  id="network-destination"
                  value={destination}
                  onChange={(event) => patchDraft({ destination: event.target.value })}
                  placeholder="202.118.3.2"
                  spellCheck={false}
                />
              </label>
            </div>

            {!parent.ok ? (
              <div className="lab-error" role="alert">{networkErrorText(parent.error)}</div>
            ) : (
              <>
                <PrefixRuler network={parent.value} />
                <NetworkFacts network={parent.value} />
              </>
            )}
          </section>

          <section className="lab-control-panel" aria-labelledby="network-split-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">SUBNETTING</span><h2 id="network-split-heading">子网分割结果</h2></div>
              <GitFork size={19} aria-hidden="true" />
            </div>
            {!split.ok ? (
              <div className="lab-error" role="alert">{networkErrorText(split.error)}</div>
            ) : (
              <>
                <div className="network-split-summary" aria-live="polite">
                  <span>借 <strong>{split.value.borrowedBits}</strong> bit</span>
                  <span>子网前缀 <strong>/{split.value.childPrefixLength}</strong></span>
                  <span>实际生成 <strong>{split.value.generatedSubnetCount}</strong> 个</span>
                  <span>未使用 <strong>{split.value.unusedSubnetCount}</strong> 个</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm network-subnet-table">
                    <thead><tr><th scope="col">子网</th><th scope="col">CIDR</th><th scope="col">广播地址</th><th scope="col">可用主机</th><th scope="col">数量</th></tr></thead>
                    <tbody>
                      {visibleSubnets.map((subnet, index) => {
                        const originalIndex = split.value.subnets.indexOf(subnet);
                        const gapBefore = split.value.subnets.length > 128 && index === 64;
                        return (
                          <tr key={subnet.canonicalCidr} className={gapBefore ? 'network-subnet-gap' : undefined}>
                            <th scope="row">#{originalIndex + 1}</th>
                            <td><code>{subnet.canonicalCidr}</code></td>
                            <td><code>{subnet.broadcastAddress.text}</code></td>
                            <td><code>{hostRange(subnet)}</code></td>
                            <td className="text-end">{subnet.usableHostCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {split.value.subnets.length > visibleSubnets.length && (
                  <p className="text-muted text-small" role="status">
                    结果较大，当前展示前 64 个和后 64 个子网；计算与聚合仍使用全部 {split.value.subnets.length} 个子网。
                  </p>
                )}
              </>
            )}
          </section>

          <section className="lab-control-panel" aria-labelledby="network-aggregate-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">ROUTE AGGREGATION</span><h2 id="network-aggregate-heading">聚合结果</h2></div>
              <Combine size={19} aria-hidden="true" />
            </div>
            {!split.ok ? (
              <div className="lab-error" role="status">先完成有效的子网划分。</div>
            ) : split.value.subnets.length < 2 ? (
              <p className="text-muted">一个子网无需聚合；把子网数改为 2 或更多即可比较公共前缀。</p>
            ) : aggregate?.ok ? (
              <div className="network-aggregate-result">
                <div className="network-aggregate-equation">
                  <div>{aggregate.value.children.map((child) => <code key={child.canonicalCidr}>{child.canonicalCidr}</code>)}</div>
                  <ArrowRight size={18} aria-hidden="true" />
                  <strong>{aggregate.value.aggregate.canonicalCidr}</strong>
                </div>
                <PrefixRuler network={aggregate.value.aggregate} />
              </div>
            ) : aggregate ? (
              <div className="lab-error" role="alert">{networkErrorText(aggregate.error)}</div>
            ) : null}
          </section>

          <section className="lab-control-panel" aria-labelledby="network-route-heading">
            <div className="lab-control-heading">
              <div><span className="eyebrow">R1 / LONGEST PREFIX MATCH</span><h2 id="network-route-heading">Q47 的 R1 路由表</h2></div>
              <Binary size={19} aria-hidden="true" />
            </div>
            <div className="table-responsive">
              <table className="table table-sm network-route-table">
                <thead>
                  <tr><th scope="col">用途</th><th scope="col">目的网络</th><th scope="col">子网掩码</th><th scope="col">下一跳</th><th scope="col">接口</th></tr>
                </thead>
                <tbody>
                  {Q47_R1_ROUTES.map((route) => (
                    <tr key={route.id}>
                      <th scope="row">{route.label}</th>
                      <td><code>{route.destination}</code></td>
                      <td><code>{route.mask}</code></td>
                      <td><code>{route.nextHopLabel}</code></td>
                      <td><code>{route.interfaceName}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!lpm.ok ? (
              <div className="lab-error" role="alert">{networkErrorText(lpm.error)}</div>
            ) : (
              <div className="network-lpm-evaluations" aria-live="polite">
                {lpm.value.evaluations.map((evaluation) => {
                  const route = routeById.get(evaluation.route.id);
                  const selected = lpm.value.selected?.route.id === evaluation.route.id;
                  return (
                    <article key={evaluation.route.id} className={`${evaluation.matched ? 'matched' : 'missed'}${selected ? ' selected' : ''}`}>
                      <div>
                        <strong>{route?.label ?? evaluation.route.id}</strong>
                        <span>/{evaluation.network.prefixLength}</span>
                      </div>
                      <EvaluationBits evaluation={evaluation} />
                      <span>{selected ? '最长前缀，采用此路由' : evaluation.matched ? '命中，但前缀更短' : '不命中'}</span>
                    </article>
                  );
                })}
                <div className="network-lpm-selected" role="status">
                  <Route size={17} aria-hidden="true" />
                  <span>目的地址 <code>{lpm.value.address.text}</code></span>
                  <strong>
                    {lpm.value.selected
                      ? `经 ${routeById.get(lpm.value.selected.route.id)?.label ?? lpm.value.selected.route.id} 路由转发`
                      : '没有匹配路由'}
                  </strong>
                </div>
              </div>
            )}
          </section>
        </div>

        <StepExplorer
          key={`${baseCidr}:${subnetCountText}:${destination}`}
          steps={steps}
        />
      </div>
    </div>
  );
}
