import { useCallback, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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

export function useAuth() {
  const fb = getFirebase()!;
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Restore session
  useEffect(() => {
    return onAuthStateChanged(fb.auth, (u) => {
      setUser(u);
      setPhase(u ? 'in' : 'out');
      if (!u) setProfile(undefined);
    });
  }, [fb]);

  // Sync profile document
  useEffect(() => {
    if (!user) return;
    const ref = doc(fb.db, 'users', user.uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as Profile);
          setError('');
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

  const signUp = useCallback(
    async (name: string, em: string, pass: string) => {
      setError('');
      setBusy(true);
      try {
        const cred = await createUserWithEmailAndPassword(fb.auth, em.trim(), pass);
        await fbUpdateProfile(cred.user, { displayName: name.trim() });
        const fresh: Profile = {
          uid: cred.user.uid,
          displayName: name.trim(),
          email: em.trim(),
          photoURL: '',
          upiId: '',
          phone: '',
          currentRoomCode: '',
          createdAt: Date.now(),
          onboarded: false,
        };
        await setDoc(doc(fb.db, 'users', cred.user.uid), fresh);
      } catch (e: any) {
        setError(authErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [fb],
  );

  const signIn = useCallback(
    async (em: string, pass: string) => {
      setError('');
      setBusy(true);
      try {
        await signInWithEmailAndPassword(fb.auth, em.trim(), pass);
      } catch (e: any) {
        setError(authErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [fb],
  );

  const signOut = useCallback(async () => {
    if (user) await unregisterPush(user.uid);
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
    signOut,
    updateProfile,
    clearError: () => setError(''),
  };
}

export type AuthApi = ReturnType<typeof useAuth>;
