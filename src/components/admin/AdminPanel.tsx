import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  Download,
  Home,
  Hourglass,
  Megaphone,
  Radio,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import type { AppConfig, ExpenseEntry, Profile, Room, SettlementRecord } from '../../types';
import { ADMIN_EMAIL, isAdminEmail } from '../../lib/firebase';
import { firebaseAdminSource, type AdminSource, type ArchiveDoc, type FeedKey } from './adminSource';
import { totalOf } from '../../lib/calc';
import { formatINR, uid as makeId } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { RoomsManager } from './RoomsManager';
import { Spinner } from '../auth/Logo';
import { cn } from '../../utils/cn';

interface UserLike {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

interface Props {
  user: UserLike;
  config: AppConfig;
  onClose: () => void;
}

interface InnerProps extends Props {
  source: AdminSource;
}

/** Outer guard: nothing below runs (no listeners, no queries) unless the signed-in email matches ADMIN_EMAIL. */
export default function AdminPanel(props: Props) {
  if (!isAdminEmail(props.user.email, props.user.emailVerified)) return null;
  return <FirebaseAdmin {...props} />;
}

function FirebaseAdmin(props: Props) {
  const source = useMemo(() => firebaseAdminSource(), []);
  return <AdminInner {...props} source={source} />;
}

type TabKey = 'overview' | 'rooms' | 'approvals' | 'broadcast' | 'system';
interface Feed {
  count: number;
  at: number;
  cache: boolean;
  error?: string;
}

const FEED_INIT: Record<FeedKey, Feed> = {
  rooms: { count: 0, at: 0, cache: true },
  users: { count: 0, at: 0, cache: true },
  expenses: { count: 0, at: 0, cache: true },
  settlements: { count: 0, at: 0, cache: true },
};

function Stat({ icon, label, value, sub, tone = 'green' }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: 'green' | 'blue' | 'amber' }) {
  const toneCls = tone === 'green' ? 'bg-brandsoft text-brand' : tone === 'blue' ? 'bg-skysoft text-sky' : 'bg-amber-400/15 text-amber-500';
  return (
    <div className="rounded-[22px] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', toneCls)}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[12.5px] text-muted">{label}</p>
          <p className="truncate text-[26px] font-bold leading-tight tracking-tight">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-[12.5px] text-muted">{sub}</p>}
    </div>
  );
}

