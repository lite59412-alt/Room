import { collection, doc, getDoc, getDocs, writeBatch, type DocumentData, type DocumentReference, type Firestore, type WriteBatch } from 'firebase/firestore';
import type { Profile, Room } from '../types';
import { normalizeCode, toStored, validateRoomCode, type StoredMember } from './roomService';

/**
 * Super-Admin room management against Firestore.
 * Every function here only succeeds for the admin account — enforced by firestore.rules, not by this file.
 */

export const NOTICE_ROOM_CLOSED = 'This room was closed by Admin.';
const SUBS = ['expenses', 'settlements', 'archives'] as const;
const CHUNK = 400; // Firestore batches are limited to 500 writes

type Op = (b: WriteBatch) => void;

async function commit(db: Firestore, ops: Op[]): Promise<void> {
  for (let i = 0; i < ops.length; i += CHUNK) {
    const b = writeBatch(db);
    ops.slice(i, i + CHUNK).forEach((op) => op(b));
    await b.commit();
  }
}

interface SubDoc {
  sub: (typeof SUBS)[number];
  id: string;
  ref: DocumentReference;
  data: DocumentData;
}

async function readSubs(db: Firestore, code: string): Promise<SubDoc[]> {
  const out: SubDoc[] = [];
  for (const sub of SUBS) {
    const snap = await getDocs(collection(db, 'rooms', code, sub));
    snap.docs.forEach((d) => out.push({ sub, id: d.id, ref: d.ref, data: d.data() }));
  }
  return out;
}

/** Ops that re-point (or clear) users whose active room is `fromCode` */
async function pointerOps(db: Firestore, uids: string[], fromCode: string, patch: { currentRoomCode: string; notice?: string }): Promise<Op[]> {
  const ops: Op[] = [];
  for (const uid of uids) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().currentRoomCode === fromCode) ops.push((b) => b.update(ref, patch));
  }
  return ops;
}

/* ------------------------------------------------------------------ */
/*  Create                                                              */
/* ------------------------------------------------------------------ */
export async function adminCreateRoom(db: Firestore, input: { name: string; code: string; owner: Profile }): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Please enter a room name.');
  const bad = validateRoomCode(input.code);
  if (bad) throw new Error(bad);
  const code = normalizeCode(input.code);

  const ref = doc(db, 'rooms', code);
  if ((await getDoc(ref)).exists()) throw new Error(`The code ${code} is already in use. Pick another one or auto-generate.`);

  const b = writeBatch(db);
  b.set(ref, {
    roomCode: code,
    roomName: name,
    createdBy: input.owner.uid,
    memberIds: [input.owner.uid],
    members: [toStored(input.owner)],
    createdAt: Date.now(),
    cycleStart: 0,
    presence: {},
    createdByAdmin: true,
  });
  // the initial member lands in the room automatically — unless they already have an active room
  const uref = doc(db, 'users', input.owner.uid);
  const us = await getDoc(uref);
  if (us.exists() && !us.data().currentRoomCode) b.update(uref, { currentRoomCode: code });
  await b.commit();
  return code;
}

/* ------------------------------------------------------------------ */
/*  Edit: rename · change code · change owner · remove members          */
/* ------------------------------------------------------------------ */
export interface RoomEdit {
  name: string;
  code: string;
  ownerId: string;
  removeIds: string[];
}

export async function adminSaveRoom(db: Firestore, room: Room, edit: RoomEdit): Promise<string> {
  const oldCode = room.roomCode;
  const name = edit.name.trim();
  if (!name) throw new Error('Please enter a room name.');
  const bad = validateRoomCode(edit.code);
  if (bad) throw new Error(bad);
  const newCode = normalizeCode(edit.code);

  const oldRef = doc(db, 'rooms', oldCode);
  const snap = await getDoc(oldRef);
  if (!snap.exists()) throw new Error('This room no longer exists.');
  const d = snap.data();

  const stored = (d.members as StoredMember[]) ?? [];
  const remaining = stored.filter((m) => !edit.removeIds.includes(m.id));
  if (!remaining.length) throw new Error('A room needs at least one member. Delete the room instead.');
  if (!remaining.some((m) => m.id === edit.ownerId)) throw new Error('The room owner must be one of the remaining members.');

  const moving = newCode !== oldCode;
  if (moving && (await getDoc(doc(db, 'rooms', newCode))).exists()) throw new Error(`The code ${newCode} is already in use by another room.`);

  const patch = {
    roomName: name,
    createdBy: edit.ownerId,
    memberIds: remaining.map((m) => m.id),
    members: remaining,
  };

  // 1) rename / owner / kicked members — kicked users are sent back to the room picker with a notice
  const kicked = edit.removeIds.filter((id) => stored.some((m) => m.id === id));
  const kickOps = await pointerOps(db, kicked, oldCode, { currentRoomCode: '', notice: `You were removed from ${name} by Admin.` });
  const b1 = writeBatch(db);
  b1.update(oldRef, patch);
  kickOps.forEach((op) => op(b1));
  await b1.commit();
  if (!moving) return oldCode;

  // 2) new code → move the whole room: copy doc + ledger, re-link members, then remove the old room
  const subs = await readSubs(db, oldCode);
  const newRef = doc(db, 'rooms', newCode);
  const copyOps: Op[] = [(b) => b.set(newRef, { ...d, ...patch, roomCode: newCode })];
  subs.forEach((s) => copyOps.push((b) => b.set(doc(db, 'rooms', newCode, s.sub, s.id), s.data)));
  await commit(db, copyOps);

  const relink = await pointerOps(db, patch.memberIds, oldCode, { currentRoomCode: newCode });
  await commit(db, relink);

  await commit(db, [...subs.map((s): Op => (b) => b.delete(s.ref)), (b) => b.delete(oldRef)]);
  return newCode;
}

/* ------------------------------------------------------------------ */
/*  Delete: room doc + every sub-collection + member links              */
/* ------------------------------------------------------------------ */
export async function adminDeleteRoom(db: Firestore, room: Room): Promise<void> {
  const code = room.roomCode;
  const ref = doc(db, 'rooms', code);
  const snap = await getDoc(ref);
  const memberIds: string[] = snap.exists() ? ((snap.data().memberIds as string[]) ?? []) : room.members.map((m) => m.id);

  const subs = await readSubs(db, code); // collect first, while the room still exists

  // members are redirected instantly: their link is cleared and the room doc removed in ONE atomic batch
  const links = await pointerOps(db, memberIds, code, { currentRoomCode: '', notice: NOTICE_ROOM_CLOSED });
  const b = writeBatch(db);
  links.forEach((op) => op(b));
  b.delete(ref);
  await b.commit();

  await commit(db, subs.map((s): Op => (bt) => bt.delete(s.ref)));
}
