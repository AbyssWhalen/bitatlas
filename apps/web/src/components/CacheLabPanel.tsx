import {
  CACHE_Q14_PRESET,
  simulateCacheTrace,
  type CacheAccess,
  type CacheConfigInput,
  type CacheCoreError,
  type CacheTrace,
} from '@408os/cpu-core';
import { Database, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StepExplorer, type ExplorerStep } from './StepExplorer';

interface CachePreset {
  id: string;
  label: string;
  config: CacheConfigInput;
  trace: string;
}

const Q14_PRESET: CachePreset = {
  id: 'q14',
  label: '2009 Q14：129 号单元映射',
  config: CACHE_Q14_PRESET.config,
  trace: 'R 129',
};

const LRU_PRESET: CachePreset = {
  id: 'lru',
  label: '2 路 LRU 与脏块写回',
  config: { addressBits: 8, lineSizeBytes: 4, setCount: 2, associativity: 2 },
  trace: 'R 0, R 8, R 0, W 16, R 8, R 0',
};

const presets = [Q14_PRESET, LRU_PRESET] as const;

function cacheErrorText(error: CacheCoreError): string {
  const messages: Record<CacheCoreError['code'], string> = {
    'invalid-input': 'Cache 参数格式无效。',
    'invalid-address-bits': '地址位数必须是 1 至 32 的整数。',
    'invalid-line-size': '块大小必须是 2 的正整数次幂。',
    'invalid-set-count': '组数必须是 2 的正整数次幂。',
    'invalid-associativity': '路数必须是 1 至 64 的整数。',
    'address-layout-overflow': '组索引与块内偏移已超过地址位宽。',
    'cache-too-large': `可视化最多保留 ${error.details?.maximum ?? 512} 条 Cache 行。`,
    'invalid-address': '访存地址必须是非负整数。',
    'address-out-of-range': `访存地址超过当前地址空间（最大 ${error.details?.maximum ?? '--'}）。`,
    'empty-trace': '请至少输入一次访存。',
    'trace-too-large': `单次最多回放 ${error.details?.maximum ?? 256} 次访存。`,
    'invalid-operation': '访存操作只能使用 R 或 W。',
  };
  return messages[error.code];
}

