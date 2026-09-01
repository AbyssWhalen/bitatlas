import { useSearchParams } from 'react-router-dom';
import { DiskSchedulingLabPage } from './DiskSchedulingLabPage';
import { FilesystemLinksLabPage } from './FilesystemLinksLabPage';
import { SemaphoreLabPage } from './SemaphoreLabPage';
import { SingleResourceDeadlockLabPage } from './SingleResourceDeadlockLabPage';
import { VirtualMemoryLabPage } from './VirtualMemoryLabPage';
import { SegmentationAddressLabPage } from './SegmentationAddressLabPage';
import { HrrnSchedulingLabPage } from './HrrnSchedulingLabPage';

export function OsLabRouterPage() {
  const [searchParams] = useSearchParams();
  const module = searchParams.get('module');
  const preset = searchParams.get('preset');
  if (module === 'semaphore') return <SemaphoreLabPage />;
  if (module === 'disk') return <DiskSchedulingLabPage />;
  if (module === 'memory') return <VirtualMemoryLabPage />;
  if (module === 'deadlock') return <SingleResourceDeadlockLabPage />;
  if (module === 'filesystem-links') return <FilesystemLinksLabPage />;
  if (module === 'segmentation-address') return <SegmentationAddressLabPage />;
  if (module === 'hrrn') return <HrrnSchedulingLabPage />;
  if (preset === 'cn408-2009-q45') return <SemaphoreLabPage />;
  if (preset === 'cn408-2009-q29') return <DiskSchedulingLabPage />;
  if (preset === 'cn408-2009-q25') return <SingleResourceDeadlockLabPage />;
  if (preset === 'cn408-2009-q31') return <FilesystemLinksLabPage />;
  if (preset === 'cn408-2009-q27') return <SegmentationAddressLabPage />;
  if (preset === 'cn408-2009-q24') return <HrrnSchedulingLabPage />;
  return <VirtualMemoryLabPage />;
}
