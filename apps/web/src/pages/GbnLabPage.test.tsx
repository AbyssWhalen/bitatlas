import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GbnLabPage } from './GbnLabPage';

const study = vi.hoisted(() => ({
  createSession: vi.fn(async () => 'q35-session'),
  questions: [{ id: 'cn408-2009-q35', year: 2009, number: 35 }],
}));

function HistoryControls() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <output aria-label="current search">{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>history back</button>
      <button type="button" onClick={() => navigate(1)}>history forward</button>
    </>
  );
}

vi.mock('../app/StudyContext', () => ({ useStudy: () => study }));

function renderPage(path = '/lab/network?module=gbn&preset=cn408-2009-q35') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab/network" element={<GbnLabPage />} />
        <Route path="/practice/:sessionId" element={<h1>Q35 单题练习</h1>} />
      </Routes>
      <HistoryControls />
    </MemoryRouter>,
  );
}

describe('GbnLabPage', () => {
  beforeEach(() => study.createSession.mockClear());
  afterEach(cleanup);

  it('renders the Q35 cumulative ACK and timeout result without misstating ACK semantics', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Go-Back-N 实验室' })).toBeVisible();
    expect(screen.getByText('needs-review')).toBeVisible();
    expect(screen.getByText(/ACK n = 接收方最后按序收到的帧 n/u)).toBeVisible();
    expect(screen.getByText(/不是“下一个期望编号”/u)).toBeVisible();
    expect(screen.getByText('ACK 3')).toBeVisible();
    expect(screen.getByText('0, 1, 2, 3')).toBeVisible();
    expect(screen.getByText('4, 5, 6, 7')).toBeVisible();
  });

  it('keeps the sender window visualization synchronized with StepExplorer', async () => {
    renderPage();

    const sequence0 = document.querySelector('[data-gbn-sequence="0"]');
    expect(sequence0).not.toHaveClass('gbn-in-flight');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => expect(sequence0).toHaveClass('gbn-in-flight', 'gbn-base', 'gbn-timer-owner'));
    expect(document.querySelector('[data-gbn-sequence="1"]')).toHaveClass('gbn-next-seq');
    expect(screen.getAllByText('发送 frame 0')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '播放步骤' })).toBeEnabled();
  });

  it('accepts a strict custom action script and rejects invalid configuration or syntax without stale output', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('序号空间'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('发送窗口大小'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('GBN 动作脚本'), {
      target: { value: 'send\ndrop-frame 0\nframe-arrive 0\ndrop-ack 0\nack-arrive 0\ntimeout' },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/6 条动作/u)).toBeVisible();

    fireEvent.change(screen.getByLabelText('发送窗口大小'), { target: { value: '4' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/窗口必须小于序号空间/u);
    expect(screen.queryByText('4, 5, 6, 7')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('发送窗口大小'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('GBN 动作脚本'), { target: { value: 'ack-arrive nope' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/第 1 行/u);
    expect(screen.queryByLabelText('GBN 步骤状态')).not.toBeInTheDocument();
  });

  it('restores the exact Q35 preset after custom edits', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('序号空间'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('GBN 动作脚本'), { target: { value: 'send' } });

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q35 预设' }));

    expect(screen.getByLabelText('序号空间')).toHaveValue('8');
    expect(screen.getByLabelText('发送窗口大小')).toHaveValue('4');
    expect(screen.getByLabelText<HTMLTextAreaElement>('GBN 动作脚本').value).toContain('ack-arrive 3');
    expect(screen.getByText('4, 5, 6, 7')).toBeVisible();
  });

  it('starts the exact Q35 practice session', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '练习 2009 · Q35' }));

    expect(await screen.findByRole('heading', { name: 'Q35 单题练习' })).toBeVisible();
    expect(study.createSession).toHaveBeenCalledWith(['cn408-2009-q35'], 'practice');
  });

  it('restores custom configuration from the URL and writes edits back without the preset', () => {
    renderPage('/lab/network?module=gbn&sequenceSpace=4&windowSize=2&script=send%0Atimeout');

    expect(screen.getByLabelText('序号空间')).toHaveValue('4');
    expect(screen.getByLabelText('发送窗口大小')).toHaveValue('2');
    expect(screen.getByLabelText('GBN 动作脚本')).toHaveValue('send\ntimeout');

    fireEvent.change(screen.getByLabelText('发送窗口大小'), { target: { value: '1' } });
    expect(screen.getByLabelText('current search')).toHaveTextContent('module=gbn');
    expect(screen.getByLabelText('current search')).toHaveTextContent('sequenceSpace=4');
    expect(screen.getByLabelText('current search')).toHaveTextContent('windowSize=1');
    expect(screen.getByLabelText('current search')).not.toHaveTextContent('preset=');

    fireEvent.click(screen.getByRole('button', { name: '恢复 Q35 预设' }));
    expect(screen.getByLabelText('current search')).toHaveTextContent('?module=gbn&preset=cn408-2009-q35');
  });

  it('rejects scripts that exceed the bounded text or action limits', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('GBN 动作脚本'), { target: { value: `${' '.repeat(16_384)}send` } });
    expect(screen.getByRole('alert')).toHaveTextContent('脚本文本最多 16384 个字符');

    fireEvent.change(screen.getByLabelText('GBN 动作脚本'), { target: { value: Array.from({ length: 129 }, () => 'send').join('\n') } });
    expect(screen.getByRole('alert')).toHaveTextContent('动作最多 128 条');
  });

  it('keeps a script that exceeds the reliable URL budget out of browser history', () => {
    renderPage();
    const oversizedForUrl = `${' '.repeat(8_000)}send`;

    fireEvent.change(screen.getByLabelText('GBN 动作脚本'), { target: { value: oversizedForUrl } });

    expect(screen.getByLabelText('GBN 动作脚本')).toHaveValue(oversizedForUrl);
    expect(screen.getByRole('alert')).toHaveTextContent('脚本编码后的实验 URL 最多 8000 个字符');
    expect(screen.getByLabelText('current search')).toHaveTextContent('?module=gbn&preset=cn408-2009-q35');

    fireEvent.change(screen.getByLabelText('发送窗口大小'), { target: { value: '2' } });
    expect(screen.getByLabelText('发送窗口大小')).toHaveValue('2');
    expect(screen.getByLabelText('current search')).toHaveTextContent('?module=gbn&preset=cn408-2009-q35');

    fireEvent.change(screen.getByLabelText('GBN 动作脚本'), { target: { value: 'send' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('current search')).toHaveTextContent('windowSize=2');
    expect(screen.getByLabelText('current search')).toHaveTextContent('script=send');
    expect(screen.getByLabelText('current search')).not.toHaveTextContent('preset=');
  });
});
