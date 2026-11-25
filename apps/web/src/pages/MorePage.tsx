import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Cpu,
  Database,
  FileText,
  GitBranch,
  HardDrive,
  Network,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SERVER_MODE } from '../app/server-mode';

export function MorePage() {
  const destinations = [
    { to: '/documents', label: SERVER_MODE ? '共享资料' : '本地资料', desc: SERVER_MODE ? '按需在线阅读与离线 PDF 管理' : '浏览器内导入与离线阅读 PDF', icon: FileText },
    { to: '/wrong', label: '错题重练', desc: '按年份筛选并集中重练当前错题', icon: BookOpenCheck },
    { to: '/stats', label: '学习统计', desc: '有效首答证据、热力图与薄弱点', icon: BarChart3 },
    { to: '/settings', label: '备份与数据管理', desc: SERVER_MODE ? '账号同步、缓存与学习备份导出' : '题包状态、备份导出与恢复', icon: Database },
    { to: '/mock', label: '正式模考', desc: '整卷计时模拟与开放条件说明', icon: Clock3 },
    { to: '/lab', label: '组成原理实验', desc: '浮点、Cache、数据通路与流水线', icon: Cpu },
    { to: '/lab/data-structures', label: '数据结构实验', desc: '栈队列、树堆、图与排序过程', icon: GitBranch },
    { to: '/lab/os-memory', label: '操作系统实验', desc: '虚拟内存、调度、信号量与死锁', icon: HardDrive },
    { to: '/lab/network', label: '网络实验', desc: 'CIDR、滑动窗口、CSMA/CD 与 TCP', icon: Network },
  ] as const;

  return (
    <div className="page more-page sec-page sec-more">
      <header className="sec-header">
        <div className="sec-header-main">
          <h1>更多学习工具</h1>
          <p className="sec-statement">资料、实验与学习数据</p>
          <p className="sec-subtitle">集中访问四个实验模块、错题统计、PDF 资料库与备份管理。</p>
        </div>
      </header>
      <nav className="more-grid sec-more-grid" aria-label="更多工具">
        {destinations.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="sec-more-card">
            <span className="sec-more-icon" aria-hidden="true"><Icon size={18} /></span>
            <span className="sec-more-copy">
              <strong>{label}</strong>
              <small>{desc}</small>
            </span>
            <ArrowRight size={16} className="sec-more-arrow" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
