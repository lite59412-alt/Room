import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentReference,
  type FirestoreError,
} from 'firebase/firestore';
import type {
  AppData,
  ArchiveRecord,
  ExpenseEntry,
  Room,
  SettlementRecord,
  SyncStatus,
  ToastInfo,
} from '../types';
import { getFirebase } from '../lib/firebase';
import { authErrorMessage, mapExpense, mapRoom, mapSettlement, patchMember, type StoredMember } from '../lib/roomService';
import { monthLabel, toDateStr, toTimeStr, uid as makeId } from '../lib/format';
import { spentByMember, totalOf } from '../lib/calc';

export type NewExpense = Omit<ExpenseEntry, 'id' | 'createdAt'>;
/** missing = room deleted · removed = no longer a member (kicked by admin / left) · denied = rules refused */
type RoomState = 'loading' | 'ok' | 'missing' | 'removed' | 'denied';

interface Flags {
  pendingExp: boolean;
  pendingSet: boolean;
  cacheRoom: boolean;
  cacheExp: boolean;
  error: boolean;
}

/**
 * Real-time room ledger backed by Firestore:
 *   rooms/{code}                → room doc (name, members, presence)
 *   rooms/{code}/expenses/*     → ExpenseEntry docs
 *   rooms/{code}/settlements/*  → settlement docs
 *   rooms/{code}/archives/*     → archived months
 * All three listeners use onSnapshot, so every roommate's screen updates instantly.
 */
