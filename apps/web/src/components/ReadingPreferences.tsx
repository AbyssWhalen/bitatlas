import { useEffect, useState } from 'react';
import { storage } from '../app/storage';
import { useAction } from '../app/useAction';

const SIZES = [16, 18, 20, 22, 24];

export function ReadingPreferences() {
  const [size, setSize] = useState(18);
  const action = useAction();
  useEffect(() => {
    void storage.reviewRepository.getSetting('reading.fontSize').then((setting) => {
      if (typeof setting?.value === 'number' && SIZES.includes(setting.value)) setSize(setting.value);
    }).catch(() => undefined);
  }, []);
  useEffect(() => { document.documentElement.style.setProperty('--reading-font-size', `${size}px`); }, [size]);
  return <div className="reading-size">
    <label title="正文字号"><span aria-hidden="true">Aa</span><select aria-label="正文字号" value={size} disabled={action.busy} onChange={(event) => {
      const next = Number(event.target.value);
      void action.run(async () => { await storage.reviewRepository.saveSetting('reading.fontSize', next); setSize(next); });
    }}>{SIZES.map((value) => <option key={value} value={value}>{value}px</option>)}</select></label>
    {action.error && <span role="alert">{action.error}</span>}
  </div>;
}
