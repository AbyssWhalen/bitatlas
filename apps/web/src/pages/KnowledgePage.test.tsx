import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentPackManifest, KnowledgePoint, Question, Subject } from '@408os/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { KnowledgePage } from './KnowledgePage';

const source = {
  publisher: 'source',
  title: 'source',
  url: 'https://example.com/source.pdf',
  fileName: 'source.pdf',
  sha256: 'a'.repeat(64),
  pages: [1],
  locator: 'page 1',
};

function question(id: string, number: number, subject: Subject, knowledgePointIds: string[]): Question {
  return {
    id,
    year: 2009,
    number,
    subject,
    kind: 'single-choice',
    stem: [{ type: 'text', text: id }],
    options: ['A', 'B', 'C', 'D'].map((optionId) => ({
      id: optionId as 'A' | 'B' | 'C' | 'D',
      content: [{ type: 'text' as const, text: optionId }],
    })),
    answer: { type: 'choice', optionId: 'A' },
    explanation: [],
    hints: [],
    knowledgePointIds,
    assetIds: [],
    source: { question: source, answer: source, crosschecks: [], redistribution: 'unknown' },
    contentVersion: '2009.1',
    reviewStatus: 'needs-review',
  };
}

const pack: ContentPackManifest = {
  id: 'cn408-2009',
  schemaVersion: 1,
  contentVersion: '2009.1',
  title: '2009',
  year: 2009,
  questionCount: 47,
  createdAt: '2026-08-05T00:00:00.000Z',
  sha256: 'b'.repeat(64),
  reviewStatus: 'needs-review',
};

const knowledgePoints: KnowledgePoint[] = [
  { id: 'subject-data-structures', subject: 'data-structures', name: '数据结构根节点' },
  { id: 'topic-ds', subject: 'data-structures', name: 'DS 叶节点', parentId: 'subject-data-structures' },
  { id: 'subject-operating-systems', subject: 'operating-systems', name: '操作系统根节点' },
  { id: 'topic-os', subject: 'operating-systems', name: 'OS 叶节点', parentId: 'subject-operating-systems' },
];

const study = vi.hoisted(() => ({
  attempts: [],
  createSession: vi.fn(async () => 'knowledge-session'),
  knowledgePoints: [] as KnowledgePoint[],
  packs: [] as ContentPackManifest[],
  questions: [] as Question[],
  reviewSummary: { total: 47, approved: 0 },
}));

const graph = vi.hoisted(() => ({
  onSelects: [] as Array<(knowledgePointId: string) => void>,
}));

study.knowledgePoints = knowledgePoints;
study.packs = [pack];
study.questions = [
  question('cn408-2009-q01', 1, 'data-structures', ['subject-data-structures', 'topic-ds']),
  question('cn408-2009-q29', 29, 'operating-systems', ['subject-operating-systems', 'topic-os']),
];

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

vi.mock('../components/KnowledgeGraph', () => ({
  KnowledgeGraph: ({ selectedId, onSelect }: {
    selectedId: string | null;
    onSelect: (knowledgePointId: string) => void;
  }) => {
    graph.onSelects.push(onSelect);
    return (
      <div aria-label="测试知识图">
        <output aria-label="图选中节点">{selectedId}</output>
        <button type="button" onClick={() => onSelect('topic-os')}>选择图中 OS 叶节点</button>
      </div>
    );
  },
}));

function LocationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <output aria-label="当前测试 URL">{location.pathname}{location.search}</output>
      <button type="button" onClick={() => navigate('/knowledge?subject=operating-systems&node=topic-os')}>测试同路由跳转</button>
      <button type="button" onClick={() => void navigate(-1)}>测试后退</button>
      <button type="button" onClick={() => void navigate(1)}>测试前进</button>
    </div>
  );
}

