import { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, Copy, Crown, Pencil, Plus, Search, Trash2, Users, Wallet } from 'lucide-react';
import type { ExpenseEntry, Profile, Room, SettlementRecord } from '../../types';
import type { AdminSource } from './adminSource';
import { copyText } from '../Header';
import { netBalances, simplifyDebts, spentByMember, totalOf } from '../../lib/calc';
import { formatINR } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { AdminExpense } from './AdminExpense';
import { DeleteRoomSheet, RoomFormSheet } from './RoomForms';
import { cn } from '../../utils/cn';

interface Props {
  rooms: Room[];
  users: Profile[];
  byRoom: Map<string, { exp: ExpenseEntry[]; set: SettlementRecord[] }>;
  adminUid: string;
  source: AdminSource;
  flash: (m: string) => void;
}

const EMPTY = { exp: [] as ExpenseEntry[], set: [] as SettlementRecord[] };

export function RoomsManager({ rooms, users, byRoom, adminUid, source, flash }: Props) {
  const [q, setQ] = useState('');
  const [openLedger, setOpenLedger] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);
  const [copied, setCopied] = useState('');

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rooms
      .filter((r) => !n || r.roomCode.toLowerCase().includes(n) || r.name.toLowerCase().includes(n))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [rooms, q]);

  const copy = async (code: string) => {
    if (await copyText(code)) {
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? '' : c)), 1500);
    }
  };

  const fail = (e: unknown) => flash(`Failed: ${(e as { code?: string; message?: string }).code ?? (e as Error).message ?? 'error'}`);

  return (
    <>
      <button
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3.5 text-[15.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,201,122,0.7)] active:scale-[0.98]"
      >
        <Plus size={20} strokeWidth={3} /> Create New Room
      </button>

      <div className="relative mt-3">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by room name or code"
          className="w-full rounded-2xl border border-line bg-surface py-3 pl-10 pr-4 text-[14.5px] outline-none placeholder:text-muted/70 focus:border-brand"
        />
      </div>
      <p className="mb-2 mt-3 px-1 text-[12.5px] text-muted">
        {filtered.length} of {rooms.length} rooms · live from Firestore
      </p>

      <div className="space-y-3">
        {filtered.map((r) => {
          const data = byRoom.get(r.roomCode) ?? EMPTY;
          const open = openLedger === r.roomCode;
          const volume = totalOf(data.exp);
          const net = netBalances(data.exp, data.set, r.members);
          const spent = spentByMember(data.exp, r.members);
          const transfers = simplifyDebts(net);
          const owner = r.members.find((m) => m.id === r.createdBy) ?? r.members[0];
          const created = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

          return (
            <div key={r.roomCode} className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-card)]">
              <div className="px-4 pb-3 pt-3.5">
                <p className="truncate text-[16.5px] font-bold leading-tight">{r.name}</p>

                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-md bg-surface2 px-2 py-1 text-[12px] font-bold tracking-wider">{r.roomCode}</span>
                  <button
                    onClick={() => void copy(r.roomCode)}
                    aria-label={`Copy code ${r.roomCode}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted active:scale-90"
                  >
                    {copied === r.roomCode ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
                  </button>
                  {owner && (
                    <span className="ml-auto flex min-w-0 items-center gap-1 truncate text-[11.5px] text-muted">
                      <Crown size={12} className="shrink-0 text-amber-500" /> <span className="truncate">{owner.name}</span>
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1 rounded-full bg-skysoft px-2.5 py-1 text-[12px] font-semibold text-sky">
                    <Users size={12} /> {r.members.length} {r.members.length === 1 ? 'member' : 'members'}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-brandsoft px-2.5 py-1 text-[12px] font-semibold text-brand">
                    <Wallet size={12} /> {formatINR(volume)}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-1 text-[12px] font-medium text-muted">
                    <CalendarDays size={12} /> {created}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setOpenLedger(open ? null : r.roomCode)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12.5px] font-semibold active:scale-95',
                      open ? 'border-brand bg-brandsoft text-brand' : 'border-line bg-surface2',
                    )}
                  >
                    <BookOpen size={15} /> View Ledger
                  </button>
                  <button
                    onClick={() => setEditing(r)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface2 py-2.5 text-[12.5px] font-semibold active:scale-95"
                  >
                    <Pencil size={14} /> Edit Room
                  </button>
                  <button
                    onClick={() => setDeleting(r)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/40 bg-dangersoft py-2.5 text-[12.5px] font-semibold text-danger active:scale-95"
                  >
                    <Trash2 size={14} /> Delete Room
                  </button>
                </div>
              </div>

              {open && (
                <div className="anim-fade space-y-2 border-t border-line bg-surface2 px-4 py-3">
                  {r.members.map((m) => {
                    const n = net[m.id] ?? 0;
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <Avatar member={m} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold">{m.name}</p>
                          <p className="truncate text-[12px] text-muted">
                            {m.email} · spent {formatINR(spent[m.id] ?? 0)}
                          </p>
                        </div>
                        <span className={cn('text-[13.5px] font-bold', n >= 0.5 ? 'text-brand' : n <= -0.5 ? 'text-danger' : 'text-muted')}>
                          {n >= 0.5 ? `+${formatINR(n)}` : n <= -0.5 ? `-${formatINR(-n)}` : '₹0'}
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t border-line pt-2 text-[12.5px] text-muted">
                    {transfers.length === 0 ? (
                      <span>All settled — no pending payments.</span>
                    ) : (
                      transfers.map((t) => (
                        <p key={`${t.from}${t.to}`}>
                          {r.members.find((m) => m.id === t.from)?.name} → {r.members.find((m) => m.id === t.to)?.name}:{' '}
                          <b className="text-ink">{formatINR(t.amount)}</b>
                        </p>
                      ))
                    )}
                  </div>
                  <div className="border-t border-line pt-2">
                    <p className="mb-0.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted">Kharcha · Super Admin override</p>
                    {data.exp.length === 0 ? (
                      <p className="py-1 text-[12.5px] text-muted">No expenses in this room yet.</p>
                    ) : (
                      <div className="divide-y divide-line">
                        {[...data.exp]
                          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
                          .slice(0, 30)
                          .map((e) => (
                            <AdminExpense
                              key={e.id}
                              e={e}
                              payerName={r.members.find((m) => m.id === e.paidById)?.name ?? 'Unknown'}
                              onSave={(patch) =>
                                void source
                                  .updateExpense(r.roomCode, e.id, patch)
                                  .then(() => flash('Expense updated'))
                                  .catch(fail)
                              }
                              onDelete={() =>
                                void source
                                  .deleteExpense(r.roomCode, e.id)
                                  .then(() => flash('Expense deleted'))
                                  .catch(fail)
                              }
                            />
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[11.5px] text-muted">{data.set.length} settlements recorded</p>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line py-10 text-center text-[13.5px] text-muted">
            {rooms.length === 0 ? 'No rooms yet — create the first one.' : 'No rooms match your search.'}
          </p>
        )}
      </div>

      {creating && (
        <RoomFormSheet
          mode="create"
          rooms={rooms}
          users={users}
          adminUid={adminUid}
          onClose={() => setCreating(false)}
          onSave={async () => undefined}
          onCreate={async (v) => {
            const code = await source.createRoom(v);
            setCreating(false);
            flash(`Room ${v.name.trim()} successfully created with code ${code}`);
          }}
        />
      )}

      {editing && (
        <RoomFormSheet
          mode="edit"
          room={editing}
          rooms={rooms}
          users={users}
          adminUid={adminUid}
          onClose={() => setEditing(null)}
          onCreate={async () => undefined}
          onSave={async (room, v) => {
            const code = await source.saveRoom(room, v);
            setEditing(null);
            flash(code !== room.roomCode ? `Room updated · code changed to ${code}` : `Room ${v.name.trim()} updated`);
          }}
        />
      )}

      {deleting && (
        <DeleteRoomSheet
          room={deleting}
          expenseCount={(byRoom.get(deleting.roomCode) ?? EMPTY).exp.length}
          volume={totalOf((byRoom.get(deleting.roomCode) ?? EMPTY).exp)}
          onClose={() => setDeleting(null)}
          onConfirm={async (room) => {
            await source.deleteRoom(room);
            setDeleting(null);
            setOpenLedger((o) => (o === room.roomCode ? null : o));
            flash(`Room ${room.name} (${room.roomCode}) permanently deleted`);
          }}
        />
      )}
    </>
  );
}
