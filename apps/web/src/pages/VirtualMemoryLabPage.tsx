import {
  Q46_LOCAL_PRACTICE_PRESET,
  simulateVirtualMemory,
  type VirtualMemoryAccessEvent,
  type VirtualMemoryConfig,
  type VirtualMemoryPhase,
  type VirtualMemoryState,
  type VirtualMemoryTrace,
} from '@408os/lab-core';
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  HardDriveDownload,
  MemoryStick,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudy } from '../app/StudyContext';
import { LabSectionNav } from '../components/LabSectionNav';
import { OsModuleTabs } from '../components/OsModuleTabs';
import { StepExplorer, type ExplorerStep } from '../components/StepExplorer';

type TimingKey = 'tlbLookupTimeNs' | 'memoryAccessTimeNs' | 'pageFaultServiceTimeNs';

interface TimingDraft {
  readonly tlbLookupTimeNs: string;
  readonly memoryAccessTimeNs: string;
  readonly pageFaultServiceTimeNs: string;
}

interface SimulationSuccess {
  readonly ok: true;
  readonly config: VirtualMemoryConfig;
  readonly addresses: readonly number[];
  readonly trace: VirtualMemoryTrace;
}

interface SimulationFailure {
  readonly ok: false;
  readonly message: string;
}

type SimulationResult = SimulationSuccess | SimulationFailure;

const presetAddressText = Q46_LOCAL_PRACTICE_PRESET.virtualAddresses
  .map((address) => `${address.toString(16).toUpperCase()}H`)
  .join(', ');

const presetTiming: TimingDraft = {
  tlbLookupTimeNs: String(Q46_LOCAL_PRACTICE_PRESET.config.tlbLookupTimeNs),
  memoryAccessTimeNs: String(Q46_LOCAL_PRACTICE_PRESET.config.memoryAccessTimeNs),
  pageFaultServiceTimeNs: String(Q46_LOCAL_PRACTICE_PRESET.config.pageFaultServiceTimeNs),
};

interface VirtualMemoryDraft {
  readonly addressText: string;
  readonly timing: TimingDraft;
}

const presetDraft: VirtualMemoryDraft = {
  addressText: presetAddressText,
  timing: presetTiming,
};

function buildParams(draft: VirtualMemoryDraft) {
  return {
    module: 'memory',
    addresses: draft.addressText,
    tlbNs: draft.timing.tlbLookupTimeNs,
    memoryNs: draft.timing.memoryAccessTimeNs,
    faultNs: draft.timing.pageFaultServiceTimeNs,
  };
}

const phaseLabels: Record<VirtualMemoryPhase['kind'], string> = {
  'tlb-lookup': '查询 TLB',
  'page-table-lookup': '访问页表',
  'page-fault-service': '处理缺页',
  'retry-tlb-lookup': '重试 TLB',
  'memory-access': '访问主存',
};

function formatHex(value: number, minimumDigits = 1): string {
  return `0x${value.toString(16).toUpperCase().padStart(minimumDigits, '0')}`;
}

function formatNanoseconds(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(3)} ms`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(3)} us`;
  return `${value.toLocaleString('zh-CN')} ns`;
}

function parseAddressSequence(text: string, maximumAddress: number): readonly number[] {
  const tokens = text.split(/[\s,，;；]+/u).filter(Boolean);
  if (!tokens.length) throw new Error('请输入至少一个虚拟地址。');

  return tokens.map((token, index) => {
    let digits: string;
    let radix: 10 | 16;
    if (/^0x[0-9a-f]+$/iu.test(token)) {
      digits = token.slice(2);
      radix = 16;
    } else if (/^[0-9a-f]+h$/iu.test(token)) {
      digits = token.slice(0, -1);
      radix = 16;
    } else if (/^[0-9]+$/u.test(token)) {
      digits = token;
      radix = 10;
    } else {
      throw new Error(`第 ${index + 1} 个地址“${token}”格式无效，请使用 0x、H 后缀或十进制。`);
    }

    const value = Number.parseInt(digits, radix);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`第 ${index + 1} 个地址超出安全整数范围。`);
    }
    if (value > maximumAddress) {
      throw new Error(`地址 ${token} 超出当前虚拟地址空间，上限为 ${formatHex(maximumAddress)}。`);
    }
    return value;
  });
}