function renderPage(path = '/knowledge') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/knowledge" element={<><KnowledgePage /><LocationControls /></>} />
        <Route path="/practice/:sessionId" element={<h1>知识点练习</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function expectSelection(name: string, id: string) {
  expect(screen.getByRole('heading', { level: 2, name })).toBeVisible();
  expect(screen.getByLabelText('图选中节点')).toHaveTextContent(id);
}

describe('KnowledgePage URL state', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    graph.onSelects.length = 0;
  });

  it.each([
    {
      path: '/knowledge',
      canonical: '/knowledge?subject=data-structures',
      heading: '数据结构根节点',
      selectedId: 'subject-data-structures',
    },
    {
      path: '/knowledge?subject=invalid&node=topic-os&extra=1',
      canonical: '/knowledge?subject=data-structures',
      heading: '数据结构根节点',
      selectedId: 'subject-data-structures',
    },
    {
      path: '/knowledge?subject=operating-systems&node=topic-ds&extra=1',
      canonical: '/knowledge?subject=operating-systems',
      heading: '操作系统根节点',
      selectedId: 'subject-operating-systems',
    },
  ])('normalizes $path without changing the resolved selection', async ({ path, canonical, heading, selectedId }) => {
    renderPage(path);

    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent(canonical));
    expectSelection(heading, selectedId);
  });

  it('uses a valid subject and node pair directly from the URL', () => {
    renderPage('/knowledge?subject=operating-systems&node=topic-os');

    expectSelection('OS 叶节点', 'topic-os');
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=operating-systems&node=topic-os');
  });

  it('exposes exactly one pressed subject and moves it with the URL selection', async () => {
    renderPage();
    const subjectGroup = within(screen.getByRole('region', { name: '科目选择' }));

    expect(subjectGroup.getAllByRole('button')).toHaveLength(4);
    expect(subjectGroup.getAllByRole('button', { pressed: true })).toHaveLength(1);
    expect(subjectGroup.getAllByRole('button', { pressed: false })).toHaveLength(3);
    expect(subjectGroup.getByRole('button', { name: /^数据结构$/u, pressed: true })).toBeVisible();

    fireEvent.click(subjectGroup.getByRole('button', { name: /^操作系统$/u }));

    await waitFor(() => expect(subjectGroup.getByRole('button', { name: /^操作系统$/u, pressed: true })).toBeVisible());
    expect(subjectGroup.getAllByRole('button', { pressed: true })).toHaveLength(1);
    expect(subjectGroup.getAllByRole('button', { pressed: false })).toHaveLength(3);
  });

  it('allows no pressed leaf at a subject root and exposes one after leaf selection', async () => {
    renderPage();
    const subjectGroup = within(screen.getByRole('region', { name: '科目选择' }));
    const topicListElement = document.querySelector('.knowledge-topic-list');
    expect(topicListElement).not.toBeNull();
    const topics = within(topicListElement as HTMLElement);

    expect(topics.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    expect(topics.getAllByRole('button', { pressed: false })).toHaveLength(1);

    fireEvent.click(topics.getByRole('button', { name: /^DS 叶节点/u }));
    await waitFor(() => expect(topics.getByRole('button', { name: /^DS 叶节点/u, pressed: true })).toBeVisible());
    expect(topics.getAllByRole('button', { pressed: true })).toHaveLength(1);

    fireEvent.click(subjectGroup.getByRole('button', { name: /^操作系统$/u }));
    await waitFor(() => expect(topics.getByRole('button', { name: /^OS 叶节点/u, pressed: false })).toBeVisible());
    expect(topics.queryAllByRole('button', { pressed: true })).toHaveLength(0);

    fireEvent.click(topics.getByRole('button', { name: /^OS 叶节点/u }));
    await waitFor(() => expect(topics.getByRole('button', { name: /^OS 叶节点/u, pressed: true })).toBeVisible());
    expect(topics.getAllByRole('button', { pressed: true })).toHaveLength(1);
  });

  it.each([
    { key: '{Enter}', label: 'Enter' },
    { key: ' ', label: 'Space' },
  ])('returns to the current subject root with $label and restores history', async ({ key }) => {
    const user = userEvent.setup();
    renderPage('/knowledge?subject=operating-systems&node=topic-os');
    const topicListElement = document.querySelector('.knowledge-topic-list');
    expect(topicListElement).not.toBeNull();
    const topics = within(topicListElement as HTMLElement);
    const overview = screen.getByRole('button', {
      name: '操作系统科目总览',
      pressed: false,
    });

    expect(topics.getByRole('button', { name: /^OS 叶节点/u, pressed: true })).toBeVisible();
    overview.focus();
    expect(overview).toHaveFocus();

    await user.keyboard(key);

    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent(
      /^\/knowledge\?subject=operating-systems$/u,
    ));
    expectSelection('操作系统根节点', 'subject-operating-systems');
    expect(overview).toHaveFocus();
    expect(overview).toHaveAttribute('aria-pressed', 'true');
    expect(topics.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    expect(topics.getAllByRole('button', { pressed: false })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '测试后退' }));
    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent(
      /^\/knowledge\?subject=operating-systems&node=topic-os$/u,
    ));
    expectSelection('OS 叶节点', 'topic-os');
    expect(overview).toHaveAttribute('aria-pressed', 'false');
    expect(topics.getByRole('button', { name: /^OS 叶节点/u, pressed: true })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '测试前进' }));
    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent(
      /^\/knowledge\?subject=operating-systems$/u,
    ));
    expectSelection('操作系统根节点', 'subject-operating-systems');
    expect(overview).toHaveAttribute('aria-pressed', 'true');
    expect(topics.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });

  it('writes user selections to history and restores them with back and forward', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=data-structures'));

    fireEvent.click(screen.getByRole('button', { name: /^操作系统$/u }));
    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=operating-systems'));
    expectSelection('操作系统根节点', 'subject-operating-systems');

    fireEvent.click(screen.getByRole('button', { name: /^OS 叶节点/u }));
    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=operating-systems&node=topic-os'));
    expectSelection('OS 叶节点', 'topic-os');

    fireEvent.click(screen.getByRole('button', { name: '测试后退' }));
    await waitFor(() => expectSelection('操作系统根节点', 'subject-operating-systems'));
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=operating-systems');

    fireEvent.click(screen.getByRole('button', { name: '测试前进' }));
    await waitFor(() => expectSelection('OS 叶节点', 'topic-os'));
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=operating-systems&node=topic-os');
  });

  it('reacts to same-route query navigation instead of keeping mount-time state', async () => {
    renderPage('/knowledge?subject=data-structures&node=topic-ds');
    expectSelection('DS 叶节点', 'topic-ds');

    fireEvent.click(screen.getByRole('button', { name: '测试同路由跳转' }));
    await waitFor(() => expectSelection('OS 叶节点', 'topic-os'));
    expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=operating-systems&node=topic-os');

    fireEvent.click(screen.getByRole('button', { name: '测试后退' }));
    await waitFor(() => expectSelection('DS 叶节点', 'topic-ds'));
    fireEvent.click(screen.getByRole('button', { name: '测试前进' }));
    await waitFor(() => expectSelection('OS 叶节点', 'topic-os'));
  });

  it('writes graph selections through the same canonical URL path', async () => {
    renderPage('/knowledge?subject=operating-systems');
    fireEvent.click(screen.getByRole('button', { name: '选择图中 OS 叶节点' }));

    await waitFor(() => expect(screen.getByLabelText('当前测试 URL')).toHaveTextContent('/knowledge?subject=operating-systems&node=topic-os'));
    expectSelection('OS 叶节点', 'topic-os');
  });

  it('keeps the graph selection callback stable when only the selected node changes', async () => {
    renderPage('/knowledge?subject=operating-systems');
    const initialOnSelect = graph.onSelects.at(-1);
    expect(initialOnSelect).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /^OS 叶节点/u }));
    await waitFor(() => expectSelection('OS 叶节点', 'topic-os'));

    expect(graph.onSelects.at(-1)).toBe(initialOnSelect);
  });

  it('does not add duplicate history entries for repeated graph selection events', async () => {
    renderPage('/knowledge?subject=operating-systems');
    const onSelect = graph.onSelects.at(-1);
    expect(onSelect).toBeDefined();

    act(() => {
      onSelect?.('topic-os');
      onSelect?.('topic-os');
    });
    await waitFor(() => expectSelection('OS 叶节点', 'topic-os'));

    fireEvent.click(screen.getByRole('button', { name: '测试后退' }));
    await waitFor(() => expectSelection('操作系统根节点', 'subject-operating-systems'));
  });
});
