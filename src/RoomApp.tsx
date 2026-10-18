import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import type { AppConfig, ExpenseEntry, Profile, Transfer } from './types';
import type { AuthApi } from './hooks/useAuth';
import { useRoomData, type RoomData, type RoomStore } from './hooks/useRoomData';
import { buildView, type UI } from './lib/view';
import { usePush } from './hooks/usePush';
import { canModifyExpense, isPending } from './lib/calc';
import { getFirebase, isAdminEmail } from './lib/firebase';
import { joinRoom as joinRoomSvc, leaveRoom as leaveRoomSvc } from './lib/roomService';
import { NOTICE_ROOM_CLOSED } from './lib/adminRooms';
import { formatINR } from './lib/format';
import { Header } from './components/Header';
import { ToastBanner } from './components/ToastBanner';
import { BottomNav, type Tab } from './components/BottomNav';
import { AnnouncementBanner, MaintenanceBanner } from './components/AnnouncementBanner';
import { PendingSettlements } from './components/PendingSettlements';
import { NotificationPrompt } from './components/NotificationPrompt';
import { HomeTab } from './components/tabs/HomeTab';
import { ActivityTab } from './components/tabs/ActivityTab';
import { SettlementsTab } from './components/tabs/SettlementsTab';
import { MoreTab } from './components/tabs/MoreTab';
import { AddExpenseSheet } from './components/sheets/AddExpenseSheet';
import { ExpenseDetailSheet } from './components/sheets/ExpenseDetailSheet';
import { PaySheet } from './components/sheets/PaySheet';
import { RoomSheet } from './components/sheets/RoomSheet';
import { ProfileSheet } from './components/sheets/ProfileSheet';
import { NotificationsSheet } from './components/sheets/NotificationsSheet';
import { Splash } from './components/auth/Splash';
import { ErrorScreen } from './components/auth/ErrorScreen';

// Admin code is only ever loaded (and rendered) for the authorised admin email.
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

const DISMISS_KEY = 'rk.dismissedAnnouncement';
const LEAVING_KEY = 'rk.leaving';

/** The signed-in Google account, as the shell needs it. */
export interface Session {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  profile: Profile;
  isAdmin: boolean;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => void;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
}

interface ShellProps {
  session: Session;
  rd: RoomData;
  config: AppConfig;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

/* ------------------------------------------------------------------ */
/*  Firestore-backed room for the signed-in account                     */
/* ------------------------------------------------------------------ */
interface Props {
  auth: AuthApi;
  config: AppConfig;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export default function RoomApp({ auth, config, theme, toggleTheme }: Props) {
  const user = auth.user!;
  const profile = auth.profile!;
  const roomCode = profile.currentRoomCode;
  const { db } = getFirebase()!;
  const rd = useRoomData(user.uid, roomCode);

  const session: Session = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    profile,
    isAdmin: isAdminEmail(user.email, user.emailVerified),
    updateProfile: auth.updateProfile,
    signOut: () => void auth.signOut(),
    joinRoom: async (code) => {
      await joinRoomSvc(db, profile, code);
    },
    leaveRoom: async () => {
      sessionStorage.setItem(LEAVING_KEY, '1'); // so our own "leave" is not reported as a removal
      try {
        await leaveRoomSvc(db, user.uid, roomCode);
      } catch (e) {
        sessionStorage.removeItem(LEAVING_KEY);
        throw e;
      }
    },
  };

