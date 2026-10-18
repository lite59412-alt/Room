import { arrayRemove, arrayUnion, doc, setDoc } from 'firebase/firestore';
import { getFirebase, getVapidKey } from './firebase';

const BASE = import.meta.env.BASE_URL || '/';
export const SW_URL = `${BASE}sw.js`;
export const ICON_URL = `${BASE}images/icon.png`;
const TOKEN_KEY = 'rk.fcmToken';

export type PermissionState = 'unsupported' | 'default' | 'denied' | 'granted';
/** active = FCM token saved (works when the app is closed) · local = this-device only · no-vapid = push server not configured */
export type RemoteState = 'unknown' | 'active' | 'local' | 'no-vapid' | 'no-sw' | 'error';

export function permissionState(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as PermissionState;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return null;
  try {
    await navigator.serviceWorker.register(SW_URL);
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** Ask for notification permission (must be called from a user gesture on iOS / strict browsers). */
export async function askPermission(): Promise<PermissionState> {
  if (permissionState() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as PermissionState;
  } catch {
    return permissionState();
  }
}

/** Registers the SW, gets this device's FCM token and stores it on users/{uid}.fcmTokens */
export async function registerPushToken(uid: string): Promise<RemoteState> {
  const reg = await registerServiceWorker();
  if (!reg) return 'no-sw';
  const vapidKey = getVapidKey();
  if (!vapidKey) return 'no-vapid';
  const fb = getFirebase();
  if (!fb) return 'local';
  try {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return 'local';
    const token = await getToken(getMessaging(fb.app), { vapidKey, serviceWorkerRegistration: reg });
    if (!token) return 'error';
    await setDoc(doc(fb.db, 'users', uid), { fcmTokens: arrayUnion(token), pushUpdatedAt: Date.now() }, { merge: true });
    localStorage.setItem(TOKEN_KEY, token);
    return 'active';
  } catch {
    return 'error';
  }
}

/** On sign-out: stop pushing to this device for that account */
export async function unregisterPush(uid: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  const fb = getFirebase();
  if (!token || !fb) return;
  try {
    await setDoc(doc(fb.db, 'users', uid), { fcmTokens: arrayRemove(token) }, { merge: true });
    const { getMessaging, deleteToken, isSupported } = await import('firebase/messaging');
    if (await isSupported()) await deleteToken(getMessaging(fb.app));
  } catch {
    /* best effort */
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/** Shows a notification through the service worker (same code path as a real push) */
export async function showLocalNotification(title: string, body: string, tab = 'settlements'): Promise<boolean> {
  if (permissionState() !== 'granted') return false;
  const opts: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    icon: ICON_URL,
    badge: ICON_URL,
    tag: 'rk-test',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: `${BASE}?tab=${tab}` },
  };
  try {
    const reg = (await navigator.serviceWorker?.getRegistration()) ?? (await registerServiceWorker());
    if (reg) {
      await reg.showNotification(title, opts);
      return true;
    }
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}
