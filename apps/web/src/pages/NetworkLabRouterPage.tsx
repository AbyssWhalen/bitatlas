import { useSearchParams } from 'react-router-dom';
import { GbnLabPage } from './GbnLabPage';
import { NetworkLabPage } from './NetworkLabPage';
import { TcpCongestionLabPage } from './TcpCongestionLabPage';
import { TcpCumulativeAckLabPage } from './TcpCumulativeAckLabPage';
import { CsmaCdCollisionLabPage } from './CsmaCdCollisionLabPage';
import { QamNyquistLabPage } from './QamNyquistLabPage';
import { SwitchForwardingLabPage } from './SwitchForwardingLabPage';
import { FtpControlConnectionLabPage } from './FtpControlConnectionLabPage';

export function NetworkLabRouterPage() {
  const [searchParams] = useSearchParams();
  const module = searchParams.get('module');
  const preset = searchParams.get('preset');
  if (module === 'cidr') return <NetworkLabPage />;
  if (module === 'gbn') return <GbnLabPage />;
  if (module === 'tcp-congestion') return <TcpCongestionLabPage />;
  if (module === 'tcp-ack') return <TcpCumulativeAckLabPage />;
  if (module === 'csma-cd') return <CsmaCdCollisionLabPage />;
  if (module === 'qam-nyquist') return <QamNyquistLabPage />;
  if (module === 'switch-forwarding') return <SwitchForwardingLabPage />;
  if (module === 'ftp-control') return <FtpControlConnectionLabPage />;
  if (preset === 'cn408-2009-q35') return <GbnLabPage />;
  if (preset === 'cn408-2009-q39') return <TcpCongestionLabPage />;
  if (preset === 'cn408-2009-q38') return <TcpCumulativeAckLabPage />;
  if (preset === 'cn408-2009-q37') return <CsmaCdCollisionLabPage />;
  if (preset === 'cn408-2009-q34') return <QamNyquistLabPage />;
  if (preset === 'cn408-2009-q36') return <SwitchForwardingLabPage />;
  if (preset === 'cn408-2009-q40') return <FtpControlConnectionLabPage />;
  return <NetworkLabPage />;
}
