import { MISTAKE_REASONS, type MistakeReason } from '@408os/domain';
import { Check } from 'lucide-react';

const SHORT_MISTAKE_LABELS: Record<MistakeReason, string> = {
  concept: '概念',
  method: '方法',
  calculation: '计算',
  reading: '审题',
  other: '其他',
};

interface PracticeMistakePanelProps {
  value: MistakeReason | '';
  busy: boolean;
  disabled: boolean;
  skipped: boolean;
  justSaved: boolean;
  onSelect: (reason: MistakeReason | null) => void;
  onSkip: () => void;
  onReopen: () => void;
}

export function PracticeMistakePanel({
  value,
  busy,
  disabled,
  skipped,
  justSaved,
  onSelect,
  onSkip,
  onReopen,
}: PracticeMistakePanelProps) {
  if (skipped && !value) {
    return (
      <div className="rl-mistake-skipped">
        <span>已跳过错因记录</span>
        <button
          type="button"
          className="rl-link-btn"
          disabled={disabled || busy}
          onClick={onReopen}
        >
          补充错因
        </button>
      </div>
    );
  }

  return (
    <div className="rl-mistake-panel" aria-label="记录错因">
      <div className="rl-mistake-header">
        <span className="rl-mistake-title">记录错因（可选）</span>
        <div className="rl-mistake-meta">
          {justSaved && <span className="rl-mistake-saved" aria-live="polite">已保存</span>}
          {!value && (
            <button
              type="button"
              className="rl-link-btn"
              disabled={disabled || busy}
              onClick={onSkip}
            >
              跳过
            </button>
          )}
        </div>
      </div>
      <div className="rl-mistake-options" role="group" aria-label="错因分类">
        {MISTAKE_REASONS.map((reason) => {
          const active = value === reason;
          return (
            <button
              key={reason}
              type="button"
              className={active ? 'rl-mistake-chip is-active' : 'rl-mistake-chip'}
              aria-pressed={active}
              disabled={disabled || busy}
              onClick={() => onSelect(active ? null : reason)}
            >
              {active && <Check size={14} aria-hidden="true" />}
              <span>{SHORT_MISTAKE_LABELS[reason]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
