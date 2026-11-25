import { useEffect, useState } from 'react';
import type { AssetRef } from '@408os/domain';
import { SERVER_MODE } from './server-mode';

export function useAssetUrl(asset: AssetRef | undefined, retry = 0): { key: string; url?: string; failed?: boolean } {
  const key = asset ? `${asset.path}:${asset.sha256}` : '';
  const [state, setState] = useState<{ key: string; url?: string; failed?: boolean }>({ key: '' });
  useEffect(() => {
    if (!SERVER_MODE || !asset) return;
    let active = true;
    let url: string | undefined;
    void import('./account-cache').then(({ accountCache }) => accountCache.asset(asset.path, asset.sha256))
      .then((blob) => { if (active) { url = URL.createObjectURL(blob); setState({ key, url }); } })
      .catch(() => { if (active) setState({ key, failed: true }); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [asset, key, retry]);
  return SERVER_MODE ? state.key === key ? state : { key } : { key, ...(asset ? { url: asset.path } : {}) };
}