function ago(ms: number) {
  if (!ms) return '—';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function AdminInner({ user, config, onClose, source }: InnerProps) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [expenses, setExpenses] = useState<{ room: string; e: ExpenseEntry }[]>([]);
  const [settlements, setSettlements] = useState<{ room: string; s: SettlementRecord }[]>([]);
  const [archives, setArchives] = useState<ArchiveDoc[] | null>(null);
  const [feeds, setFeeds] = useState(FEED_INIT);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const [bcText, setBcText] = useState('');
  const [bcType, setBcType] = useState<'info' | 'warning' | 'success'>('info');
  const [mMsg, setMMsg] = useState(config.maintenanceMessage ?? '');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [latency, setLatency] = useState<number | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  // live Firestore feeds across all rooms
  useEffect(() => {
    const track = (k: FeedKey, size: number, cache: boolean) => {
      setFeeds((f) => ({ ...f, [k]: { count: size, at: Date.now(), cache } }));
      setLoading(false);
    };
    const unsub = source.subscribe({
      rooms: (l, c) => {
        setRooms(l);
        track('rooms', l.length, c);
      },
      users: (l, c) => {
        setUsers(l);
        track('users', l.length, c);
      },
      expenses: (l, c) => {
        setExpenses(l);
        track('expenses', l.length, c);
      },
      settlements: (l, c) => {
        setSettlements(l);
        track('settlements', l.length, c);
      },
      error: (k, code) => {
        setFeeds((f) => ({ ...f, [k]: { ...f[k], error: code } }));
        setLoading(false);
      },
    });
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const t = setInterval(() => setTick((n) => n + 1), 10000);
    return () => {
      unsub();
      clearInterval(t);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [source]);

  const loadArchives = async (): Promise<ArchiveDoc[]> => {
    const list = await source.loadArchives();
    setArchives(list);
    return list;
  };
  useEffect(() => {
    loadArchives().catch(() => setArchives([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const checkLatency = async () => {
    setBusy('latency');
    try {
      const t0 = performance.now();
      await source.ping();
      setLatency(Math.round(performance.now() - t0));
    } catch {
      setLatency(-1);
    } finally {
      setBusy('');
    }
  };
  useEffect(() => {
    void checkLatency();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------- derived ----------------------------- */
  const byRoom = useMemo(() => {
    const m = new Map<string, { exp: ExpenseEntry[]; set: SettlementRecord[] }>();
    const get = (c: string) => m.get(c) ?? m.set(c, { exp: [], set: [] }).get(c)!;
    expenses.forEach((x) => get(x.room).exp.push(x.e));
    settlements.forEach((x) => get(x.room).set.push(x.s));
    return m;
  }, [expenses, settlements]);

  const liveVolume = totalOf(expenses.map((x) => x.e));
  const archivedVolume = (archives ?? []).reduce((s, a) => s + (Number(a.total) || 0), 0);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const activeRooms = rooms.filter((r) => (byRoom.get(r.roomCode)?.exp ?? []).some((e) => e.date >= cutoffStr)).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const newUsers = users.filter((u) => (u.createdAt ?? 0) >= weekAgo).length;

  const pending = useMemo(
    () => settlements.filter((x) => x.s.status === 'pending_receiver_approval').sort((a, b) => (a.s.createdAt ?? 0) - (b.s.createdAt ?? 0)),
    [settlements],
  );

  /* ----------------------------- actions ----------------------------- */
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2600);
  };
  const writeConfig = async (patch: Record<string, unknown>, label: string) => {
    setBusy(label);
    try {
      await source.writeConfig(patch, user.email);
      flash('Saved ✔');
    } catch (e) {
      flash(`Failed: ${(e as { code?: string }).code ?? 'error'}`);
    } finally {
      setBusy('');
    }
  };

  const forceApprove = async (room: string, id: string) => {
    setBusy(`fa-${id}`);
    try {
      await source.forceApprove(room, id, user.email);
      flash('Force-approved · balances cleared');
    } catch (e) {
      flash(`Failed: ${(e as { code?: string }).code ?? 'error'}`);
    } finally {
      setBusy('');
    }
  };

  const sendBroadcast = () => {
    const text = bcText.trim();
    if (!text) return;
    void writeConfig({ announcement: { id: makeId('ann'), text, type: bcType, createdAt: Date.now(), by: user.email } }, 'broadcast').then(() => setBcText(''));
  };

  const exportJson = async () => {
    setBusy('export');
    try {
      const arch = archives ?? (await loadArchives());
      const dump = {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        config,
        users,
        rooms: rooms.map((r) => ({
          ...r,
          expenses: byRoom.get(r.roomCode)?.exp ?? [],
          settlements: byRoom.get(r.roomCode)?.set ?? [],
          archives: arch.filter((a) => a.roomCode === r.roomCode),
        })),
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roomiekhata-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash('Backup downloaded');
    } catch {
      flash('Export failed');
    } finally {
      setBusy('');
    }
  };

  const anyError = Object.values(feeds).find((f) => f.error);
  const tabs: { k: TabKey; label: string; icon: typeof Home }[] = [
    { k: 'overview', label: 'Overview', icon: Activity },
    { k: 'rooms', label: 'Rooms', icon: Home },
    { k: 'approvals', label: 'Approvals', icon: Hourglass },
    { k: 'broadcast', label: 'Broadcast', icon: Megaphone },
    { k: 'system', label: 'System', icon: Wrench },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-bg">
      <div className="anim-fade flex h-full w-full max-w-md flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line px-4 pb-3 pt-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand/60 bg-brandsoft text-brand shadow-[0_0_20px_rgba(34,201,122,0.6)]">
            <ShieldCheck size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-bold leading-tight">Admin Panel</h1>
            <p className="truncate text-[12px] text-muted">
              {user.email}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close admin panel" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-muted active:scale-95">
            <X size={19} />
          </button>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
          {tabs.map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition',
                tab === k ? 'border-brand bg-brandsoft text-brand' : 'border-line bg-surface text-muted',
              )}
            >
              <Icon size={15} /> {label}
              {k === 'approvals' && pending.length > 0 && (
                <span className="ml-0.5 rounded-full bg-danger px-1.5 text-[10.5px] font-bold text-white">{pending.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-10">
          {anyError && (
            <p className="mb-3 rounded-2xl border border-danger/40 bg-dangersoft px-4 py-3 text-[13px] leading-snug text-danger">
              Firestore refused an admin query ({anyError.error}). Publish <b>firestore.rules</b> and make sure it lists{' '}
              <b>{ADMIN_EMAIL}</b> as admin.
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-brand">
              <Spinner size={28} />
            </div>
          ) : tab === 'overview' ? (
            <div className="space-y-3">
              <Stat icon={<Home size={21} />} label="Total Active Rooms" value={String(rooms.length)} sub={`${activeRooms} with kharcha in the last 30 days`} />
              <Stat icon={<Users size={21} />} label="Total Registered Users" value={String(users.length)} sub={`${newUsers} joined in the last 7 days`} tone="blue" />
              <Stat
                icon={<Wallet size={21} />}
                label="Total Kharcha Volume"
                value={formatINR(liveVolume + archivedVolume)}
                sub={`Live ${formatINR(liveVolume)} · Archived ${archives ? formatINR(archivedVolume) : '…'} · ${expenses.length} entries`}
                tone="amber"
              />
              <div className="rounded-[22px] border border-line bg-surface p-4">
                <p className="text-[13px] font-semibold">Recent sign-ups</p>
                <div className="mt-2 divide-y divide-line">
                  {[...users]
                    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
                    .slice(0, 5)
                    .map((u) => (
                      <div key={u.uid} className="flex items-center gap-3 py-2.5">
                        <Avatar member={{ id: u.uid, name: u.displayName, avatar: u.photoURL }} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold">{u.displayName}</p>
                          <p className="truncate text-[12px] text-muted">{u.email}</p>
                        </div>
                        <span className="truncate text-[11.5px] text-muted">{u.currentRoomCode || 'no room'}</span>
                      </div>
                    ))}
                  {users.length === 0 && <p className="py-3 text-center text-[13px] text-muted">No users yet.</p>}
                </div>
              </div>
            </div>
          ) : tab === 'rooms' ? (
            <RoomsManager rooms={rooms} users={users} byRoom={byRoom} adminUid={user.uid} source={source} flash={flash} />
          ) : tab === 'approvals' ? (
            <div className="space-y-3">
              <p className="px-1 text-[12.5px] leading-snug text-muted">
                Settlements waiting for the receiver. If a receiver is out of station or stuck, force-approve it here — the balance clears
                without them.
              </p>
              {pending.length === 0 ? (
                <div className="rounded-[22px] border border-line bg-surface px-4 py-10 text-center text-[13.5px] text-muted">
                  <Hourglass size={28} className="mx-auto mb-2" />
                  No settlements are waiting for approval.
                </div>
              ) : (
                pending.map(({ room, s }) => {
                  const r = rooms.find((x) => x.roomCode === room);
                  const from = r?.members.find((m) => m.id === s.fromMemberId);
                  const to = r?.members.find((m) => m.id === s.toMemberId);
                  return (
                    <div key={s.id} className="rounded-[22px] border border-amber-400/50 bg-amber-400/10 p-4">
                      <p className="text-[11.5px] font-bold uppercase tracking-wide text-amber-500">
                        {room}
                        {r ? ` · ${r.name}` : ''}
                      </p>
                      <div className="mt-2 flex items-center gap-2.5">
                        {from && <Avatar member={from} size={38} />}
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold leading-snug">
                            {from?.name ?? 'Payer'} → {to?.name ?? 'Receiver'}
                          </p>
                          <p className="text-[12.5px] text-muted">
                            via {s.paymentMethod} · requested {ago(s.createdAt ?? 0)} · waiting for {to?.name ?? 'receiver'}
                          </p>
                        </div>
                        <p className="text-[18px] font-bold">{formatINR(s.amount)}</p>
                      </div>
                      <button
                        onClick={() => void forceApprove(room, s.id)}
                        disabled={busy === `fa-${s.id}`}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3 text-[14.5px] font-bold text-white active:scale-[0.98] disabled:opacity-50"
                      >
                        {busy === `fa-${s.id}` ? <Spinner size={16} /> : <ShieldCheck size={17} />} Force Approve Settlement
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ) : tab === 'broadcast' ? (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-line bg-surface p-4">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <Megaphone size={18} className="text-brand" /> Announcement banner
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted">Shown instantly at the top of the app for every signed-in user.</p>
                <textarea
                  value={bcText}
                  onChange={(e) => setBcText(e.target.value.slice(0, 220))}
                  rows={3}
                  placeholder="e.g. Server maintenance tonight at 11 PM"
                  className="mt-3 w-full rounded-xl border border-line bg-surface2 p-3 text-[14px] outline-none focus:border-brand"
                />
                <div className="mt-1 flex items-center justify-between text-[11.5px] text-muted">
                  <span>{bcText.length}/220</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['info', 'warning', 'success'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBcType(t)}
                      className={cn(
                        'rounded-xl border py-2 text-[12.5px] font-semibold capitalize',
                        bcType === t ? 'border-brand bg-brandsoft text-brand' : 'border-line bg-surface2 text-muted',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={sendBroadcast}
                  disabled={!bcText.trim() || busy === 'broadcast'}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3 text-[14.5px] font-bold text-white disabled:opacity-40"
                >
                  {busy === 'broadcast' ? <Spinner size={16} /> : <Send size={17} />} Send to all users
                </button>
              </div>

              <div className="rounded-[22px] border border-line bg-surface p-4">
                <p className="text-[13px] font-semibold">Currently live</p>
                {config.announcement ? (
                  <>
                    <p className="mt-2 rounded-xl bg-surface2 p-3 text-[13.5px] leading-snug">{config.announcement.text}</p>
                    <p className="mt-1.5 text-[11.5px] text-muted">
                      {config.announcement.type} · sent {ago(config.announcement.createdAt)}
                    </p>
                    <button
                      onClick={() => void writeConfig({ announcement: null }, 'clear')}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/40 bg-dangersoft py-2.5 text-[13.5px] font-semibold text-danger"
                    >
                      <Trash2 size={16} /> Remove banner
                    </button>
                  </>
                ) : (
                  <p className="mt-2 text-[13px] text-muted">No announcement is active.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sync monitor */}
              <div className="rounded-[22px] border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[15px] font-semibold">
                    <Radio size={18} className="text-brand" /> Firestore sync monitor
                  </p>
                  <span className={cn('flex items-center gap-1.5 text-[12px] font-semibold', online && !anyError ? 'text-brand' : 'text-danger')}>
                    <span className={cn('h-2 w-2 rounded-full', online && !anyError ? 'bg-[#2ee58a]' : 'bg-red-500')} />
                    {!online ? 'Offline' : anyError ? 'Degraded' : 'Healthy'}
                  </span>
                </div>
                <div className="mt-3 divide-y divide-line rounded-xl border border-line">
                  {(Object.keys(feeds) as FeedKey[]).map((k) => {
                    const f = feeds[k];
                    return (
                      <div key={k} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                        <span className={cn('h-2 w-2 rounded-full', f.error ? 'bg-red-500' : f.cache ? 'bg-amber-400' : 'bg-[#2ee58a]')} />
                        <span className="flex-1 font-medium capitalize">{k}</span>
                        <span className="text-muted">
                          {f.error ? f.error : `${f.count} docs · ${f.cache ? 'cache' : 'server'} · ${ago(f.at)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-surface2 px-3 py-2.5 text-[13px]">
                  <span className="text-muted">Server round-trip</span>
                  <span className="flex items-center gap-2 font-semibold">
                    {busy === 'latency' ? <Spinner size={14} /> : latency === null ? '—' : latency < 0 ? 'failed' : `${latency} ms`}
                    <button onClick={() => void checkLatency()} className="rounded-lg border border-line bg-surface px-2 py-1 text-[11.5px] font-semibold text-brand">
                      Test
                    </button>
                  </span>
                </div>
              </div>

              {/* Maintenance */}
              <div className="rounded-[22px] border border-line bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15 text-amber-500">
                    <Wrench size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">Maintenance mode</p>
                    <p className="text-[12.5px] text-muted">Freezes adding, editing & settling for everyone except you.</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={!!config.maintenance}
                    disabled={busy === 'maintenance'}
                    onClick={() => void writeConfig({ maintenance: !config.maintenance, maintenanceMessage: mMsg.trim() }, 'maintenance')}
                    className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', config.maintenance ? 'bg-amber-500' : 'bg-slate-400/50')}
                  >
                    <span className={cn('absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all', config.maintenance ? 'left-[23px]' : 'left-[3px]')} />
                  </button>
                </div>
                <input
                  value={mMsg}
                  onChange={(e) => setMMsg(e.target.value)}
                  placeholder="Message shown to users (optional)"
                  className="mt-3 w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-[14px] outline-none focus:border-brand"
                />
                {!!config.maintenance && (
                  <button
                    onClick={() => void writeConfig({ maintenanceMessage: mMsg.trim() }, 'maintenance')}
                    className="mt-2 text-[12.5px] font-semibold text-sky"
                  >
                    Update message
                  </button>
                )}
              </div>

              {/* Backup */}
              <div className="rounded-[22px] border border-line bg-surface p-4">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <Download size={18} className="text-brand" /> Database backup
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Export all users, rooms, expenses, settlements and archives ({users.length} users · {rooms.length} rooms · {expenses.length} expenses) as JSON.
                </p>
                <button
                  onClick={() => void exportJson()}
                  disabled={busy === 'export'}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--border-green)] bg-brandsoft py-3 text-[14.5px] font-bold text-brand disabled:opacity-50"
                >
                  {busy === 'export' ? <Spinner size={16} /> : <Download size={17} />} Export global data (JSON)
                </button>
              </div>
            </div>
          )}
        </div>

        {msg && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <div className="anim-toast rounded-full border border-[color:var(--border-green)] bg-surface px-4 py-2.5 text-[13.5px] font-medium shadow-xl">{msg}</div>
          </div>
        )}
      </div>
    </div>
  );
}
