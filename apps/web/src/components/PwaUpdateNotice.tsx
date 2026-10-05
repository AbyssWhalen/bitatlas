import { useEffect, useState } from 'react';
import { registerPwaUpdates } from '../app/pwa';

export function PwaUpdateNotice() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (import.meta.env.PROD) return registerPwaUpdates(() => setReady(true));
  }, []);

  if (!ready || dismissed) return null;
  return (
    <aside className="pwa-update-notice" role="status" aria-live="polite">
      <div>
        <strong>新版本已准备好</strong>
        <p>完成当前操作并确认保存后，关闭所有 BitAtlas 页面，再重新打开即可更新。</p>
      </div>
      <button className="secondary-command compact-command" onClick={() => setDismissed(true)}>稍后再说</button>
    </aside>
  );
}
