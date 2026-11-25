import { SUBJECTS, type Subject } from '@408os/domain';
import { useState, type KeyboardEvent } from 'react';
import type { ConceptState, ConceptStateRow } from '../app/concept-register';
import { describeConcept, STATE_LABELS, STATE_ORDER, SUBJECT_MARKS } from './concept-labels';
import { SubjectShape } from './SubjectShape';

interface ConceptRegisterProps {
  concepts: readonly ConceptStateRow[];
  todayConceptIds: readonly string[];
  selectedId: string | null;
  onSelect: (row: ConceptStateRow) => void;
}

type RegisterFilter = 'all' | Extract<ConceptState, 'practicing' | 'consolidating' | 'unstarted'>;

const FILTER_OPTIONS: ReadonlyArray<{ id: RegisterFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'practicing', label: '练习中' },
  { id: 'consolidating', label: '待巩固' },
  { id: 'unstarted', label: '未开始' },
];

const IDLE_CAPTION = '每格一个概念。聚焦或悬停查看状态，点击打开详情。';

export function ConceptRegister({ concepts, todayConceptIds, selectedId, onSelect }: ConceptRegisterProps) {
  const [caption, setCaption] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Partial<Record<Subject, string>>>({});
  const [open, setOpen] = useState<ReadonlySet<Subject>>(new Set());
  const [stateFilter, setStateFilter] = useState<RegisterFilter>('all');
  const today = new Set(todayConceptIds);
  if (!concepts.length) return null;

  const filterCount = (filter: RegisterFilter) => (
    filter === 'all' ? concepts.length : concepts.filter((row) => row.state === filter).length
  );

  // One tab stop per subject: the remembered cell, else the selected one, else the first.
  const tabStop = (subject: Subject, rows: readonly ConceptStateRow[]) => {
    const remembered = rows.findIndex((row) => row.conceptId === cursor[subject]);
    if (remembered >= 0) return remembered;
    return Math.max(0, rows.findIndex((row) => row.conceptId === selectedId));
  };
  const move = (event: KeyboardEvent<HTMLDivElement>, subject: Subject, rows: readonly ConceptStateRow[]) => {
    const current = tabStop(subject, rows);
    const next = event.key === 'ArrowRight' ? current + 1 : event.key === 'ArrowLeft' ? current - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : null;
    if (next === null || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const target = rows[Math.min(rows.length - 1, Math.max(0, next))];
    if (!target) return;
    setCursor((previous) => ({ ...previous, [subject]: target.conceptId }));
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-concept="${CSS.escape(target.conceptId)}"]`)?.focus();
  };

  const totalMatching = filterCount(stateFilter);

  return <section className="register" aria-labelledby="register-title">
    <div className="register-head">
      <div className="register-head-main">
        <h2 id="register-title">概念寄存器</h2>
        <div className="register-filters" role="group" aria-label="概念状态筛选">
          {FILTER_OPTIONS.map((option) => {
            const active = stateFilter === option.id;
            const count = filterCount(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={active ? 'register-filter-chip is-active' : 'register-filter-chip'}
                aria-pressed={active}
                onClick={() => setStateFilter(option.id)}
              >
                <span>{option.label}</span>
                <span className="register-filter-num">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="register-caption" aria-hidden="true">{caption ?? IDLE_CAPTION}</p>
    </div>

    {totalMatching === 0 ? (
      <p className="register-empty-filter">
        当前没有处于“{stateFilter === 'all' ? '全部' : STATE_LABELS[stateFilter]}”状态的概念。
      </p>
    ) : (
      <div className="register-bank">
        {SUBJECTS.map((subject) => {
          const allSubjectRows = concepts.filter((row) => row.subject === subject);
          if (!allSubjectRows.length) return null;
          const visibleRows = stateFilter === 'all'
            ? allSubjectRows
            : allSubjectRows.filter((row) => row.state === stateFilter);
          if (!visibleRows.length) return null;
          const mark = SUBJECT_MARKS[subject];
          const expanded = open.has(subject) || stateFilter !== 'all';
          const stop = tabStop(subject, visibleRows);
          const cellsId = `register-cells-${subject}`;
          return <div className={`register-row${expanded ? ' is-open' : ''}`} key={subject}>
            <div className="register-row-head">
              <SubjectShape subject={subject} />
              <strong>{mark.label}</strong>
              <span className="register-count">
                {stateFilter === 'all'
                  ? `稳定 ${allSubjectRows.filter((row) => row.state === 'stable').length} / ${allSubjectRows.length}`
                  : `${STATE_LABELS[stateFilter]} ${visibleRows.length} / ${allSubjectRows.length}`}
              </span>
              <button type="button" className="register-toggle" aria-expanded={expanded} aria-controls={cellsId}
                aria-label={`${expanded ? '收起' : '展开'}${mark.label}概念格`}
                onClick={() => setOpen((previous) => {
                  const next = new Set(previous);
                  if (!next.delete(subject)) next.add(subject);
                  return next;
                })}>{expanded ? '收起' : '展开'}</button>
            </div>
            <div className="register-meter" aria-hidden="true">
              {STATE_ORDER.map((state) => {
                const count = allSubjectRows.filter((row) => row.state === state).length;
                return count ? <span key={state} className={`is-${state}`} style={{ flexGrow: count }} /> : null;
              })}
            </div>
            <div id={cellsId} className="register-cells" role="group" aria-label={`${mark.label}概念`} onKeyDown={(event) => move(event, subject, visibleRows)}>
              {visibleRows.map((row, index) => {
                const description = describeConcept(row, today.has(row.conceptId));
                return <button key={row.conceptId} type="button" data-concept={row.conceptId}
                  className={`bit is-${row.state}${today.has(row.conceptId) ? ' is-today' : ''}`}
                  tabIndex={index === stop ? 0 : -1} aria-label={description} title={row.name}
                  {...(row.conceptId === selectedId ? { 'aria-current': 'true' as const } : {})}
                  onFocus={() => { setCaption(description); setCursor((previous) => previous[subject] === row.conceptId ? previous : { ...previous, [subject]: row.conceptId }); }}
                  onMouseEnter={() => setCaption(description)}
                  onBlur={() => setCaption(null)} onMouseLeave={() => setCaption(null)}
                  onClick={() => onSelect(row)} />;
              })}
            </div>
          </div>;
        })}
      </div>
    )}

    <ul className="register-legend" aria-label="图例">
      {[...STATE_ORDER].reverse().map((state) => <li key={state}><i className={`bit is-${state}`} aria-hidden="true" />{STATE_LABELS[state]}</li>)}
      <li><i className="bit is-unstarted is-today" aria-hidden="true" />今日任务涉及</li>
    </ul>
  </section>;
}