function parseTiming(value: string, label: string): number {
  if (!/^[0-9]+$/u.test(value.trim())) throw new Error(`${label}必须是非负整数。`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label}超出安全整数范围。`);
  return parsed;
}

function calculateSimulation(addressText: string, timing: TimingDraft): SimulationResult {
  try {
    const config: VirtualMemoryConfig = {
      ...Q46_LOCAL_PRACTICE_PRESET.config,
      tlbLookupTimeNs: parseTiming(timing.tlbLookupTimeNs, 'TLB 查询时间'),
      memoryAccessTimeNs: parseTiming(timing.memoryAccessTimeNs, '主存访问时间'),
      pageFaultServiceTimeNs: parseTiming(timing.pageFaultServiceTimeNs, '缺页处理时间'),
    };
    const maximumAddress = config.pageSizeBytes * config.virtualPageCount - 1;
    const addresses = parseAddressSequence(addressText, maximumAddress);
    return { ok: true, config, addresses, trace: simulateVirtualMemory(config, addresses) };
  } catch (reason) {
    return { ok: false, message: reason instanceof Error ? reason.message : '无法完成虚拟内存模拟。' };
  }
}

function phaseDetail(
  phase: VirtualMemoryPhase,
  event: VirtualMemoryAccessEvent,
  config: VirtualMemoryConfig,
): string {
  switch (phase.kind) {
    case 'tlb-lookup':
      return `页 ${event.pageNumber} ${event.tlbHit ? '命中，直接取得页框号' : '未命中，继续查页表'} · ${formatNanoseconds(phase.durationNs)}`;
    case 'page-table-lookup':
      return `读取页 ${event.pageNumber} 的页表项，${event.pageFault ? '有效位为 0' : '有效位为 1'} · ${formatNanoseconds(phase.durationNs)}`;
    case 'page-fault-service':
      return `${event.evictedPageNumber === null ? '使用空闲页框' : `LRU 淘汰页 ${event.evictedPageNumber}`}，将页 ${event.pageNumber} 装入页框 ${formatHex(event.loadedFrameNumber ?? 0)} · ${formatNanoseconds(phase.durationNs)}`;
    case 'retry-tlb-lookup':
      return `页表与 TLB 更新后，页 ${event.pageNumber} 重试命中 · ${formatNanoseconds(phase.durationNs)}`;
    case 'memory-access':
      return `访问页框 ${formatHex(Math.floor(event.physicalAddress / config.pageSizeBytes))}，得到物理地址 ${formatHex(event.physicalAddress)} · ${formatNanoseconds(phase.durationNs)}`;
  }
}

function phaseSteps(event: VirtualMemoryAccessEvent, config: VirtualMemoryConfig): readonly ExplorerStep[] {
  return event.phases.map((phase, index) => ({
    id: `${event.step}-${phase.kind}-${index}`,
    label: phaseLabels[phase.kind],
    value: phaseDetail(phase, event, config),
  }));
}

function lruRank(state: VirtualMemoryState, pageNumber: number): string {
  const residentPages = state.pages
    .filter((page) => page.present)
    .sort((left, right) => (left.lastAccessTick ?? 0) - (right.lastAccessTick ?? 0));
  const index = residentPages.findIndex((page) => page.pageNumber === pageNumber);
  if (index < 0) return '--';
  if (residentPages.length === 1) return 'MRU';
  if (index === 0) return 'LRU';
  if (index === residentPages.length - 1) return 'MRU';
  return String(index + 1);
}

function AccessTimeline({
  trace,
  selectedIndex,
  onSelect,
}: {
  trace: VirtualMemoryTrace;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="vm-timeline-section" aria-labelledby="vm-timeline-title">
      <div className="vm-section-heading">
        <div><span className="eyebrow">ACCESS TRACE</span><h2 id="vm-timeline-title">访问时间线</h2></div>
        <strong>{formatNanoseconds(trace.totalTimeNs)}</strong>
      </div>
      <ol className="vm-access-timeline">
        {trace.events.map((event, index) => (
          <li key={`${event.step}-${event.virtualAddress}`}>
            <button
              type="button"
              className={selectedIndex === index ? 'active' : ''}
              aria-current={selectedIndex === index ? 'step' : undefined}
              aria-label={`查看第 ${event.step} 次访问，虚拟地址 ${formatHex(event.virtualAddress)}`}
              onClick={() => onSelect(index)}
            >
              <span>{String(event.step).padStart(2, '0')}</span>
              <code>{formatHex(event.virtualAddress, 4)}</code>
              <small>{event.tlbHit ? 'TLB HIT' : event.pageFault ? 'PAGE FAULT' : 'TLB MISS'}</small>
              <strong>{formatNanoseconds(event.totalTimeNs)}</strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AddressBreakdown({ event, config }: { event: VirtualMemoryAccessEvent; config: VirtualMemoryConfig }) {
  const offsetDigits = Math.max(1, Math.ceil(Math.log2(config.pageSizeBytes) / 4));
  return (
    <dl className="vm-address-breakdown" aria-label={`第 ${event.step} 次地址转换结果`} aria-live="polite">
      <div><dt>虚拟地址</dt><dd>{formatHex(event.virtualAddress, 4)}</dd></div>
      <div><dt>页号</dt><dd>{event.pageNumber}</dd></div>
      <div><dt>页内偏移</dt><dd>{formatHex(event.offset, offsetDigits)}</dd></div>
      <div><dt>物理地址</dt><dd>{formatHex(event.physicalAddress)}</dd></div>
    </dl>
  );
}

function EventOutcome({ event }: { event: VirtualMemoryAccessEvent }) {
  return (
    <div className="vm-event-outcome" aria-label="本次访问结果">
      <span className={event.tlbHit ? 'success' : 'warning'}>{event.tlbHit ? 'TLB 命中' : 'TLB 未命中'}</span>
      <span>{event.pageTableAccessed ? '已查页表' : '未查页表'}</span>
      <span className={event.pageFault ? 'danger' : 'success'}>{event.pageFault ? '发生缺页' : '页面驻留'}</span>
      {event.evictedPageNumber !== null && <span className="danger">淘汰页 {event.evictedPageNumber}</span>}
      {event.loadedFrameNumber !== null && <span>装入页框 {formatHex(event.loadedFrameNumber)}</span>}
      {event.invalidatedTlbPageNumber !== null && <span>失效 TLB 页 {event.invalidatedTlbPageNumber}</span>}
      {event.tlbReplacementPageNumber !== null && <span>替换 TLB 页 {event.tlbReplacementPageNumber}</span>}
    </div>
  );
}

function MemoryStateTables({ state, event }: { state: VirtualMemoryState; event: VirtualMemoryAccessEvent }) {
  return (
    <div className="vm-state-grid">
      <section className="vm-state-panel" aria-labelledby="vm-tlb-title">
        <div className="vm-state-heading"><Database size={16} aria-hidden="true" /><h3 id="vm-tlb-title">TLB 状态</h3><span>访问后</span></div>
        <div className="table-responsive">
          <table className="table table-sm vm-state-table">
            <caption className="sr-only">第 {event.step} 次访问后的 TLB 表项</caption>
            <thead><tr><th scope="col">页号</th><th scope="col">页框</th><th scope="col">最近访问</th></tr></thead>
            <tbody>
              {state.tlbEntries.length ? state.tlbEntries.map((entry) => (
                <tr key={entry.pageNumber} className={entry.pageNumber === event.pageNumber ? 'current' : ''}>
                  <td>{entry.pageNumber}</td><td><code>{formatHex(entry.frameNumber)}</code></td><td>tick {entry.lastAccessTick}</td>
                </tr>
              )) : <tr><td colSpan={3} className="text-center">TLB 为空</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="vm-state-panel" aria-labelledby="vm-page-table-title">
        <div className="vm-state-heading"><MemoryStick size={16} aria-hidden="true" /><h3 id="vm-page-table-title">页表与 LRU</h3><span>访问后</span></div>
        <div className="table-responsive">
          <table className="table table-sm vm-state-table">
            <caption className="sr-only">第 {event.step} 次访问后的页表和驻留集状态</caption>
            <thead><tr><th scope="col">页号</th><th scope="col">有效</th><th scope="col">页框</th><th scope="col">LRU</th></tr></thead>
            <tbody>
              {state.pages.map((page) => (
                <tr key={page.pageNumber} className={page.pageNumber === event.pageNumber ? 'current' : ''}>
                  <td>{page.pageNumber}</td>
                  <td>{page.present ? '1' : '0'}</td>
                  <td>{page.frameNumber === null ? '--' : <code>{formatHex(page.frameNumber)}</code>}</td>
                  <td>{lruRank(state, page.pageNumber)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function VirtualMemoryLabPage() {
  const { createSession, questions } = useStudy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSelected = searchParams.get('preset') === Q46_LOCAL_PRACTICE_PRESET.sourceQuestionId;
  const draft = useMemo<VirtualMemoryDraft>(() => (presetSelected ? presetDraft : {
    addressText: searchParams.get('addresses') ?? presetAddressText,
    timing: {
      tlbLookupTimeNs: searchParams.get('tlbNs') ?? presetTiming.tlbLookupTimeNs,
      memoryAccessTimeNs: searchParams.get('memoryNs') ?? presetTiming.memoryAccessTimeNs,
      pageFaultServiceTimeNs: searchParams.get('faultNs') ?? presetTiming.pageFaultServiceTimeNs,
    },
  }), [presetSelected, searchParams]);
  const { addressText, timing } = draft;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const simulation = useMemo(() => calculateSimulation(addressText, timing), [addressText, timing]);
  const eventCount = simulation.ok ? simulation.trace.events.length : 0;
  const currentIndex = Math.min(selectedIndex, Math.max(0, eventCount - 1));
  const currentEvent = simulation.ok ? simulation.trace.events[currentIndex] : undefined;
  const currentState = simulation.ok ? simulation.trace.steps[currentIndex]?.state : undefined;
  const explorerSteps = simulation.ok && currentEvent
    ? phaseSteps(currentEvent, simulation.config)
    : [];
  const q46Id = useMemo(() => questions.find((question) => (
    question.id === Q46_LOCAL_PRACTICE_PRESET.sourceQuestionId
      || (question.year === 2009 && question.number === 46)
  ))?.id, [questions]);

  useEffect(() => {
    if (!playing || eventCount <= 1) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((index) => {
        if (index >= eventCount - 1) {
          setPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, 1_100);
    return () => window.clearInterval(timer);
  }, [eventCount, playing]);

  const patchDraft = useCallback((nextDraft: VirtualMemoryDraft) => {
    setPlaying(false);
    setSelectedIndex(0);
    setSearchParams(buildParams(nextDraft), { replace: true });
  }, [setSearchParams]);

  const updateTiming = (key: TimingKey, value: string) => {
    patchDraft({ ...draft, timing: { ...timing, [key]: value } });
  };

  const restorePreset = () => {
    setSelectedIndex(0);
    setPlaying(false);
    setSearchParams({ module: 'memory', preset: Q46_LOCAL_PRACTICE_PRESET.sourceQuestionId }, { replace: true });
  };

  const togglePlayback = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (currentIndex >= eventCount - 1) setSelectedIndex(0);
    setPlaying(true);
  };

  const practiceQ46 = async () => {
    if (!q46Id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await createSession([q46Id], 'practice');
      navigate(`/practice/${sessionId}`);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'Q46 练习创建失败');
      setStarting(false);
    }
  };

  return (
    <div className="page vm-lab-page">
      <header className="page-header">
        <div><span className="eyebrow">OS LAB / VIRTUAL MEMORY</span><h1>虚拟内存实验室</h1><p>逐次观察 TLB、页表、缺页处理与 LRU 置换。</p></div>
        <button className="secondary-command" type="button" disabled={!q46Id || starting} onClick={() => void practiceQ46()}>
          <BookOpenCheck size={17} aria-hidden="true" />{starting ? '创建中' : '练习 2009 · Q46'}
        </button>
      </header>
      <LabSectionNav />
      <OsModuleTabs active="memory" />
      {startError && <div className="status-message error" role="alert">{startError}</div>}

      <div className="vm-review-band">
        <span><MemoryStick size={16} aria-hidden="true" />本地练习预设 · Q46</span>
        <strong>{Q46_LOCAL_PRACTICE_PRESET.reviewStatus}</strong>
        <small>参数来自待人工复核题包，仅用于过程演练。</small>
      </div>

      <div className="lab-module-heading"><MemoryStick size={18} aria-hidden="true" /><span>请求分页 · TLB · LRU</span><Play size={14} aria-hidden="true" /></div>
      <div className="lab-panel-grid vm-lab-grid">
        <section className="lab-control-panel" aria-labelledby="vm-control-title">
          <div className="lab-control-heading">
            <div><span className="eyebrow">INPUT / CONFIG</span><h2 id="vm-control-title">地址序列与时间参数</h2></div>
            <button className="secondary-command" type="button" onClick={restorePreset}><RotateCcw size={16} aria-hidden="true" />恢复 Q46 预设</button>
          </div>

          <label className="lab-input-field full vm-address-input">
            <span>虚拟地址序列（逗号或空格分隔，支持 0x、H 后缀和十进制）</span>
            <input
              aria-label="虚拟地址序列"
              value={addressText}
              onChange={(event) => {
                patchDraft({ ...draft, addressText: event.target.value });
              }}
              spellCheck={false}
            />
          </label>

          <div className="vm-timing-grid">
            <label className="lab-input-field"><span>TLB 查询 / ns</span><input aria-label="TLB 查询时间，纳秒" inputMode="numeric" value={timing.tlbLookupTimeNs} onChange={(event) => updateTiming('tlbLookupTimeNs', event.target.value)} /></label>
            <label className="lab-input-field"><span>主存访问 / ns</span><input aria-label="主存访问时间，纳秒" inputMode="numeric" value={timing.memoryAccessTimeNs} onChange={(event) => updateTiming('memoryAccessTimeNs', event.target.value)} /></label>
            <label className="lab-input-field"><span>缺页处理 / ns</span><input aria-label="缺页处理时间，纳秒" inputMode="numeric" value={timing.pageFaultServiceTimeNs} onChange={(event) => updateTiming('pageFaultServiceTimeNs', event.target.value)} /></label>
          </div>

          {!simulation.ok ? <div className="lab-error" role="alert">{simulation.message}</div> : currentEvent && currentState && (
            <>
              <AddressBreakdown event={currentEvent} config={simulation.config} />
              <EventOutcome event={currentEvent} />
              <div className="vm-transfer-summary">
                {currentEvent.pageFault ? <HardDriveDownload size={17} aria-hidden="true" /> : <Clock3 size={17} aria-hidden="true" />}
                <div>
                  <span>{currentEvent.pageFault ? '缺页路径' : currentEvent.tlbHit ? 'TLB 快路径' : '页表命中路径'}</span>
                  <strong>本次 {formatNanoseconds(currentEvent.totalTimeNs)}</strong>
                </div>
                <code>{formatHex(currentEvent.virtualAddress)} → {formatHex(currentEvent.physicalAddress)}</code>
              </div>
              <MemoryStateTables state={currentState} event={currentEvent} />
            </>
          )}
        </section>

        <StepExplorer key={`${currentEvent?.step ?? 0}:${addressText}:${JSON.stringify(timing)}`} steps={explorerSteps} />
      </div>

      {simulation.ok && (
        <>
          <AccessTimeline
            trace={simulation.trace}
            selectedIndex={currentIndex}
            onSelect={(index) => {
              setSelectedIndex(index);
              setPlaying(false);
            }}
          />
          <div className="vm-trace-transport" aria-label="访问时间线控制">
            <span>访问 {currentIndex + 1} / {eventCount}</span>
            <div className="step-controls">
              <button className="icon-command" type="button" disabled={currentIndex === 0} aria-label="上一次访问" title="上一次访问" onClick={() => { setSelectedIndex((index) => Math.max(0, index - 1)); setPlaying(false); }}><ChevronLeft size={16} aria-hidden="true" /></button>
              <button className="icon-command" type="button" aria-label={playing ? '暂停访问时间线' : '播放访问时间线'} title={playing ? '暂停' : '播放'} onClick={togglePlayback}>{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>
              <button className="icon-command" type="button" disabled={currentIndex >= eventCount - 1} aria-label="下一次访问" title="下一次访问" onClick={() => { setSelectedIndex((index) => Math.min(eventCount - 1, index + 1)); setPlaying(false); }}><ChevronRight size={16} aria-hidden="true" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
