import { Binary, Clock3, Disc3, FileSymlink, MemoryStick, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export type OsLabModule = 'memory' | 'disk' | 'semaphore' | 'deadlock' | 'filesystem-links' | 'segmentation-address' | 'hrrn';

export function OsModuleTabs({ active }: { active: OsLabModule }) {
  return (
    <nav className="lab-tabs os-module-tabs" aria-label="操作系统实验模块">
      <Link
        to="/lab/os-memory?module=memory&preset=cn408-2009-q46"
        className={active === 'memory' ? 'active' : ''}
        aria-current={active === 'memory' ? 'page' : undefined}
      >
        <MemoryStick size={17} aria-hidden="true" />虚拟内存
      </Link>
      <Link
        to="/lab/os-memory?module=disk&preset=cn408-2009-q29"
        className={active === 'disk' ? 'active' : ''}
        aria-current={active === 'disk' ? 'page' : undefined}
      >
        <Disc3 size={17} aria-hidden="true" />磁盘调度
      </Link>
      <Link
        to="/lab/os-memory?module=semaphore&preset=cn408-2009-q45"
        className={active === 'semaphore' ? 'active' : ''}
        aria-current={active === 'semaphore' ? 'page' : undefined}
      >
        <RefreshCw size={17} aria-hidden="true" />信号量同步
      </Link>
      <Link
        to="/lab/os-memory?module=deadlock&preset=cn408-2009-q25"
        className={active === 'deadlock' ? 'active' : ''}
        aria-current={active === 'deadlock' ? 'page' : undefined}
      >
        <ShieldAlert size={17} aria-hidden="true" />死锁阈值
      </Link>
      <Link
        to="/lab/os-memory?module=filesystem-links&preset=cn408-2009-q31"
        className={active === 'filesystem-links' ? 'active' : ''}
        aria-current={active === 'filesystem-links' ? 'page' : undefined}
      >
        <FileSymlink size={17} aria-hidden="true" />文件链接
      </Link>
      <Link
        to="/lab/os-memory?module=segmentation-address&preset=cn408-2009-q27"
        className={active === 'segmentation-address' ? 'active' : ''}
        aria-current={active === 'segmentation-address' ? 'page' : undefined}
      >
        <Binary size={17} aria-hidden="true" />分段地址
      </Link>
      <Link
        to="/lab/os-memory?module=hrrn&preset=cn408-2009-q24"
        className={active === 'hrrn' ? 'active' : ''}
        aria-current={active === 'hrrn' ? 'page' : undefined}
      >
        <Clock3 size={17} aria-hidden="true" />高响应比
      </Link>
    </nav>
  );
}
