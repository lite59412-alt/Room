import { doc, getDoc, runTransaction, writeBatch, type DocumentData, type Firestore } from 'firebase/firestore';
import type { ExpenseEntry, Member, Profile, Room, SettlementRecord } from '../types';

export const MAX_MEMBERS = 10;

/** Firestore shape of a roommate inside rooms/{code}.members */
export interface StoredMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  upiId?: string;
  photoURL?: string;
}

export function normalizeCode(input: string): string {
  const t = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return /^\d{3,}$/.test(t) ? `ROOM-${t}` : t;
}

/** '' when the code is acceptable, otherwise a human-readable reason */
export function validateRoomCode(raw: string): string {
  const c = normalizeCode(raw);
  if (c.length < 4) return 'Room code must be at least 4 characters.';
  if (c.length > 24) return 'Room code can be at most 24 characters.';
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(c)) return 'Use only letters, numbers and single dashes (e.g. ROOM-7819).';
  return '';
}

/** Short, friendly code like ROOM-7819 that is not in `taken` */
export function generateShortCode(taken: Set<string>): string {
  for (let i = 0; i < 80; i++) {
    const c = `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!taken.has(c)) return c;
  }
  return `ROOM-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function generateCode(): string {
  return `ROOM-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function toStored(p: Profile): StoredMember {
  return {
    id: p.uid,
    name: p.displayName || p.email.split('@')[0],
    email: p.email,
    phone: p.phone,
    upiId: p.upiId,
    photoURL: p.photoURL,
  };
}

export function fromStored(m: StoredMember): Member {
  return { id: m.id, name: m.name, email: m.email, phone: m.phone, upiId: m.upiId, avatar: m.photoURL ?? '' };
}

/* ----------------------------- mappers ----------------------------- */
export function mapRoom(code: string, d: DocumentData): Room {
  return {
    id: code,
    roomCode: (d.roomCode as string) ?? code,
    name: (d.roomName as string) ?? code,
    members: ((d.members as StoredMember[]) ?? []).map(fromStored),
    createdBy: d.createdBy as string | undefined,
    createdAt: d.createdAt as number | undefined,
    cycleStart: (d.cycleStart as number | undefined) ?? 0,
  };
}

export function mapExpense(id: string, d: DocumentData): ExpenseEntry {
  return {
    id,
    title: d.title ?? '',
    amount: Number(d.amount) || 0,
    paidById: d.paidById ?? '',
    splitBetween: d.splitBetween ?? [],
    category: d.category ?? 'other',
    date: d.date ?? '',
    time: d.time ?? '00:00',
    note: d.note || undefined,
    addedBy: d.addedBy || undefined,
    createdAt: d.createdAt ?? 0,
  };
}

export function mapSettlement(id: string, d: DocumentData): SettlementRecord {
  return {
    id,
    fromMemberId: d.fromId ?? '',
    toMemberId: d.toId ?? '',
    amount: Number(d.amount) || 0,
    date: d.date ?? '',
    time: d.time,
    paymentMethod: d.paymentMethod === 'Cash' ? 'Cash' : 'UPI',
    status: d.status === 'pending_receiver_approval' || d.status === 'pending' ? 'pending_receiver_approval' : d.status === 'rejected' ? 'rejected' : 'settled',
    createdAt: d.settledAt ?? 0,
  };
}

/* ----------------------------- mutations ----------------------------- */
export async function createRoom(db: Firestore, profile: Profile, name: string): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = generateCode();
    const ref = doc(db, 'rooms', code);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    const batch = writeBatch(db);
    batch.set(ref, {
      roomCode: code,
      roomName: name.trim() || 'My Room',
      createdBy: profile.uid,
      memberIds: [profile.uid],
      members: [toStored(profile)],
      createdAt: Date.now(),
      presence: { [profile.uid]: Date.now() },
    });
    batch.set(doc(db, 'users', profile.uid), { currentRoomCode: code, onboarded: true }, { merge: true });
    await batch.commit();
    return code;
  }
  throw new Error('CODE_COLLISION');
}

export async function joinRoom(db: Firestore, profile: Profile, rawCode: string): Promise<string> {
  const code = normalizeCode(rawCode);
  if (code.length < 4) throw new Error('ROOM_NOT_FOUND');
  const ref = doc(db, 'rooms', code);
  const userRef = doc(db, 'users', profile.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('ROOM_NOT_FOUND');
    const d = snap.data();
    const ids: string[] = d.memberIds ?? [];
    if (!ids.includes(profile.uid)) {
      if (ids.length >= MAX_MEMBERS) throw new Error('ROOM_FULL');
      tx.update(ref, {
        memberIds: [...ids, profile.uid],
        members: [...((d.members as StoredMember[]) ?? []), toStored(profile)],
      });
    }
    tx.set(userRef, { currentRoomCode: code, onboarded: true }, { merge: true });
  });
  return code;
}

export async function leaveRoom(db: Firestore, uid: string, code: string): Promise<void> {
  const ref = doc(db, 'rooms', code);
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const d = snap.data();
      tx.update(ref, {
        memberIds: ((d.memberIds as string[]) ?? []).filter((x) => x !== uid),
        members: ((d.members as StoredMember[]) ?? []).filter((m) => m.id !== uid),
      });
    }
    tx.set(userRef, { currentRoomCode: '' }, { merge: true });
  });
}

export async function patchMember(db: Firestore, code: string, memberId: string, patch: Partial<StoredMember>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<StoredMember>;
  const ref = doc(db, 'rooms', code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const members = ((snap.data().members as StoredMember[]) ?? []).map((m) => (m.id === memberId ? { ...m, ...clean } : m));
    tx.update(ref, { members });
  });
}

/* ----------------------------- errors ----------------------------- */
export function authErrorMessage(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const c = err?.code ?? err?.message ?? '';
  if (c.includes('unauthorized-domain'))
    return 'This domain is not authorised for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.';
  if (c.includes('operation-not-allowed')) return 'Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.';
  if (c.includes('network-request-failed') || c.includes('unavailable')) return 'Network problem. Check your internet connection and try again.';
  if (c.includes('popup-blocked')) return 'Your browser blocked the sign-in popup. Allow popups and try again.';
  if (c.includes('invalid-api-key') || c.includes('api-key-not-valid')) return 'The Firebase API key is invalid. Re-check your Firebase config.';
  if (c.includes('permission-denied') || c.includes('Missing or insufficient permissions'))
    return 'Firestore denied access. Publish the security rules from firestore.rules in your Firebase Console.';
  if (c === 'ROOM_NOT_FOUND') return 'No room found with that code. Check the code and try again.';
  if (c === 'ROOM_FULL') return `That room is full (max ${MAX_MEMBERS} roommates).`;
  if (c === 'CODE_COLLISION') return 'Could not generate a unique room code. Please try again.';
  return err?.message || 'Something went wrong. Please try again.';
}
