import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebase } from '../lib/firebase';
import { authErrorMessage } from '../lib/roomService';
import { unregisterPush } from '../lib/push';
import type { Profile } from '../types';

export type AuthPhase = 'loading' | 'out' | 'in';

export interface Credentials {
  name?: string;
  email: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Email + password authentication (Firebase Auth). No popup, no redirect — safe inside Android WebView / APK builds.
 * The session persists in localStorage (see getFirebase → browserLocalPersistence), so users sign in once.
 */
export function useAuth() {
  const fb = getFirebase()!;
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [, setVersion] = useState(0); // bumped after user.reload() so emailVerified re-renders
  // the name typed on the sign-up form, used when the users/{uid} profile document is created
  const pendingName = useRef('');

  // Session persistence: onAuthStateChanged restores the user on every launch
  useEffect(() => {
    return onAuthStateChanged(
      fb.auth,
      (u) => {
        setUser(u);
        setPhase(u ? 'in' : 'out');
        if (!u) setProfile(undefined);
      },
      (e) => {
        setError(authErrorMessage(e));
        setPhase('out');
      },
    );
  }, [fb]);

  // users/{uid}: load the existing profile or register a brand-new user
  useEffect(() => {
    if (!user) return;
    const ref = doc(fb.db, 'users', user.uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const p = snap.data() as Profile;
          pendingName.current = '';
          setProfile(p);
          setError('');
          if (!snap.metadata.fromCache && p.email !== (user.email ?? '')) {
            updateDoc(ref, { email: user.email ?? '' }).catch(() => undefined);
          }
        } else if (!snap.metadata.fromCache) {
          const fresh: Profile = {
            uid: user.uid,
            displayName: pendingName.current || user.displayName || (user.email ?? 'Roomie').split('@')[0],
            email: user.email ?? '',
            photoURL: user.photoURL ?? '',
            upiId: '',
            phone: '',
            currentRoomCode: '',
            createdAt: Date.now(),
            onboarded: false,
          };
          setDoc(ref, fresh).catch((e) => setError(authErrorMessage(e)));
        }
      },
      (e) => setError(authErrorMessage(e)),
    );
  }, [fb, user]);

  /** Create a new account: Name + Email + Password */
  const signUp = useCallback(
    async ({ name = '', email, password }: Credentials): Promise<boolean> => {
      setError('');
      const n = name.trim().replace(/\s+/g, ' ');
      const e = email.trim();
      if (n.length < 2) return setError('Please enter your name.'), false;
      if (!EMAIL_RE.test(e)) return setError(authErrorMessage({ code: 'auth/invalid-email' })), false;
      if (password.length < 6) return setError(authErrorMessage({ code: 'auth/weak-password' })), false;
      setBusy(true);
      pendingName.current = n;
      try {
        const cred = await createUserWithEmailAndPassword(fb.auth, e, password);
        await fbUpdateProfile(cred.user, { displayName: n }).catch(() => undefined);
        // verification link is only needed to unlock the Admin Panel — never blocks normal use
        sendEmailVerification(cred.user).catch(() => undefined);
        return true;
      } catch (err) {
        pendingName.current = '';
        setError(authErrorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fb],
  );

  /** Sign in with an existing Email + Password */
  const signIn = useCallback(
    async ({ email, password }: Credentials): Promise<boolean> => {
      setError('');
      const e = email.trim();
      if (!EMAIL_RE.test(e)) return setError(authErrorMessage({ code: 'auth/invalid-email' })), false;
      if (!password) return setError(authErrorMessage({ code: 'auth/missing-password' })), false;
      setBusy(true);
      try {
        await signInWithEmailAndPassword(fb.auth, e, password);
        return true;
      } catch (err) {
        setError(authErrorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fb],
  );

  /** Emails a reset link (this also proves ownership of the address) */
  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      setError('');
      const e = email.trim();
      if (!EMAIL_RE.test(e)) return setError('Enter your email above first, then tap “Forgot password”.'), false;
      setBusy(true);
      try {
        await sendPasswordResetEmail(fb.auth, e);
        return true;
      } catch (err) {
        setError(authErrorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fb],
  );

  const sendVerification = useCallback(async () => {
    const u = fb.auth.currentUser;
    if (u) await sendEmailVerification(u);
  }, [fb]);

  /** Re-reads the account (after the user tapped the verification link) and refreshes the ID-token claims */
  const refreshUser = useCallback(async () => {
    const u = fb.auth.currentUser;
    if (!u) return;
    await u.reload();
    await u.getIdToken(true); // Firestore rules read email_verified from this token
    setVersion((v) => v + 1);
  }, [fb]);

  const signOut = useCallback(async () => {
    if (user) await unregisterPush(user.uid); // stop pushing this account's alerts to this device
    await fbSignOut(fb.auth);
  }, [fb, user]);

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      if (!user) return Promise.resolve();
      return setDoc(doc(fb.db, 'users', user.uid), patch, { merge: true });
    },
    [fb, user],
  );

  return {
    user,
    phase,
    profile,
    error,
    busy,
    signIn,
    signUp,
    resetPassword,
    sendVerification,
    refreshUser,
    signOut,
    updateProfile,
    clearError: () => setError(''),
  };
}

export type AuthApi = ReturnType<typeof useAuth>;
