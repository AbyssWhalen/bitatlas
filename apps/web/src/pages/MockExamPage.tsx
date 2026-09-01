import { ArrowRight, ClipboardCheck, Clock3, FileCheck2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MockExam } from '@408os/domain';
import { useStudy } from '../app/StudyContext';

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function statusLabel(exam: MockExam): string {
  if (exam.status === 'in-progress') return '答题中';
  if (exam.status === 'submitted') return '待完成自评';
  return '已完成';
}

function statusDetail(exam: MockExam): string {
  if (exam.status === 'in-progress') return '继续答题';
  if (exam.status === 'submitted') return '继续自评';
  return '查看结果';
}

function formatLocalTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function MockExamPage() {
  const navigate = useNavigate();
  const { packs, questions, mockExams, createMockExam } = useStudy();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const manifest = packs.find((pack) => pack.year === 2009);
  const paperQuestions = questions.filter((question) => question.year === 2009);
  const verified = manifest?.reviewStatus === 'verified';
  const paperShapeValid = manifest?.questionCount === 47
    && paperQuestions.length === 47
    && paperQuestions.every((question) => question.reviewStatus === 'verified');
  const ready = verified && paperShapeValid;

  const start = async () => {
    if (!ready || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const result = await createMockExam();
      navigate(`/mock/${encodeURIComponent(result.exam.id)}`);
    } catch (reason) {
      setStartError(`创建模考失败：${errorMessage(reason, '本地数据库暂时不可用')}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page mock-overview-page">
      <header className="page-header mock-page-header">
        <div>
          <p className="eyebrow">2009 FIXED PAPER</p>
          <h1>整卷模考</h1>
          <p>47 题 · 180 分钟 · 满分 150 分</p>
        </div>
        {ready && (
          <button className="primary-command" disabled={starting} onClick={() => void start()}>
            <Clock3 size={17} aria-hidden="true" />
            {starting ? '正在创建模考' : '开始 180 分钟模考'}
          </button>
        )}
      </header>

      <section className="mock-rule-grid" aria-label="模考规则">
        <article><ClipboardCheck size={20} aria-hidden="true" /><span>试卷</span><strong>47 题</strong><small>固定题序</small></article>
        <article><Clock3 size={20} aria-hidden="true" /><span>时长</span><strong>180 分钟</strong><small>到时自动交卷</small></article>
        <article><FileCheck2 size={20} aria-hidden="true" /><span>客观题</span><strong>80 分</strong><small>40 道单选</small></article>
        <article><FileCheck2 size={20} aria-hidden="true" /><span>综合题</span><strong>70 分</strong><small>交卷后自评</small></article>
      </section>

      {!verified && (
        <section className="review-warning mock-readiness-warning" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <div>
            <strong>尚未完成 47 题人工复核</strong>
            <p>当前 2009 题包状态为 {manifest?.reviewStatus ?? '未安装'}，固定整卷入口保持关闭。</p>
          </div>
          <Link className="secondary-command" to="/review/2009">进入内容复核</Link>
        </section>
      )}

      {verified && !paperShapeValid && (
        <section className="review-warning" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>当前题包声明 {manifest?.questionCount ?? 0} 题、实际载入 {paperQuestions.length} 题，且每道题都必须已 verified，未满足固定整卷的 47 题契约。创建入口保持关闭。</span>
        </section>
      )}

      {startError && <div className="review-warning" role="alert"><ShieldAlert size={18} aria-hidden="true" /><span>{startError}</span></div>}

      <section className="mock-history-section" aria-labelledby="mock-history-heading">
        <div className="section-heading-row">
          <div><p className="eyebrow">PERSISTED SESSIONS</p><h2 id="mock-history-heading">本地模考记录</h2></div>
          <span>{mockExams.length} 场</span>
        </div>
        {mockExams.length === 0 ? (
          <div className="mock-empty-state"><ClipboardCheck size={24} aria-hidden="true" /><p>尚无模考记录</p></div>
        ) : (
          <div className="mock-history-list">
            {mockExams.map((exam) => (
              <article key={exam.id}>
                <div className={`mock-status-mark ${exam.status}`} aria-hidden="true" />
                <div>
                  <strong>{exam.blueprint.year} 整卷模考</strong>
                  <span>{formatLocalTime(exam.startedAt)} · {statusLabel(exam)}</span>
                </div>
                <div className="mock-history-score">
                  {exam.score ? <strong>{exam.score.totalScore}<small> / {exam.blueprint.totalMaxScore}</small></strong> : <span>未交卷</span>}
                </div>
                <Link className="secondary-command" to={`/mock/${encodeURIComponent(exam.id)}`}>
                  {statusDetail(exam)}<ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