export function useRoomData(uid: string, roomCode: string) {
  const { db } = getFirebase()!;

  const [room, setRoom] = useState<Room | null>(null);
  const [presence, setPresence] = useState<Record<string, number>>({});
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [roomState, setRoomState] = useState<RoomState>('loading');
  const [loaded, setLoaded] = useState({ exp: false, set: false });
  const [flags, setFlags] = useState<Flags>({ pendingExp: false, pendingSet: false, cacheRoom: true, cacheExp: true, error: false });
  const [online, setOnline] = useState(() => navigator.onLine);
  const [, setTick] = useState(0);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [unread, setUnread] = useState(false);
  const [writeError, setWriteError] = useState('');

  const showToast = useCallback((who: string, amount: number, title: string) => {
    setToast({ id: makeId('t'), who, amount, title, at: Date.now() });
    setUnread(true);
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const clearUnread = useCallback(() => setUnread(false), []);
  const clearWriteError = useCallback(() => setWriteError(''), []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const t = setInterval(() => setTick((n) => n + 1), 20000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(t);
    };
  }, []);

  /* ------------------------- real-time listeners ------------------------- */
  useEffect(() => {
    let seeded = false;
    const patch = (p: Partial<Flags>) => setFlags((f) => ({ ...f, ...p }));
    const onErr = (e: FirestoreError) => {
      if (e.code === 'permission-denied') {
        // Rules reject reads once the room is deleted or we are no longer a member — find out which one it is
        getDoc(doc(db, 'rooms', roomCode))
          .then((s) => {
            if (!s.exists()) setRoomState('missing');
            else if (!((s.data().memberIds as string[]) ?? []).includes(uid)) setRoomState('removed');
            else setRoomState('denied');
          })
          .catch(() => setRoomState('denied'));
      } else patch({ error: true });
    };
    const base = ['rooms', roomCode] as const;

    const u1 = onSnapshot(
      doc(db, ...base),
      (snap) => {
        patch({ cacheRoom: snap.metadata.fromCache, error: false });
        if (!snap.exists()) {
          if (!snap.metadata.fromCache) setRoomState('missing');
          return;
        }
        const d = snap.data();
        const mapped = mapRoom(roomCode, d);
        const ids = (d.memberIds as string[] | undefined) ?? mapped.members.map((m) => m.id);
        if (!ids.includes(uid)) {
          setRoomState('removed');
          return;
        }
        setRoom(mapped);
        setPresence((d.presence as Record<string, number>) ?? {});
        setRoomState('ok');
      },
      onErr,
    );

    const u2 = onSnapshot(
      collection(db, ...base, 'expenses'),
      (snap) => {
        setExpenses(snap.docs.map((d) => mapExpense(d.id, d.data())));
        setLoaded((l) => ({ ...l, exp: true }));
        patch({ pendingExp: snap.metadata.hasPendingWrites, cacheExp: snap.metadata.fromCache });
        if (seeded) {
          snap.docChanges().forEach((ch) => {
            if (ch.type !== 'added' || ch.doc.metadata.hasPendingWrites) return;
            const d = ch.doc.data();
            if (d.addedBy && d.addedBy !== uid) showToast(d.addedByName || d.paidByName || 'Roommate', Number(d.amount) || 0, d.title || 'Kharcha');
          });
        }
        seeded = true;
      },
      onErr,
    );

    const u3 = onSnapshot(
      collection(db, ...base, 'settlements'),
      (snap) => {
        setSettlements(
          snap.docs.map((d) => mapSettlement(d.id, d.data())).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
        );
        setLoaded((l) => ({ ...l, set: true }));
        patch({ pendingSet: snap.metadata.hasPendingWrites });
      },
      onErr,
    );

    const u4 = onSnapshot(
      collection(db, ...base, 'archives'),
      (snap) => {
        setArchives(
          snap.docs
            .map((d) => ({ ...(d.data() as Omit<ArchiveRecord, 'id'>), id: d.id }))
            .sort((a, b) => b.archivedAt - a.archivedAt),
        );
      },
      () => undefined,
    );

    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [db, roomCode, uid, showToast]);

  // presence heartbeat (only while the tab is visible)
  useEffect(() => {
    if (roomState !== 'ok') return;
    const beat = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        updateDoc(doc(db, 'rooms', roomCode), { [`presence.${uid}`]: Date.now() }).catch(() => undefined);
      }
    };
    beat();
    const t = setInterval(beat, 30000);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [db, roomCode, uid, roomState]);

  /* ------------------------------- derived ------------------------------- */
  // Archiving moves the cut-off forward instead of deleting anyone's entries
  const cycle = room?.cycleStart ?? 0;
  const data: AppData = useMemo(
    () => ({
      room: room ?? { id: roomCode, roomCode, name: '', members: [] },
      expenses: expenses.filter((e) => (e.createdAt ?? 0) >= cycle),
      settlements: settlements.filter((s) => s.status === 'pending_receiver_approval' || (s.createdAt ?? 0) >= cycle),
      archives,
      updatedAt: 0,
    }),
    [room, roomCode, expenses, settlements, archives, cycle],
  );

  const status: SyncStatus = flags.error
    ? 'error'
    : !online
      ? 'local'
      : flags.pendingExp || flags.pendingSet
        ? 'syncing'
        : flags.cacheRoom || flags.cacheExp
          ? 'connecting'
          : 'synced';

  const ready = roomState === 'ok' && loaded.exp && loaded.set;

  const isOnline = (id: string) => id === uid || Date.now() - (presence[id] ?? 0) < 75000;

  /* ------------------------------- actions ------------------------------- */
  const fail = (e: unknown) => setWriteError(authErrorMessage(e));
  const sub = (name: string) => collection(db, 'rooms', roomCode, name);
  const myName = () => room?.members.find((m) => m.id === uid)?.name ?? 'Someone';

  const addExpense = (input: NewExpense): void => {
    // STRICT OWNERSHIP: whatever the UI sent, the payer is always the signed-in account
    const ref = doc(sub('expenses'));
    setDoc(ref, {
      ...input,
      paidById: uid,
      paidByName: myName(),
      addedBy: uid,
      addedByName: myName(),
      createdAt: Date.now(),
    }).catch(fail);
    showToast(myName(), input.amount, input.title);
  };

  const updateExpense = (id: string, patch: Partial<ExpenseEntry>): void => {
    const body: Record<string, unknown> = {};
    Object.entries(patch).forEach(([k, v]) => {
      if (k === 'id' || k === 'createdAt' || k === 'paidById' || k === 'addedBy') return; // payer / owner are immutable
      body[k] = v === undefined ? deleteField() : v;
    });
    body.updatedAt = Date.now();
    updateDoc(doc(db, 'rooms', roomCode, 'expenses', id), body).catch(fail);
  };

  const deleteExpense = (id: string): void => {
    void deleteMany([doc(db, 'rooms', roomCode, 'expenses', id)]);
  };

  /**
   * Receiver-only verification: only the PAYER can create a request (status "pending_receiver_approval").
   * Balances change only after the RECEIVER approves it.
   */
  const addSettlement = (from: string, to: string, amount: number, method: 'UPI' | 'Cash'): void => {
    if (uid !== from || from === to) return;
    const now = new Date();
    setDoc(doc(sub('settlements')), {
      fromId: from,
      toId: to,
      amount,
      paymentMethod: method,
      date: toDateStr(now),
      time: toTimeStr(now),
      settledAt: Date.now(),
      status: 'pending_receiver_approval',
      requestedBy: uid,
    }).catch(fail);
  };

  const approveSettlement = (id: string): void => {
    const now = Date.now();
    updateDoc(doc(db, 'rooms', roomCode, 'settlements', id), { status: 'settled', approvedBy: uid, settledAt: now, decidedAt: now }).catch(fail);
  };

  const rejectSettlement = (id: string): void => {
    const now = Date.now();
    updateDoc(doc(db, 'rooms', roomCode, 'settlements', id), { status: 'rejected', rejectedBy: uid, decidedAt: now }).catch(fail);
  };

  const undoSettlement = (id: string): void => {
    void deleteMany([doc(db, 'rooms', roomCode, 'settlements', id)]);
  };

  async function deleteMany(refs: DocumentReference[], extra?: (b: ReturnType<typeof writeBatch>) => void) {
    try {
      const jobs: Promise<void>[] = [];
      for (let i = 0; i < Math.max(refs.length, 1); i += 400) {
        const b = writeBatch(db);
        if (i === 0) extra?.(b);
        refs.slice(i, i + 400).forEach((r) => b.delete(r));
        jobs.push(b.commit());
      }
      await Promise.all(jobs);
    } catch (e) {
      fail(e);
    }
  }

  /** Save the visible ledger into archives/{id} and move the cut-off forward (nobody's entries are deleted). */
  const archiveMonth = (): void => {
    if (data.settlements.some((s) => s.status === 'pending_receiver_approval')) {
      setWriteError('Resolve pending settlements before archiving the month.');
      return;
    }
    const exps = data.expenses;
    const sets = data.settlements;
    const total = totalOf(exps);
    const members = data.room.members;
    const rec = {
      label: monthLabel(),
      archivedAt: Date.now(),
      archivedBy: uid,
      total,
      perPerson: members.length ? Math.round((total / members.length) * 100) / 100 : 0,
      members,
      spentByMember: spentByMember(exps, members),
      expenses: exps,
      settlements: sets,
    };
    const batch = writeBatch(db);
    batch.set(doc(sub('archives')), rec);
    batch.update(doc(db, 'rooms', roomCode), { cycleStart: Date.now() });
    batch.commit().catch(fail);
  };

  /** Super Admin only (rules enforce it) — hard-deletes the room's documents */
  const clearAll = (): void => {
    void deleteMany([
      ...expenses.map((e) => doc(db, 'rooms', roomCode, 'expenses', e.id)),
      ...settlements.map((s) => doc(db, 'rooms', roomCode, 'settlements', s.id)),
      ...archives.map((a) => doc(db, 'rooms', roomCode, 'archives', a.id)),
    ]);
  };

  const renameRoom = (name: string): void => {
    updateDoc(doc(db, 'rooms', roomCode), { roomName: name.trim() || data.room.name }).catch(fail);
  };

  const updateMember = (id: string, patch: Partial<StoredMember>): void => {
    patchMember(db, roomCode, id, patch).catch(fail);
  };

  return {
    data,
    ready,
    roomState,
    status: status as SyncStatus,
    meId: uid,
    toast,
    dismissToast,
    unread,
    clearUnread,
    isOnline,
    writeError,
    clearWriteError,
    addExpense,
    updateExpense,
    deleteExpense,
    addSettlement,
    undoSettlement,
    approveSettlement,
    rejectSettlement,
    archiveMonth,
    clearAll,
    renameRoom,
    updateMember,
  };
}

export type RoomData = ReturnType<typeof useRoomData>;

/** Extra, app-shell level fields merged into the store handed to tabs */
export interface ShellExtras {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  frozen: boolean;
  isAdmin: boolean;
  /** Name shown for the signed-in user (profile display name) */
  displayName: string;
}

export type RoomStore = RoomData & ShellExtras;
