import { Activity, Cable, Gauge, GitFork, Network, RadioTower, Server, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';

export type NetworkLabModule = 'cidr' | 'gbn' | 'tcp-congestion' | 'tcp-ack' | 'csma-cd' | 'qam-nyquist' | 'switch-forwarding' | 'ftp-control';

export function NetworkModuleTabs({ active }: { active: NetworkLabModule }) {
  return (
    <nav className="lab-tabs network-module-tabs" aria-label="计算机网络实验模块">
      <Link
        to="/lab/network?module=cidr&preset=cn408-2009-q47"
        className={active === 'cidr' ? 'active' : ''}
        aria-current={active === 'cidr' ? 'page' : undefined}
      >
        <Network size={17} aria-hidden="true" />CIDR / LPM
      </Link>
      <Link
        to="/lab/network?module=gbn&preset=cn408-2009-q35"
        className={active === 'gbn' ? 'active' : ''}
        aria-current={active === 'gbn' ? 'page' : undefined}
      >
        <RadioTower size={17} aria-hidden="true" />Go-Back-N
      </Link>
      <Link
        to="/lab/network?module=tcp-congestion&preset=cn408-2009-q39"
        className={active === 'tcp-congestion' ? 'active' : ''}
        aria-current={active === 'tcp-congestion' ? 'page' : undefined}
      >
        <Gauge size={17} aria-hidden="true" />TCP 拥塞
      </Link>
      <Link
        to="/lab/network?module=tcp-ack&preset=cn408-2009-q38"
        className={active === 'tcp-ack' ? 'active' : ''}
        aria-current={active === 'tcp-ack' ? 'page' : undefined}
      >
        <Waypoints size={17} aria-hidden="true" />TCP ACK
      </Link>
      <Link
        to="/lab/network?module=csma-cd&preset=cn408-2009-q37"
        className={active === 'csma-cd' ? 'active' : ''}
        aria-current={active === 'csma-cd' ? 'page' : undefined}
      >
        <Cable size={17} aria-hidden="true" />CSMA/CD
      </Link>
      <Link
        to="/lab/network?module=qam-nyquist&preset=cn408-2009-q34"
        className={active === 'qam-nyquist' ? 'active' : ''}
        aria-current={active === 'qam-nyquist' ? 'page' : undefined}
      >
        <Activity size={17} aria-hidden="true" />QAM / 奈氏
      </Link>
      <Link
        to="/lab/network?module=switch-forwarding&preset=cn408-2009-q36"
        className={active === 'switch-forwarding' ? 'active' : ''}
        aria-current={active === 'switch-forwarding' ? 'page' : undefined}
      >
        <GitFork size={17} aria-hidden="true" />交换机转发
      </Link>
      <Link
        to="/lab/network?module=ftp-control&preset=cn408-2009-q40"
        className={active === 'ftp-control' ? 'active' : ''}
        aria-current={active === 'ftp-control' ? 'page' : undefined}
      >
        <Server size={17} aria-hidden="true" />FTP 连接
      </Link>
    </nav>
  );
}
