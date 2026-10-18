import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

/* ------------------------------------------------------------------ */
/*  Admin guard — configurable via VITE_ADMIN_EMAIL                    */
/* ------------------------------------------------------------------ */
export const ADMIN_EMAIL: string =
  ((import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? '').trim() || 'lite59412@gmail.com';

/** True only when the signed-in Google account's (verified) email matches ADMIN_EMAIL exactly. */
export function isAdminEmail(email?: string | null, verified?: boolean): boolean {
  if (!email || verified === false) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Firebase web config: .env (VITE_FIREBASE_*) or pasted at runtime    */
/* ------------------------------------------------------------------ */
export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  /** Web Push certificate key (Firebase Console → Cloud Messaging) — enables background push */
  vapidKey?: string;
}

const CFG_KEY = 'rk.firebase';

function envConfig(): FirebaseConfig | null {
  return {
    apiKey: "AIzaSyCXMm1tzeK_VfuyRhsefJtD8WHBJvUQSjU",
    authDomain: "roomkhata-3e223.firebaseapp.com",
    projectId: "roomkhata-3e223",
    storageBucket: "roomkhata-3e223.firebasestorage.app",
    messagingSenderId: "326426644235",
    appId: "1:326426644235:web:11db6d05c84de75c58dc0e",
  };
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const fromEnv = envConfig();
  if (fromEnv) return fromEnv;
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? (JSON.parse(raw) as FirebaseConfig) : null;
  } catch {
    return null;
  }
}

export function getVapidKey(): string {
  const env = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();
  return env || getFirebaseConfig()?.vapidKey?.trim() || '';
}

export function configFromEnv(): boolean {
  return !!envConfig();
}

export function saveFirebaseConfig(cfg: FirebaseConfig | null) {
  if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CFG_KEY);
}

/** Accepts raw JSON or the JS snippet pasted from the Firebase console */
export function parseFirebaseConfig(text: string): FirebaseConfig | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const json = m[0]
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}');
    const cfg = JSON.parse(json) as FirebaseConfig;
    return cfg.apiKey && cfg.projectId ? cfg : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                          */
/* ------------------------------------------------------------------ */
export interface Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let inst: Firebase | null = null;

export function getFirebase(): Firebase | null {
  if (inst) return inst;
  const cfg = getFirebaseConfig();
  if (!cfg) return null;
  const { vapidKey: _vapid, ...appCfg } = cfg;
  void _vapid;
  const app = getApps().length ? getApp() : initializeApp({ ...appCfg, authDomain: cfg.authDomain || `${cfg.projectId}.firebaseapp.com` });
  const auth = getAuth(app);
  let db: Firestore;
  try {
    // Offline cache → app opens instantly and keeps working without network
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch {
    db = getFirestore(app);
  }
  inst = { app, auth, db };
  return inst;
}
