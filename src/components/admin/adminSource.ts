import { collection, collectionGroup, deleteDoc, doc, getDocFromServer, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import type { ExpenseEntry, Profile, Room, SettlementRecord } from '../../types';
import { getFirebase } from '../../lib/firebase';
import { adminCreateRoom, adminDeleteRoom, adminSaveRoom, type RoomEdit } from '../../lib/adminRooms';
import { mapExpense, mapRoom, mapSettlement } from '../../lib/roomService';

export type FeedKey = 'rooms' | 'users' | 'expenses' | 'settlements';

export interface ArchiveDoc {
  id: string;
  roomCode: string;
  total: number;
  [k: string]: unknown;
}

export interface AdminHandlers {
  rooms(list: Room[], cache: boolean): void;
  users(list: Profile[], cache: boolean): void;
  expenses(list: { room: string; e: ExpenseEntry }[], cache: boolean): void;
  settlements(list: { room: string; s: SettlementRecord }[], cache: boolean): void;
  error(k: FeedKey, code: string): void;
}

/** Where the admin panel gets its data: Firestore, readable only by the admin account (enforced by security rules). */
export interface AdminSource {
  subscribe(h: AdminHandlers): () => void;
  loadArchives(): Promise<ArchiveDoc[]>;
  writeConfig(patch: Record<string, unknown>, by: string | null): Promise<void>;
  ping(): Promise<void>;
  /** Super Admin override: settle a pending request without the receiver */
  forceApprove(room: string, id: string, by: string | null): Promise<void>;
  /** Super Admin override: modify / delete any expense in any room */
  updateExpense(room: string, id: string, patch: { title?: string; amount?: number }): Promise<void>;
  deleteExpense(room: string, id: string): Promise<void>;
  /** Room management — create / edit (rename, new code, owner, kick members) / delete with full cleanup */
  createRoom(input: { name: string; code: string; owner: Profile }): Promise<string>;
  saveRoom(room: Room, edit: RoomEdit): Promise<string>;
  deleteRoom(room: Room): Promise<void>;
}

export function firebaseAdminSource(): AdminSource {
  const { db } = getFirebase()!;
  return {
    subscribe(h) {
      const err = (k: FeedKey) => (e: { code: string }) => h.error(k, e.code);
      const u1 = onSnapshot(collection(db, 'rooms'), (s) => h.rooms(s.docs.map((d) => mapRoom(d.id, d.data())), s.metadata.fromCache), err('rooms'));
      const u2 = onSnapshot(collection(db, 'users'), (s) => h.users(s.docs.map((d) => d.data() as Profile), s.metadata.fromCache), err('users'));
      const u3 = onSnapshot(
        collectionGroup(db, 'expenses'),
        (s) => h.expenses(s.docs.map((d) => ({ room: d.ref.parent.parent?.id ?? '', e: mapExpense(d.id, d.data()) })), s.metadata.fromCache),
        err('expenses'),
      );
      const u4 = onSnapshot(
        collectionGroup(db, 'settlements'),
        (s) => h.settlements(s.docs.map((d) => ({ room: d.ref.parent.parent?.id ?? '', s: mapSettlement(d.id, d.data()) })), s.metadata.fromCache),
        err('settlements'),
      );
      return () => {
        u1();
        u2();
        u3();
        u4();
      };
    },
    async loadArchives() {
      const snap = await getDocs(collectionGroup(db, 'archives'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id, roomCode: d.ref.parent.parent?.id ?? '' }) as ArchiveDoc);
    },
    async writeConfig(patch, by) {
      await setDoc(doc(db, 'config', 'app'), { ...patch, updatedAt: Date.now(), updatedBy: by }, { merge: true });
    },
    async ping() {
      await getDocFromServer(doc(db, 'config', 'app'));
    },
    async forceApprove(room, id, by) {
      const now = Date.now();
      await updateDoc(doc(db, 'rooms', room, 'settlements', id), { status: 'settled', approvedBy: by ?? 'admin', forced: true, settledAt: now, decidedAt: now });
    },
    async updateExpense(room, id, patch) {
      await updateDoc(doc(db, 'rooms', room, 'expenses', id), { ...patch, updatedAt: Date.now(), editedByAdmin: true });
    },
    async deleteExpense(room, id) {
      await deleteDoc(doc(db, 'rooms', room, 'expenses', id));
    },
    createRoom: (input) => adminCreateRoom(db, input),
    saveRoom: (room, edit) => adminSaveRoom(db, room, edit),
    deleteRoom: (room) => adminDeleteRoom(db, room),
  };
}
