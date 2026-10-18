import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebase } from '../lib/firebase';
import type { AppConfig } from '../types';

/** Live subscription to config/app (announcement banner + maintenance mode) */
export function useAppConfig(enabled: boolean): AppConfig {
  const [config, setConfig] = useState<AppConfig>({});
  useEffect(() => {
    const fb = getFirebase();
    if (!enabled || !fb) return;
    return onSnapshot(
      doc(fb.db, 'config', 'app'),
      (snap) => setConfig(snap.exists() ? (snap.data() as AppConfig) : {}),
      () => undefined,
    );
  }, [enabled]);
  return config;
}
