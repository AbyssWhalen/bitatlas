import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Subject } from '@408os/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConceptState, ConceptStateRow } from '../app/concept-register';
import { ConceptRegister } from './ConceptRegister';

function row(conceptId: string, subject: Subject, state: ConceptState, extra: Partial<ConceptStateRow> = {}): ConceptStateRow {
  return { conceptId, name: `概念 ${conceptId}`, subject, state, questionCount: 5, attemptedQuestions: 2, cardCount: 1, dueCards: 0, labIds: [], lastActivityAt: null, ...extra };
}

const concepts = [
  row('ds.a', 'data-structures', 'unstarted', { attemptedQuestions: 0 }),
  row('ds.b', 'data-structures', 'practicing'),
  row('ds.c', 'data-structures', 'stable', { dueCards: 1 }),
  row('os.a', 'operating-systems', 'consolidating'),
];

function renderRegister(props: Partial<Parameters<typeof ConceptRegister>[0]> = {}) {
  const onSelect = vi.fn();
  render(<ConceptRegister concepts={concepts} todayConceptIds={['ds.b']} selectedId={null} onSelect={onSelect} {...props} />);
  return onSelect;
}

afterEach(() => cleanup());

describe('ConceptRegister', () => {
  it('renders nothing without concept data instead of an empty grid', () => {
    const { container } = render(<ConceptRegister concepts={[]} todayConceptIds={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('groups cells by subject and states each one in words, with no percentage', () => {
    renderRegister();
    const ds = within(screen.getByRole('group', { name: '数据结构概念' }));
    expect(ds.getAllByRole('button')).toHaveLength(3);
    expect(within(screen.getByRole('group', { name: '操作系统概念' })).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('group', { name: '组成原理概念' })).not.toBeInTheDocument();
    expect(ds.getByRole('button', { name: '概念 ds.a · 未开始 · 已练题目 0/5 · 记忆卡 1 张' })).toBeInTheDocument();
    expect(ds.getByRole('button', { name: '概念 ds.b · 练习中 · 已练题目 2/5 · 记忆卡 1 张 · 今日任务涉及' })).toHaveClass('is-practicing', 'is-today');
    expect(ds.getByRole('button', { name: '概念 ds.c · 稳定 · 已练题目 2/5 · 记忆卡 1 张，到期 1 张' })).toHaveClass('is-stable');
    expect(screen.getByRole('region', { name: '概念寄存器' })).not.toHaveTextContent('%');
    expect(screen.getByText('稳定 1 / 3')).toBeInTheDocument();
  });

  it('keeps one tab stop per subject and moves it with the arrow keys', () => {
    renderRegister();
    const group = screen.getByRole('group', { name: '数据结构概念' });
    const [first, second, third] = within(group).getAllByRole('button');
    expect([first, second, third].map((cell) => cell!.tabIndex)).toEqual([0, -1, -1]);
    expect(within(screen.getByRole('group', { name: '操作系统概念' })).getByRole('button').tabIndex).toBe(0);

    first!.focus();
    fireEvent.keyDown(first!, { key: 'ArrowRight' });
    expect(second).toHaveFocus();
    expect([first, second, third].map((cell) => cell!.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(second!, { key: 'End' });
    expect(third).toHaveFocus();
    fireEvent.keyDown(third!, { key: 'ArrowRight' });
    expect(third).toHaveFocus();
    fireEvent.keyDown(third!, { key: 'Home' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first!, { key: 'ArrowRight', ctrlKey: true });
    expect(first).toHaveFocus();
  });

  it('starts the tab stop on the selected concept and marks it as current', () => {
    renderRegister({ selectedId: 'ds.c' });
    const cells = within(screen.getByRole('group', { name: '数据结构概念' })).getAllByRole('button');
    expect(cells.map((cell) => cell.tabIndex)).toEqual([-1, -1, 0]);
    expect(cells[2]).toHaveAttribute('aria-current', 'true');
    expect(cells[0]).not.toHaveAttribute('aria-current');
  });

  it('updates the caption on focus and hover alike, and opens details on click without changing state', () => {
    const onSelect = renderRegister();
    const caption = document.querySelector('.register-caption')!;
    const cell = screen.getByRole('button', { name: /^概念 os\.a/u });
    expect(caption).toHaveTextContent('每格一个概念');
    fireEvent.mouseEnter(cell);
    expect(caption).toHaveTextContent('概念 os.a · 待巩固');
    fireEvent.mouseLeave(cell);
    expect(caption).toHaveTextContent('每格一个概念');
    fireEvent.focus(cell);
    expect(caption).toHaveTextContent('概念 os.a · 待巩固');

    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(concepts[3]);
    expect(cell).toHaveClass('is-consolidating');
  });

  it('exposes a per-subject disclosure for the collapsed phone layout', () => {
    renderRegister();
    const toggle = screen.getByRole('button', { name: '展开数据结构概念格' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '收起数据结构概念格' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '展开操作系统概念格' })).toHaveAttribute('aria-expanded', 'false');
  });
});
