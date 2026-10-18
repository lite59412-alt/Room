import { useCallback, useEffect, useState } from 'react';
import {
  askPermission,
  permissionState,
  registerPushToken,
  showLocalNotification,
  type PermissionState,
  type RemoteState,
} from '../lib/push';

/** Notification permission + service-worker + FCM token lifecycle for the signed-in Google account. */
export function usePush(uid: string) {
  const [state, setState] = useState<PermissionState>(permissionState);
  const [remote, setRemote] = useState<RemoteState>('unknown');
  const [busy, setBusy] = useState(false);

  const sync = useCallback(async () => {
    setRemote(await registerPushToken(uid));
  }, [uid]);

  // already allowed on a previous visit → make sure SW + token are fresh
  useEffect(() => {
    if (state === 'granted') void sync();
  }, [state, sync]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const p = await askPermission();
      setState(p);
      return p;
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(
    () => showLocalNotification('RoomieKhata', 'Notifications are working. You’ll be alerted about new kharcha and settlements.', 'settlements'),
    [],
  );

  return { state, remote, busy, enable, test };
}

export type PushApi = ReturnType<typeof usePush>;
