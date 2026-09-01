import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface ExplorerStep {
  id: string;
  label: string;
  value: string;
}

export function StepExplorer({
  steps,
  onActiveIndexChange,
  announceChanges = true,
  className,
}: {
  steps: readonly ExplorerStep[];
  onActiveIndexChange?: (index: number) => void;
  announceChanges?: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const activeStepRef = useRef<HTMLLIElement>(null);
  const lastIndex = Math.max(0, steps.length - 1);

  useEffect(() => {
    if (!playing || steps.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= lastIndex) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [lastIndex, playing, steps.length]);

  useEffect(() => {
    onActiveIndexChange?.(Math.min(index, lastIndex));
  }, [index, lastIndex, onActiveIndexChange]);

  useEffect(() => {
    const list = listRef.current;
    const activeStep = activeStepRef.current;
    if (!list || !activeStep || list.scrollHeight <= list.clientHeight) return;
    const activeTop = activeStep.offsetTop;
    const activeBottom = activeTop + activeStep.offsetHeight;
    if (activeTop < list.scrollTop) list.scrollTop = activeTop;
    else if (activeBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = activeBottom - list.clientHeight;
    }
  }, [index]);

  if (!steps.length) return null;

  return (
    <section className={`step-explorer${className ? ` ${className}` : ''}`} aria-label="转换步骤">
      <div className="step-transport">
        <div><span className="eyebrow">STEP TRACE</span><strong>推导步骤</strong></div>
        <div className="step-controls">
          <button className="icon-command" onClick={() => { setPlaying(false); setIndex(0); }} title="复位" aria-label="复位步骤"><RotateCcw size={16} /></button>
          <button className="icon-command" disabled={index === 0} onClick={() => { setPlaying(false); setIndex((current) => Math.max(0, current - 1)); }} title="上一步" aria-label="上一步"><SkipBack size={16} /></button>
          <button className="icon-command" onClick={() => {
            if (index >= lastIndex) setIndex(0);
            setPlaying((current) => !current);
          }} title={playing ? '暂停' : '播放'} aria-label={playing ? '暂停步骤' : '播放步骤'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="icon-command" disabled={index >= lastIndex} onClick={() => { setPlaying(false); setIndex((current) => Math.min(lastIndex, current + 1)); }} title="下一步" aria-label="下一步"><SkipForward size={16} /></button>
        </div>
        <span>{index + 1} / {steps.length}</span>
      </div>
      <ol className="step-list" aria-live={announceChanges ? 'polite' : undefined} ref={listRef}>
        {steps.slice(0, index + 1).map((step, stepIndex) => (
          <li key={step.id} className={stepIndex === index ? 'current' : ''} ref={stepIndex === index ? activeStepRef : undefined}>
            <span>{String(stepIndex + 1).padStart(2, '0')}</span>
            <div><strong>{step.label}</strong><code>{step.value}</code></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
