import { useCallback, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebase } from '../lib/firebase';
import { authErrorMessage } from '../lib/roomService';
import { unregisterPush } from '../lib/push';
import type { Profile } from '../types';

export type AuthPhase = 'loading' | 'out' | 'in';

export function useAuth() {
  const fb = getFirebase()!;
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Session persistence: onAuthStateChanged restores the user on refresh
  useEffect(() => {
    getRedirectResult(fb.auth).catch((e) => setError(authErrorMessage(e)));
    return onAuthStateChanged(fb.auth, (u) => {
      setUser(u);
      setPhase(u ? 'in' : 'out');
      if (!u) setProfile(undefined);
    });
  }, [fb]);

  // users/{uid}: load existing profile or register a brand-new user
  useEffect(() => {
    if (!user) return;
    const ref = doc(fb.db, 'users', user.uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const p = snap.data() as Profile;
          setProfile(p);
          setError('');
          if (!snap.metadata.fromCache && (p.photoURL !== (user.photoURL ?? '') || p.email !== (user.email ?? ''))) {
            updateDoc(ref, { photoURL: user.photoURL ?? '', email: user.email ?? '' }).catch(() => undefined);
          }
        } else if (!snap.metadata.fromCache) {
          const fresh: Profile = {
            uid: user.uid,
            displayName: user.displayName || (user.email ?? 'Roomie').split('@')[0],
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

  const signIn = useCallback(async () => {
    setError('');
    setBusy(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(fb.auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(fb.auth, provider);
          return;
        } catch (e2) {
          setError(authErrorMessage(e2));
        }
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(authErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
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

  return { user, phase, profile, error, busy, signIn, signOut, updateProfile, clearError: () => setError('') };
}

export type AuthApi = ReturnType<typeof useAuth>;
