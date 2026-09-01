import { LEGACY_CONTENT_VERSION, type Question, type StudySession, type UserResponse } from '@408os/domain';
import { StudySessionConflictError } from '@408os/storage';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticePage } from './PracticePage';

const study = vi.hoisted(() => ({
  getSession: vi.fn(),
  saveResponse: vi.fn(),
  submitResponse: vi.fn(),
  moveSession: vi.fn(),
  finishSession: vi.fn(),
  setMastery: vi.fn(),
  toggleCollection: vi.fn(),
  saveNote: vi.fn(),
}));

vi.mock('../app/StudyContext', () => ({
  useStudy: () => ({
    packs: [{ id: 'cn408-2009', year: 2009 }],
    questions: [question, secondQuestion, comprehensiveQuestion],
    attempts: [],
    progress: new Map(),
    currentProgress: new Map(),
    collections: new Set(),
    notes: new Map(),
    ...study,
  }),
}));

vi.mock('../components/LazyContentRenderer', () => ({
  LazyContentRenderer: ({ blocks }: { blocks: Array<{ type: string; text?: string }> }) => (
    <>{blocks.map((block, index) => <span key={index}>{block.text ?? block.type}</span>)}</>
  ),
}));

vi.mock('../components/SourcePageImage', () => ({
  SourcePageImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const timestamp = '2026-08-07T00:00:00.000Z';

const question: Question = {
  id: 'cn408-2009-q01',
  year: 2009,
  number: 1,
  subject: 'data-structures',
  kind: 'single-choice',
  stem: [{ type: 'text', text: '测试题干' }],
  options: ['A', 'B', 'C', 'D'].map((id) => ({
    id: id as 'A' | 'B' | 'C' | 'D',
    content: [{ type: 'text' as const, text: `${id} 选项` }],
  })),
  answer: { type: 'choice', optionId: 'B' },
  explanation: [],
  hints: [],
  knowledgePointIds: [],
  assetIds: [],
  source: {
    question: {
      publisher: '来源',
      title: '2009 真题',
      url: 'https://example.com/questions.pdf',
      fileName: 'questions.pdf',
      sha256: 'a'.repeat(64),
      pages: [1],
      locator: '第 1 页',
    },
    answer: {
      publisher: '来源',
      title: '2009 解析',
      url: 'https://example.com/answers.pdf',
      fileName: 'answers.pdf',
      sha256: 'b'.repeat(64),
      pages: [1],
      locator: '第 1 页',
    },
    crosschecks: [],
    redistribution: 'unknown',
  },
  contentVersion: '2009.0-draft.2',
  reviewStatus: 'needs-review',
};

const secondQuestion: Question = {
  ...question,
  id: 'cn408-2009-q02',
  number: 2,
  stem: [{ type: 'text', text: '第二个会话题干' }],
  contentVersion: '2009.0-draft.3',
};

const comprehensiveQuestion: Question = {
  ...question,
  id: 'cn408-2009-q44',
  number: 44,
  kind: 'comprehensive',
  stem: [{ type: 'text', text: '综合题测试题干' }],
  answer: {
    type: 'comprehensive',
    maxScore: 10,
    rubric: [],
    reference: [{ type: 'text', text: '综合题参考答案' }],
  },
};

const session: StudySession = {
  id: 'session-1',
  mode: 'practice',
  questionIds: [question.id],
  questionContentVersions: { [question.id]: question.contentVersion },
  currentIndex: 0,
  responses: {},
  submittedQuestionIds: [],
  startedAt: timestamp,
  updatedAt: timestamp,
};

const secondSession: StudySession = {
  ...session,
  id: 'session-2',
  questionIds: [secondQuestion.id],
  questionContentVersions: { [secondQuestion.id]: secondQuestion.contentVersion },
};

const comprehensiveSession: StudySession = {
  ...session,
  id: 'session-comprehensive',
  questionIds: [comprehensiveQuestion.id],
  questionContentVersions: { [comprehensiveQuestion.id]: comprehensiveQuestion.contentVersion },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function renderPractice({
  showSessionSwitch = false,
  initialSessionId = session.id,
}: {
  showSessionSwitch?: boolean;
  initialSessionId?: string;
} = {}) {
  return render(
    <MemoryRouter initialEntries={[`/practice/${initialSessionId}`]}>
      <Routes>
        <Route
          path="/practice/:sessionId"
          element={(
            <>
              <PracticePage />
              {showSessionSwitch && <Link to={`/practice/${secondSession.id}`}>打开第二个会话</Link>}
            </>
          )}
        />
        <Route path="/questions" element={<h1>真题入口</h1>} />
        <Route path="/stats" element={<h1>学习统计</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PracticePage recovery and response persistence', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    study.getSession.mockResolvedValue(session);
    study.saveResponse.mockImplementation(async (
      current: StudySession,
      questionId: string,
      response: UserResponse,
    ) => ({
      ...current,
      responses: { ...current.responses, [questionId]: response },
      updatedAt: '2026-08-07T00:00:01.000Z',
    }));
    study.submitResponse.mockImplementation(async (current: StudySession) => current);
    study.moveSession.mockImplementation(async (current: StudySession) => current);
    study.finishSession.mockImplementation(async (current: StudySession) => current);
    study.setMastery.mockResolvedValue(undefined);
    study.toggleCollection.mockResolvedValue(undefined);
    study.saveNote.mockResolvedValue(undefined);
  });

  async function revealComprehensiveReference() {
    const user = userEvent.setup();
    study.getSession.mockResolvedValueOnce(comprehensiveSession);
    renderPractice({ initialSessionId: comprehensiveSession.id });

    expect(await screen.findByText('综合题测试题干')).toBeVisible();
    fireEvent.change(screen.getByLabelText('作答草稿'), { target: { value: '测试作答' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '查看参考答案' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '查看参考答案' }));

    return {
      input: await screen.findByRole('spinbutton', { name: /自评分/ }),
      user,
    };
  }

  it('restores an empty comprehensive self score to undefined and disables submission', async () => {
    const { input } = await revealComprehensiveReference();

    fireEvent.change(input, { target: { value: '5' } });
    await waitFor(() => expect(study.saveResponse).toHaveBeenLastCalledWith(
      expect.anything(),
      comprehensiveQuestion.id,
      expect.objectContaining({ type: 'comprehensive', selfScore: 5 }),
    ));

    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(study.saveResponse).toHaveBeenCalled());
    const clearedResponse = study.saveResponse.mock.calls.at(-1)?.[2] as UserResponse;
    expect(clearedResponse).toEqual(expect.objectContaining({ type: 'comprehensive' }));
    expect(clearedResponse).not.toHaveProperty('selfScore');
    expect(input).toHaveValue(null);
    expect(screen.getByRole('button', { name: '完成自评' })).toBeDisabled();
  });

  it.each([
    ['negative', '-1'],
    ['above the maximum', '11'],
  ])('keeps a %s comprehensive self score local and blocks submission', async (_name, rawScore) => {
    const { input, user } = await revealComprehensiveReference();
    study.saveResponse.mockClear();
    study.submitResponse.mockClear();

    await act(async () => {
      fireEvent.change(input, { target: { value: rawScore } });
      await Promise.resolve();
    });

    expect(input).toHaveValue(Number(rawScore));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('请输入 0 到 10 之间的分数');
    expect(study.saveResponse).not.toHaveBeenCalled();
    const submitButton = screen.getByRole('button', { name: '完成自评' });
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);
    expect(study.submitResponse).not.toHaveBeenCalled();
  });

  it.each([
    ['zero', '0', 0],
    ['the maximum', '10', 10],
  ])('persists and submits %s comprehensive self score', async (_name, rawScore, selfScore) => {
    const { input, user } = await revealComprehensiveReference();
    study.saveResponse.mockClear();
    study.submitResponse.mockClear();

    fireEvent.change(input, { target: { value: rawScore } });
    await waitFor(() => expect(study.saveResponse).toHaveBeenCalledWith(
      expect.anything(),
      comprehensiveQuestion.id,
      expect.objectContaining({ type: 'comprehensive', selfScore }),
    ));
    const submitButton = screen.getByRole('button', { name: '完成自评' });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    await waitFor(() => expect(study.submitResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        responses: expect.objectContaining({
          [comprehensiveQuestion.id]: expect.objectContaining({ selfScore }),
        }),
      }),
      comprehensiveQuestion,
      expect.objectContaining({ type: 'comprehensive', selfScore }),
      expect.any(Number),
    ));
  });

  it('exposes the selected single-choice option as a pressed partition', async () => {
    const user = userEvent.setup();
    const { container } = renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    const options = container.querySelectorAll<HTMLButtonElement>('.option-list > button');
    expect(options).toHaveLength(4);
    expect([...options].every((option) => option.getAttribute('aria-pressed') === 'false')).toBe(true);

    await user.click(options[0]!);

    await waitFor(() => expect(options[0]).toHaveAttribute('aria-pressed', 'true'));
    expect([...options].filter((option) => option.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(options[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('announces a single-choice result and moves focus to it after submit', async () => {
    const user = userEvent.setup();
    study.submitResponse.mockImplementationOnce(async (current: StudySession) => ({
      ...current,
      submittedQuestionIds: [question.id],
      updatedAt: '2026-08-07T00:00:02.000Z',
    }));
    const { container } = renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    const options = container.querySelectorAll<HTMLButtonElement>('.option-list > button');
    await user.click(options[0]!);
    await waitFor(() => expect(screen.getByRole('button', { name: '提交答案' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent('回答错误');
    expect(result).toHaveFocus();
  });

  it('moves focus into the source dialog and makes the practice background inert', async () => {
    const user = userEvent.setup();
    renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    const trigger = screen.getByRole('button', { name: /原卷第/ });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '来源页' });
    expect(dialog).toBeVisible();
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();
    expect(dialog.previousElementSibling).toHaveAttribute('inert');
    expect(document.querySelector('main')).toHaveAttribute('inert');
  });

  it('closes the source dialog on Escape and returns focus to its trigger', async () => {
    const user = userEvent.setup();
    renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    const trigger = screen.getByRole('button', { name: /原卷第/ });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: '来源页' })).toBeVisible();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: '来源页' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab focus within the source dialog', async () => {
    const user = userEvent.setup();
    renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /原卷第/ }));
    const close = screen.getByRole('button', { name: '关闭' });

    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(close).toHaveFocus();
  });

  it('shows a return path instead of loading forever when the session is missing', async () => {
    study.getSession.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderPractice();

    expect(await screen.findByRole('alert')).toHaveTextContent('未找到练习会话');
    expect(screen.queryByText('恢复练习会话')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回真题' }));
    expect(await screen.findByRole('heading', { name: '真题入口' })).toBeVisible();
  });

  it('reports a read failure and can retry the session load', async () => {
    study.getSession.mockRejectedValueOnce(new Error('IndexedDB 读取失败'));
    const user = userEvent.setup();
    renderPractice();

    expect(await screen.findByRole('alert')).toHaveTextContent('IndexedDB 读取失败');
    await user.click(screen.getByRole('button', { name: '重新读取' }));
    expect(await screen.findByText('测试题干')).toBeVisible();
    expect(study.getSession).toHaveBeenCalledTimes(2);
  });

  it('reports a stale session that references a missing question', async () => {
    study.getSession.mockResolvedValueOnce({
      ...session,
      questionIds: [question.id, 'cn408-2009-q99'],
    });
    renderPractice();

    expect(await screen.findByRole('alert')).toHaveTextContent('cn408-2009-q99');
    expect(screen.getByRole('button', { name: '返回真题' })).toBeVisible();
  });

  it('fails closed when a migrated session has no proven question version', async () => {
    study.getSession.mockResolvedValueOnce({
      ...session,
      questionContentVersions: { [question.id]: LEGACY_CONTENT_VERSION },
    });
    renderPractice();

    expect(await screen.findByRole('alert')).toHaveTextContent(/题面版本未知|legacy version/iu);
    expect(screen.queryByText('测试题干')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回真题' })).toBeVisible();
  });

  it('fails closed when the saved session version differs from current content', async () => {
    study.getSession.mockResolvedValueOnce({
      ...session,
      questionContentVersions: { [question.id]: '2009.0-stale' },
    });
    renderPractice();

    expect(await screen.findByRole('alert')).toHaveTextContent(/题面版本不一致|mismatch/iu);
    expect(screen.queryByText('测试题干')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回真题' })).toBeVisible();
  });

  it('keeps the draft and recovers the save queue after a rejected write', async () => {
    study.saveResponse.mockRejectedValueOnce(new Error('quota exceeded'));
    const user = userEvent.setup();
    const { container } = renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    await user.click(container.querySelectorAll<HTMLButtonElement>('.option-list > button')[0]!);

    expect(await screen.findByRole('alert')).toHaveTextContent('quota exceeded');
    expect(container.querySelectorAll<HTMLButtonElement>('.option-list > button')[0]).toHaveClass('selected');
    expect(screen.getByRole('button', { name: '重试保存' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '重试保存' })).not.toBeInTheDocument());
    expect(study.saveResponse).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /提交答案/ })).toBeEnabled();
  });

  it('can recover by continuing to edit after a rejected write', async () => {
    study.saveResponse.mockRejectedValueOnce(new Error('temporary failure'));
    const user = userEvent.setup();
    const { container } = renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    const options = container.querySelectorAll<HTMLButtonElement>('.option-list > button');
    await user.click(options[0]!);
    expect(await screen.findByRole('alert')).toHaveTextContent('temporary failure');

    await user.click(options[1]!);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(options[1]).toHaveClass('selected');
    expect(study.saveResponse).toHaveBeenCalledTimes(2);
  });

  it('fails closed on a response conflict and explicitly reloads the committed answer', async () => {
    const remoteSession: StudySession = {
      ...session,
      responses: { [question.id]: { type: 'choice', optionId: 'B' } },
      submittedQuestionIds: [question.id],
      updatedAt: '2026-08-07T00:00:02.000Z',
      completedAt: '2026-08-07T00:00:02.000Z',
    };
    study.getSession
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(remoteSession);
    study.saveResponse.mockRejectedValueOnce(new StudySessionConflictError());
    const user = userEvent.setup();
    const { container } = renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    const options = container.querySelectorAll<HTMLButtonElement>('.option-list > button');
    await user.click(options[0]!);

    expect(await screen.findByRole('alert')).toHaveTextContent('另一标签页已更新此练习');
    expect(options[0]).toHaveClass('selected');
    expect(options[0]).toBeDisabled();
    expect(screen.queryByRole('button', { name: '重试保存' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新读取最新进度' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '重新读取最新进度' })).not.toBeInTheDocument());
    expect(study.getSession).toHaveBeenCalledTimes(2);
    expect(options[0]).not.toHaveClass('selected');
    expect(options[1]).toHaveClass('selected');
    expect(screen.getByText('回答正确')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('练习已结束');
  });

  it('uses the same conflict recovery state when a session action is stale', async () => {
    study.finishSession.mockRejectedValueOnce(new StudySessionConflictError());
    const user = userEvent.setup();
    const { container } = renderPractice();

    expect(await screen.findByText('测试题干')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '结束' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('另一标签页已更新此练习');
    expect(screen.getByRole('button', { name: '重新读取最新进度' })).toBeVisible();
    expect(container.querySelector<HTMLButtonElement>('.palette-grid button')).toBeDisabled();
    expect(container.querySelector<HTMLButtonElement>('.option-list > button')).toBeDisabled();
  });

  it('keeps a completed session read-only and opens stats without another session write', async () => {
    study.getSession.mockResolvedValueOnce({
      ...session,
      responses: { [question.id]: { type: 'choice', optionId: 'A' } },
      completedAt: '2026-08-07T00:00:01.000Z',
      updatedAt: '2026-08-07T00:00:01.000Z',
    });
    const user = userEvent.setup();
    const { container } = renderPractice();

    expect(await screen.findByRole('alert')).toHaveTextContent('练习已结束');
    expect(container.querySelector<HTMLButtonElement>('.option-list > button.selected')).toBeDisabled();
    expect(container.querySelector<HTMLButtonElement>('.palette-grid button')).toBeDisabled();
    expect(screen.getByRole('button', { name: '结束' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '查看统计' }));
    expect(await screen.findByRole('heading', { name: '学习统计' })).toBeVisible();
    expect(study.saveResponse).not.toHaveBeenCalled();
    expect(study.submitResponse).not.toHaveBeenCalled();
    expect(study.moveSession).not.toHaveBeenCalled();
    expect(study.finishSession).not.toHaveBeenCalled();
  });

  it('clears response overlays when the route changes to another session', async () => {
    study.getSession.mockImplementation(async (id: string) => (id === session.id ? session : {
      ...session,
      id: secondSession.id,
    }));
    const user = userEvent.setup();
    const { container } = renderPractice({ showSessionSwitch: true });

    expect(await screen.findByText('测试题干')).toBeVisible();
    await user.click(container.querySelectorAll<HTMLButtonElement>('.option-list > button')[0]!);
    await waitFor(() => expect(study.saveResponse).toHaveBeenCalledTimes(1));
    expect(container.querySelectorAll<HTMLButtonElement>('.option-list > button')[0]).toHaveClass('selected');

    await user.click(screen.getByRole('link', { name: '打开第二个会话' }));
    await waitFor(() => expect(study.getSession).toHaveBeenLastCalledWith(secondSession.id));
    await waitFor(() => expect(container.querySelectorAll('.option-list > button.selected')).toHaveLength(0));
    expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();
    expect(study.submitResponse).not.toHaveBeenCalled();
  });

  it('ignores a save callback from the previous session after the next session loads', async () => {
    const delayedSave = deferred<StudySession>();
    study.getSession.mockImplementation(async (id: string) => (id === session.id ? session : secondSession));
    study.saveResponse.mockImplementationOnce(() => delayedSave.promise);
    const user = userEvent.setup();
    const { container } = renderPractice({ showSessionSwitch: true });

    expect(await screen.findByText('测试题干')).toBeVisible();
    await user.click(container.querySelectorAll<HTMLButtonElement>('.option-list > button')[0]!);
    await waitFor(() => expect(study.saveResponse).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('link', { name: '打开第二个会话' }));
    expect(await screen.findByText('第二个会话题干')).toBeVisible();

    await act(async () => {
      delayedSave.resolve({
        ...session,
        responses: { [question.id]: { type: 'choice', optionId: 'A' } },
        updatedAt: '2026-08-07T00:00:01.000Z',
      });
      await delayedSave.promise;
    });

    expect(screen.getByText('第二个会话题干')).toBeVisible();
    await user.click(container.querySelectorAll<HTMLButtonElement>('.option-list > button')[1]!);
    await waitFor(() => expect(study.saveResponse).toHaveBeenCalledTimes(2));
    expect(study.saveResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: secondSession.id }),
      secondQuestion.id,
      { type: 'choice', optionId: 'B' },
    );
  });
});
