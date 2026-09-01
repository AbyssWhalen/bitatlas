import { Cpu, MemoryStick, Network, Workflow } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const labSections = [
  { to: '/lab', label: '计算机组成', description: '数制与指令', icon: Cpu, end: true },
  { to: '/lab/data-structures', label: '数据结构', description: '图、树与线性表', icon: Workflow, end: false },
  { to: '/lab/os-memory', label: '操作系统', description: '内存、磁盘与同步', icon: MemoryStick, end: false },
  { to: '/lab/network', label: '计算机网络', description: '协议与路由', icon: Network, end: false },
];

export function LabSectionNav() {
  return (
    <nav className="lab-section-nav" aria-label="实验室科目">
      {labSections.map(({ to, label, description, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}>
          <Icon size={18} aria-hidden="true" />
          <span><strong>{label}</strong><small>{description}</small></span>
        </NavLink>
      ))}
    </nav>
  );
}