  return <RoomShell session={session} rd={rd} config={config} theme={theme} toggleTheme={toggleTheme} />;
}

/* ------------------------------------------------------------------ */
/*  App shell                                                           */
/* ------------------------------------------------------------------ */
export function RoomShell({ session, rd, config, theme, toggleTheme }: ShellProps) {
  const uid = session.uid;
  const isAdmin = session.isAdmin;
  const frozen = !!config.maintenance && !isAdmin;

  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'activity' || t === 'settlements' || t === 'more' ? t : 'home';
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pay, setPay] = useState<Transfer | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) ?? '');
  const snackTimer = useRef<number | undefined>(undefined);
  const push = usePush(uid);

  const notify = useCallback((msg: string) => {
    setSnack(msg);
    window.clearTimeout(snackTimer.current);
    snackTimer.current = window.setTimeout(() => setSnack(null), 2600);
  }, []);

  // Maintenance guard: mutations are blocked client-side (and by Firestore rules server-side)
  const block = () => {
    if (!frozen) return false;
    notify(config.maintenanceMessage ? `🛠 ${config.maintenanceMessage}` : '🛠 Maintenance mode · editing is paused');
    return true;
  };

  const ownsExpense = (id: string) => {
    const e = rd.data.expenses.find((x) => x.id === id);
    return !!e && canModifyExpense(e, uid, isAdmin);
  };
  const denyEdit = () => notify('Only the person who added this kharcha (or the Super Admin) can change it');
  const isMyIncoming = (id: string) => rd.data.settlements.some((s) => s.id === id && isPending(s) && s.toMemberId === uid);

  const store: RoomStore = {
    ...rd,
    theme,
    toggleTheme,
    frozen,
    isAdmin,
    displayName: session.profile.displayName,
    addExpense: (i) => {
      if (block()) return;
      rd.addExpense({ ...i, paidById: uid }); // payer is always the signed-in account
    },
    updateExpense: (id, p) => {
      if (block()) return;
      if (!ownsExpense(id)) return denyEdit();
      rd.updateExpense(id, p);
    },
    deleteExpense: (id) => {
      if (block()) return;
      if (!ownsExpense(id)) return denyEdit();
      rd.deleteExpense(id);
    },
    addSettlement: (f, t, a, m) => {
      if (block()) return;
      if (f !== uid) return notify('Only the payer can send a settlement request');
      if (rd.data.settlements.some((s) => isPending(s) && s.fromMemberId === f && s.toMemberId === t))
        return notify('A request to this person is already waiting for approval');
      rd.addSettlement(f, t, a, m);
    },
    undoSettlement: (id) => {
      if (!block()) rd.undoSettlement(id);
    },
    approveSettlement: (id) => {
      if (block()) return;
      if (!isMyIncoming(id)) return notify('Only the receiver can approve this payment');
      rd.approveSettlement(id);
    },
    rejectSettlement: (id) => {
      if (block()) return;
      if (!isMyIncoming(id)) return notify('Only the receiver can reject this payment');
      rd.rejectSettlement(id);
    },
    archiveMonth: () => {
      if (!block()) rd.archiveMonth();
    },
    clearAll: () => {
      if (!block()) rd.clearAll();
    },
    renameRoom: (n) => {
      if (!block()) rd.renameRoom(n);
    },
  };

  const view = useMemo(() => buildView(rd.data), [rd.data]);
  const { members } = rd.data.room;
  const me = members.find((m) => m.id === uid);
  const pendingForMe = rd.data.settlements.filter((s) => s.status === 'pending_receiver_approval' && s.toMemberId === uid).length;

  // surface Firestore write failures (e.g. rules not published, maintenance rejection)
  useEffect(() => {
    if (rd.writeError) {
      notify(rd.writeError);
      rd.clearWriteError();
    }
  }, [rd, notify]);

  // Room deleted or we were removed by the admin → back to the "Create / Join room" screen with an alert.
  // (The admin also writes this notice to the user's profile; this is the fallback when that lands second.)
  const redirected = useRef('');
  useEffect(() => {
    const state = rd.roomState;
    if (state !== 'missing' && state !== 'removed') return;
    const code = rd.data.room.roomCode;
    if (session.profile.currentRoomCode !== code) return; // profile already moved on
    const key = `${code}:${state}`;
    if (redirected.current === key) return;
    redirected.current = key;
    const leaving = sessionStorage.getItem(LEAVING_KEY) === '1';
    sessionStorage.removeItem(LEAVING_KEY);
    session
      .updateProfile({
        currentRoomCode: '',
        ...(leaving ? {} : { notice: state === 'missing' ? NOTICE_ROOM_CLOSED : 'You were removed from this room by Admin.' }),
      })
      .catch(() => undefined);
  }, [rd.roomState, rd.data.room.roomCode, session]);

  // keep this user's entry in room.members in sync with their profile (name / UPI / photo)
  const lastSync = useRef('');
  useEffect(() => {
    if (!rd.ready || !me) return;
    const p = session.profile;
    const want = { name: p.displayName, upiId: p.upiId, phone: p.phone, photoURL: p.photoURL };
    const differs =
      (want.name && want.name !== me.name) ||
      (want.upiId && want.upiId !== (me.upiId ?? '')) ||
      (want.phone && want.phone !== (me.phone ?? '')) ||
      (want.photoURL && want.photoURL !== me.avatar);
    const key = JSON.stringify(want);
    if (differs && lastSync.current !== key) {
      lastSync.current = key;
      rd.updateMember(uid, Object.fromEntries(Object.entries(want).filter(([, v]) => !!v)));
    }
  }, [rd, me, session.profile, uid]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  // notification tap → open the right tab (cold start via ?tab=, or live via service-worker message)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('tab')) window.history.replaceState(null, '', window.location.pathname);
    const onMsg = (e: MessageEvent) => {
      const t = e.data?.type === 'NAVIGATE' ? e.data.tab : null;
      if (t === 'activity' || t === 'settlements' || t === 'more' || t === 'home') setTab(t);
    };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, []);

  const ui: UI = {
    openExpense: (e) => setDetailId(e.id),
    openAdd: () => {
      if (block()) return;
      setEditing(null);
      setAdding(true);
    },
    openPay: setPay,
    openRoom: () => setRoomOpen(true),
    notify,
    goTab: setTab,
    openProfile: () => setProfileOpen(true),
    signOut: session.signOut,
    push,
    openAdmin: isAdmin ? () => setAdminOpen(true) : undefined,
  };

  if (rd.roomState === 'denied') {
    return (
      <ErrorScreen
        title="Can’t open this room"
        message="Firestore denied access. Make sure the security rules from firestore.rules are published, and that you’re still a member of this room."
        onRetry={() => session.updateProfile({ currentRoomCode: '' }).catch(() => undefined)}
        retryLabel="Choose another room"
        onSignOut={session.signOut}
      />
    );
  }
  if (rd.roomState === 'missing' || rd.roomState === 'removed') return <Splash label="This room is no longer available — taking you back…" />;
  if (!rd.ready) return <Splash label="Loading your room…" />;

  const detail = detailId ? rd.data.expenses.find((e) => e.id === detailId) ?? null : null;
  const props = { store, view, ui };
  const showAnnouncement = config.announcement && config.announcement.id !== dismissed;

  return (
    <div className="anim-fade relative mx-auto min-h-dvh w-full max-w-md bg-bg pb-44 md:border-x md:border-line">
      {config.maintenance && <MaintenanceBanner message={config.maintenanceMessage} adminBypass={isAdmin} />}
      {showAnnouncement && config.announcement && (
        <AnnouncementBanner
          a={config.announcement}
          onDismiss={() => {
            localStorage.setItem(DISMISS_KEY, config.announcement!.id);
            setDismissed(config.announcement!.id);
          }}
        />
      )}

      <Header
        room={rd.data.room}
        status={rd.status}
        theme={theme}
        unread={rd.unread}
        isOnline={rd.isOnline}
        meId={uid}
        onToggleTheme={toggleTheme}
        onOpenRoom={() => setRoomOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenAdmin={isAdmin ? () => setAdminOpen(true) : undefined}
        onOpenNotifications={() => {
          setNotifOpen(true);
          rd.clearUnread();
        }}
      />

      {/* Receiver-only approval prompts: rendered ONLY for the person who is owed the money */}
      <div className="mx-4 mt-3 empty:hidden">
        <PendingSettlements store={store} notify={notify} mode="incoming" />
      </div>
      <NotificationPrompt push={push} notify={notify} />

      {tab === 'home' && <ToastBanner toast={rd.toast} onClose={rd.dismissToast} />}

      <main key={tab} className="anim-fade">
        {tab === 'home' && <HomeTab {...props} />}
        {tab === 'activity' && <ActivityTab {...props} />}
        {tab === 'settlements' && <SettlementsTab {...props} />}
        {tab === 'more' && <MoreTab {...props} />}
      </main>

      {/* Floating Add Kharcha */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-30 mx-auto flex w-full max-w-md justify-end px-3.5">
        <button
          onClick={ui.openAdd}
          className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-[#3de8a0]/40 bg-gradient-to-b from-[#26d38b] to-[#0fa56b] px-7 py-3.5 text-[17px] font-semibold text-white shadow-[0_12px_28px_-6px_rgba(34,201,122,0.75)] transition active:scale-95"
        >
          <Plus size={24} strokeWidth={2.2} /> Add Kharcha
        </button>
      </div>

      <BottomNav tab={tab} onTab={setTab} onAdd={ui.openAdd} badge={pendingForMe} />

      {snack && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[160px] z-[70] mx-auto flex w-full max-w-md justify-center px-4">
          <div className="anim-toast flex max-w-full items-center gap-2 rounded-full border border-[color:var(--border-green)] bg-surface px-4 py-2.5 text-[13.5px] font-medium shadow-xl">
            <CheckCircle2 size={17} className="shrink-0 text-brand" /> <span className="truncate">{snack}</span>
          </div>
        </div>
      )}

      {/* Sheets */}
      {(adding || editing) && (
        <AddExpenseSheet
          members={members}
          meId={uid}
          editing={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={(input, id) => {
            if (block()) return;
            if (id) {
              store.updateExpense(id, input);
              notify('Kharcha updated');
            } else {
              store.addExpense(input);
              notify(`Added ${formatINR(input.amount)} for ${input.title}`);
            }
            setAdding(false);
            setEditing(null);
            setTab((t) => (t === 'more' ? 'home' : t));
          }}
        />
      )}

      {detail && !editing && (
        <ExpenseDetailSheet
          expense={detail}
          members={members}
          meId={uid}
          canModify={canModifyExpense(detail, uid, isAdmin)}
          ownerName={members.find((m) => m.id === (detail.addedBy ?? detail.paidById))?.name ?? 'the roommate'}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            if (block()) return;
            if (!ownsExpense(detail.id)) return denyEdit();
            setEditing(detail);
            setDetailId(null);
          }}
          onDelete={() => {
            if (block()) return;
            if (!ownsExpense(detail.id)) return denyEdit();
            store.deleteExpense(detail.id);
            setDetailId(null);
            notify('Kharcha deleted · balances updated');
          }}
        />
      )}

      {pay && (
        <PaySheet
          transfer={pay}
          members={members}
          meId={uid}
          onClose={() => setPay(null)}
          onSaveUpi={(id, upi) => {
            if (id === uid) session.updateProfile({ upiId: upi }).catch(() => undefined);
            rd.updateMember(id, { upiId: upi });
            notify('UPI ID saved');
          }}
          onSettle={(t, method) => {
            if (block()) return;
            store.addSettlement(t.from, t.to, t.amount, method);
            setPay(null);
            const toName = members.find((m) => m.id === t.to)?.name ?? 'receiver';
            notify(`Request sent · waiting for ${toName} to confirm ${formatINR(t.amount)}`);
          }}
        />
      )}

      {roomOpen && (
        <RoomSheet store={store} notify={notify} onClose={() => setRoomOpen(false)} onJoin={session.joinRoom} onLeave={session.leaveRoom} />
      )}

      {profileOpen && me && (
        <ProfileSheet
          me={me}
          members={members}
          roomName={rd.data.room.name}
          roomCode={rd.data.room.roomCode}
          isOnline={rd.isOnline}
          status={rd.status}
          verified={session.emailVerified}
          ownerId={rd.data.room.createdBy}
          onClose={() => setProfileOpen(false)}
          onSave={(p) => {
            session.updateProfile(p).catch(() => undefined);
            rd.updateMember(uid, { name: p.displayName, upiId: p.upiId, phone: p.phone });
            notify('Profile saved');
          }}
          onSignOut={session.signOut}
          onOpenAdmin={
            isAdmin
              ? () => {
                  setProfileOpen(false);
                  setAdminOpen(true);
                }
              : undefined
          }
        />
      )}

      {notifOpen && (
        <NotificationsSheet
          expenses={rd.data.expenses}
          settlements={rd.data.settlements}
          members={members}
          meId={uid}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {isAdmin && adminOpen && (
        <Suspense fallback={<Splash label="Opening admin panel…" />}>
          <AdminPanel
            user={{ uid, email: session.email, emailVerified: session.emailVerified }}
            config={config}
            onClose={() => setAdminOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
