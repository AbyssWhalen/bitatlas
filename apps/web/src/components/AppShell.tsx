import { BarChart3, BookOpenCheck, BrainCircuit, Clock3, Cpu, FileText, Home, Library, Network, Settings, TriangleAlert } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '../app/brand';
import { useStudy } from '../app/StudyContext';

const links = [
  { to: '/', label: '总览', icon: Home },
  { to: '/questions', label: '真题', icon: Library },
  { to: '/mock', label: '模考', icon: Clock3 },
  { to: '/wrong', label: '错题', icon: BookOpenCheck },
  { to: '/knowledge', label: '知识', icon: Network },
  { to: '/lab', label: '实验', icon: Cpu },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/settings', label: '数据', icon: Settings },
];

const desktopLinks = [
  ...links.slice(0, 5),
  { to: '/documents', label: '资料', icon: FileText },
  ...links.slice(5),
];

export function AppShell() {
  const { loading, error, packs } = useStudy();
  const has2009Pack = packs.some((pack) => pack.year === 2009);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><img src="/favicon.svg" alt="" /></div>
          <div><strong>{PRODUCT_NAME}</strong><small>{PRODUCT_TAGLINE}</small></div>
        </div>
        <nav className="primary-nav" aria-label="主导航">
          {desktopLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} title={label}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-status">
          <BrainCircuit size={18} aria-hidden="true" />
          <div><span>2009 题包</span><strong>{loading ? '载入中' : error ? '异常' : has2009Pack ? '本地可用' : '未安装'}</strong></div>
        </div>
      </aside>
      <main className="main-area">
        {error ? (
          <section className="fatal-state">
            <TriangleAlert size={28} />
            <h1>内容初始化失败</h1>
            <p>{error}</p>
          </section>
        ) : loading ? (
          <section className="loading-state"><span className="loader" /><p>载入本地学习数据</p></section>
        ) : (
          <>
            {!has2009Pack && (
              <section className="content-unavailable-banner" role="status" aria-live="polite">
                <TriangleAlert size={20} aria-hidden="true" />
                <div><strong>本地 2009 题包未安装</strong><span>实验模块仍可使用；真题、模考与人工复核入口保持关闭。</span></div>
                <NavLink className="secondary-command compact-command" to="/lab"><Cpu size={16} aria-hidden="true" />打开实验</NavLink>
              </section>
            )}
            <Outlet />
          </>
        )}
      </main>
      <nav className="mobile-nav" aria-label="移动端导航">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} aria-label={label} title={label}>
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