function parseAddressToken(token: string): number | null {
  const normalized = token.trim();
  let radix = 10;
  let digits = normalized;
  if (/^0x[0-9a-f]+$/iu.test(normalized)) {
    radix = 16;
    digits = normalized.slice(2);
  } else if (/^[0-9a-f]+h$/iu.test(normalized)) {
    radix = 16;
    digits = normalized.slice(0, -1);
  } else if (!/^\d+$/u.test(normalized)) {
    return null;
  }
  const parsed = Number.parseInt(digits, radix);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseTrace(text: string): { ok: true; accesses: CacheAccess[] } | { ok: false; message: string } {
  const tokens = text.split(/[\n,]+/u).map((part) => part.trim()).filter(Boolean);
  if (!tokens.length) return { ok: false, message: '请至少输入一次访存。' };
  const accesses: CacheAccess[] = [];
  for (const [index, token] of tokens.entries()) {
    const match = /^(?:(R|W)\s+)?(\S+)$/iu.exec(token);
    const address = match?.[2] ? parseAddressToken(match[2]) : null;
    if (!match || address === null) {
      return { ok: false, message: `第 ${index + 1} 项格式无效，请使用 R 129、W 0x80 或 R 81H。` };
    }
    accesses.push({ operation: match[1]?.toUpperCase() === 'W' ? 'write' : 'read', address });
  }
  return { ok: true, accesses };
}

function fieldBits(value: number, width: number): string {
  if (width === 0) return '无';
  return value.toString(2).padStart(width, '0');
}

function traceSteps(trace: CacheTrace, eventIndex: number): ExplorerStep[] {
  const event = trace.events[eventIndex];
  return event ? event.phases.map((phase, index) => ({
    id: `${event.index}-${index}-${phase.id}`,
    label: phase.label,
    value: phase.detail,
  })) : [];
}

export function CacheLabPanel() {
  const [config, setConfig] = useState<CacheConfigInput>(Q14_PRESET.config);
  const [traceText, setTraceText] = useState(Q14_PRESET.trace);
  const [eventIndex, setEventIndex] = useState(0);
  const parsedTrace = useMemo(() => parseTrace(traceText), [traceText]);
  const result = useMemo(() => parsedTrace.ok
    ? simulateCacheTrace(config, parsedTrace.accesses)
    : null, [config, parsedTrace]);
  const trace = result?.ok ? result.value : null;
  const safeEventIndex = trace ? Math.min(eventIndex, trace.events.length - 1) : 0;
  const event = trace?.events[safeEventIndex];
  const setLines = event?.after.filter((line) => line.setIndex === event.setIndex) ?? [];
  const steps = trace ? traceSteps(trace, safeEventIndex) : [];

  const updateConfig = (key: keyof CacheConfigInput, value: string) => {
    setEventIndex(0);
    setConfig((current) => ({ ...current, [key]: Number(value) }));
  };
  const applyPreset = (preset: CachePreset) => {
    setConfig({ ...preset.config });
    setTraceText(preset.trace);
    setEventIndex(0);
  };

  return (
    <div className="cache-lab-layout">
      <section className="lab-control-panel cache-control-panel">
        <div className="lab-control-heading">
          <div><span className="eyebrow">CACHE / WRITE-BACK LRU</span><h2>组相联 Cache</h2></div>
          <label className="lab-input-field lab-example-select">
            <span>典型例题</span>
            <select aria-label="选择 Cache 例题" value="" onChange={(event) => {
              const preset = presets.find((item) => item.id === event.target.value);
              if (preset) applyPreset(preset);
            }}>
              <option value="" disabled>选择预设</option>
              {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
          </label>
        </div>

        <div className="cache-policy-bar">
          <span>写回</span><span>写分配</span><span>LRU</span>
          <button className="icon-command" onClick={() => applyPreset(Q14_PRESET)} title="恢复 Q14 预设" aria-label="恢复 Cache Q14 预设"><RotateCcw size={15} /></button>
        </div>

        <div className="cache-config-grid">
          <label className="lab-input-field"><span>地址位数</span><input aria-label="Cache 地址位数" type="number" min="1" max="32" value={config.addressBits} onChange={(event) => updateConfig('addressBits', event.target.value)} /></label>
          <label className="lab-input-field"><span>块大小 / B</span><input aria-label="Cache 块大小" type="number" min="1" value={config.lineSizeBytes} onChange={(event) => updateConfig('lineSizeBytes', event.target.value)} /></label>
          <label className="lab-input-field"><span>组数</span><input aria-label="Cache 组数" type="number" min="1" value={config.setCount} onChange={(event) => updateConfig('setCount', event.target.value)} /></label>
          <label className="lab-input-field"><span>每组路数</span><input aria-label="Cache 路数" type="number" min="1" max="64" value={config.associativity} onChange={(event) => updateConfig('associativity', event.target.value)} /></label>
        </div>
        <label className="lab-input-field full">
          <span>访存序列（R/W + 十进制、0x 或 H 后缀地址，逗号或换行分隔）</span>
          <textarea aria-label="Cache 访存序列" value={traceText} onChange={(event) => { setTraceText(event.target.value); setEventIndex(0); }} spellCheck={false} />
        </label>

        {!parsedTrace.ok ? <div className="lab-error" role="alert">{parsedTrace.message}</div>
          : result && !result.ok ? <div className="lab-error" role="alert">{cacheErrorText(result.error)}</div>
            : trace && event && (
              <>
                <div className="cache-address-fields" aria-label="Cache 地址字段">
                  <div className="tag"><span>Tag · {trace.config.tagBits} bit</span><code>{fieldBits(event.tag, trace.config.tagBits)}</code><strong>{event.tag}</strong></div>
                  <div className="set"><span>Set · {trace.config.setBits} bit</span><code>{fieldBits(event.setIndex, trace.config.setBits)}</code><strong>{event.setIndex}</strong></div>
                  <div className="offset"><span>Offset · {trace.config.offsetBits} bit</span><code>{fieldBits(event.blockOffset, trace.config.offsetBits)}</code><strong>{event.blockOffset}</strong></div>
                </div>

                <div className="cache-outcome-row">
                  <Database size={18} aria-hidden="true" />
                  <div><span>{event.operation === 'read' ? '读取' : '写入'}地址</span><strong>{event.address} · 块 {event.blockNumber}</strong></div>
                  <span className={event.hit ? 'success' : 'warning'}>{event.hit ? 'HIT' : 'MISS'}</span>
                  <code>组 {event.setIndex} / 路 {event.wayIndex}</code>
                </div>

                <div className="table-responsive cache-state-table">
                  <table className="table">
                    <thead><tr><th>路</th><th>V</th><th>Tag</th><th>主存块</th><th>Dirty</th><th>LRU tick</th></tr></thead>
                    <tbody>{setLines.map((line) => (
                      <tr key={line.wayIndex} className={line.wayIndex === event.wayIndex ? 'current' : ''}>
                        <th>{line.wayIndex}</th><td>{line.valid ? 1 : 0}</td><td>{line.tag ?? '--'}</td><td>{line.blockNumber ?? '--'}</td><td>{line.dirty ? 1 : 0}</td><td>{line.lastUsed || '--'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
      </section>

      <StepExplorer key={`${trace?.config.fingerprint ?? 'invalid'}:${safeEventIndex}:${traceText}`} steps={steps} />

      {trace && (
        <section className="cache-trace-section">
          <div className="vm-section-heading">
            <div><span className="eyebrow">ACCESS TRACE</span><h2>访存时间线</h2></div>
            <strong>{trace.summary.hits} / {trace.summary.accesses} 命中 · {(trace.summary.hitRate * 100).toFixed(1)}%</strong>
          </div>
          <ol className="cache-access-timeline">
            {trace.events.map((item) => (
              <li key={item.index}>
                <button className={item.index === safeEventIndex ? 'active' : ''} onClick={() => setEventIndex(item.index)}>
                  <span>{String(item.index + 1).padStart(2, '0')}</span>
                  <code>{item.operation === 'read' ? 'R' : 'W'} {item.address}</code>
                  <small className={item.hit ? 'success' : 'warning'}>{item.hit ? 'HIT' : 'MISS'}</small>
                  <strong>S{item.setIndex} W{item.wayIndex}</strong>
                </button>
              </li>
            ))}
          </ol>
          <dl className="cache-summary-grid">
            <div><dt>命中</dt><dd>{trace.summary.hits}</dd></div>
            <div><dt>未命中</dt><dd>{trace.summary.misses}</dd></div>
            <div><dt>主存读块</dt><dd>{trace.summary.memoryReads}</dd></div>
            <div><dt>脏块写回</dt><dd>{trace.summary.memoryWrites}</dd></div>
          </dl>
        </section>
      )}
    </div>
  );
}
