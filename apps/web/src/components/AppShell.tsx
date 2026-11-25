import { BarChart3, BookOpenCheck, Clock3, Cpu, FileText, Home, Library, ListX, Moon, MoreHorizontal, Network, Settings, Sun, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PRODUCT_NAME } from '../app/brand';
import { useStudy } from '../app/StudyContext';
import { useSessionSyncStatus } from '../app/useSessionSyncStatus';
import { ReadingPreferences } from './ReadingPreferences';
import { applyTheme, currentTheme, storedTheme, subscribeTheme, type Theme } from './theme';

const primaryLinks = [
  { to: '/', label: '今日', icon: Home, hotkey: 'T' },
  { to: '/questions', label: '题库', icon: Library, hotkey: 'Q' },
  { to: '/review', label: '复习', icon: BookOpenCheck, hotkey: 'R' },
  { to: '/knowledge', label: '知识', icon: Network, hotkey: 'K' },
  { to: '/lab', label: '实验', icon: Cpu, hotkey: 'L' },
];

const moreLinks = [
  { to: '/wrong', label: '错题', icon: ListX },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/documents', label: '资料', icon: FileText },
  { to: '/mock', label: '模考', icon: Clock3 },
  { to: '/settings', label: '数据', icon: Settings },
];

const mobileLinks = [
  ...primaryLinks.slice(0, 4),
  { to: '/more', label: '更多', icon: MoreHorizontal, hotkey: 'M' },
];

/** Answering pages keep their own single-key controls; a stray letter must never navigate away from unsubmitted work. */
const SESSION_ROUTE = /^\/(practice\/[^/]+|review\/cards\/[^/]+|mock\/[^/]+)\/?$/;

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme);
  useEffect(() => {
    // Covers builds whose HTML has no pre-paint script: an explicit stored choice still wins over the system setting.
    const stored = storedTheme();
    if (stored && document.documentElement.dataset.theme !== stored) document.documentElement.dataset.theme = stored;
  }, []);
  const next: Theme = theme === 'night' ? 'day' : 'night';
  const Icon = theme === 'night' ? Sun : Moon;
  const label = `切换到${next === 'night' ? '夜班' : '白昼'}主题`;
  return <button type="button" className="topbar-icon" aria-label={label} title={label} onClick={() => applyTheme(next)}>
    <Icon size={17} aria-hidden="true" />
  </button>;
}

/** Server mode only. Reports what is known: an empty queue is not presented as a completed sync. */
function SyncChip() {
  const sync = useSessionSyncStatus();
  if (sync.mode !== 'server' || !sync.loggedIn || sync.pendingCount === null) return null;
  const syncedAt = sync.lastSuccessfulSyncAt
    ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(sync.lastSuccessfulSyncAt))
    : null;
  return sync.pendingCount > 0
    ? <span className="status-chip tone-pending"><i aria-hidden="true" />待同步 {sync.pendingCount} 条</span>
    : <span className="status-chip tone-ready"><i aria-hidden="true" />{syncedAt ? `已同步 ${syncedAt}` : '无待同步记录'}</span>;
}

export function AppShell() {
  const { loading, contentReady, error, packs } = useStudy();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState({ open: false, at: pathname });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // The menu closes on navigation without an effect: it only counts as open on the path where it was opened.
  const menuOpen = menu.open && menu.at === pathname;
  const has2009Pack = packs.some((pack) => pack.year === 2009);
  const inMore = pathname === '/more' || moreLinks.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  const sessionRoute = SESSION_ROUTE.test(pathname);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu({ open: false, at: pathname });
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenu({ open: false, at: pathname });
      menuButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen, pathname]);

  useEffect(() => {
    if (sessionRoute) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
      if (isEditable(event.target) || document.querySelector('dialog[open], [aria-modal="true"]')) return;
      const key = event.key.toUpperCase();
      if (key === 'M') {
        event.preventDefault();
        setMenu((current) => ({ open: !(current.open && current.at === pathname), at: pathname }));
        menuButtonRef.current?.focus();
        return;
      }
      const link = primaryLinks.find(({ hotkey }) => hotkey === key);
      if (!link) return;
      event.preventDefault();
      void navigate(link.to);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, pathname, sessionRoute]);

  const status = loading ? { tone: 'wait', text: '载入中' }
    : error ? { tone: 'fault', text: '内容异常' }
      : packs.length ? { tone: 'ready', text: `题包 ${packs.length} 套` }
        : { tone: 'empty', text: '未安装题包' };

  return (
    <div className="app-shell shell-v2">
      <header className="topbar">
        <NavLink to="/" end className="brand-block" aria-label={`${PRODUCT_NAME} 首页`}>
          <span className="brand-mark" aria-hidden="true"><img src="/favicon.svg" alt="" /></span>
          <strong>{PRODUCT_NAME}</strong>
        </NavLink>
        <nav className="topnav" aria-label="主导航">
          {primaryLinks.map(({ to, label, icon: Icon, hotkey }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `keycap${isActive || (to === '/review' && pathname === '/wrong') ? ' active' : ''}`}
              {...(sessionRoute ? {} : { 'aria-keyshortcuts': hotkey })}>
              <Icon size={16} aria-hidden="true" /><span>{label}</span>{!sessionRoute && <kbd aria-hidden="true">{hotkey}</kbd>}
            </NavLink>
          ))}
          <div className="topnav-more" ref={menuRef}>
            <button type="button" ref={menuButtonRef} className={`keycap${inMore ? ' active' : ''}`} aria-expanded={menuOpen} aria-controls="topnav-more-menu"
              {...(sessionRoute ? {} : { 'aria-keyshortcuts': 'M' })} onClick={() => setMenu({ open: !menuOpen, at: pathname })}>
              <MoreHorizontal size={16} aria-hidden="true" /><span>更多</span>{!sessionRoute && <kbd aria-hidden="true">M</kbd>}
            </button>
            <div id="topnav-more-menu" className="topnav-menu" hidden={!menuOpen}>
              {moreLinks.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMenu({ open: false, at: pathname })}>
                  <Icon size={16} aria-hidden="true" /><span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
        <div className="topbar-tools">
          <SyncChip />
          <span className={`status-chip tone-${status.tone}`}><i aria-hidden="true" />{status.text}</span>
          {!loading && !error && <ReadingPreferences />}
          <ThemeToggle />
        </div>
      </header>
      <main className="main-area">
        {error ? (
          <section className="fatal-state">
            <TriangleAlert size={28} />
            <h1>内容初始化失败</h1>
            <p>{error}</p>
          </section>
        ) : loading ? (
          <section className="loading-state"><span className="loader" /><p>载入学习数据</p></section>
        ) : (
          <>
            {!has2009Pack && contentReady !== false && (
              <section className="content-unavailable-banner" role="status" aria-live="polite">
                <TriangleAlert size={20} aria-hidden="true" />
                <div><strong>本地 2009 题包未安装</strong><span>{packs.length ? '可继续使用其他年份题库；2009 模考与人工复核入口暂不可用。' : '实验与本地资料仍可使用；安装题包后可开始练习。'}</span></div>
                <NavLink className="secondary-command compact-command" to="/lab"><Cpu size={16} aria-hidden="true" />打开实验</NavLink>
              </section>
            )}
            <Outlet />
          </>
        )}
      </main>
      <nav className="mobile-nav" aria-label="移动端导航">
        {mobileLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} aria-label={label} title={label}>
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
