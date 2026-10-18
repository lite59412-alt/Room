import { useMemo, useState } from 'react';
import { Check, Crown, Plus, Trash2, TriangleAlert, Undo2, UserX, WandSparkles } from 'lucide-react';
import type { Profile, Room } from '../../types';
import type { RoomEdit } from '../../lib/adminRooms';
import { authErrorMessage, generateShortCode, normalizeCode, validateRoomCode } from '../../lib/roomService';
import { formatINR } from '../../lib/format';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../auth/Logo';
import { cn } from '../../utils/cn';

// Admin modals open above the full-screen admin panel
const LAYER = 'z-[70]';

const field =
  'w-full rounded-xl border border-line bg-surface2 px-3.5 py-3 text-[14.5px] outline-none placeholder:text-muted/70 focus:border-brand';
const label = 'mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted';

const cleanCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);

/* ------------------------------------------------------------------ */
/*  Create / Edit room                                                  */
/* ------------------------------------------------------------------ */
interface FormProps {
  mode: 'create' | 'edit';
  room?: Room;
  rooms: Room[];
  users: Profile[];
  adminUid: string;
  onClose: () => void;
  onCreate: (v: { name: string; code: string; owner: Profile }) => Promise<void>;
  onSave: (room: Room, v: RoomEdit) => Promise<void>;
}

export function RoomFormSheet({ mode, room, rooms, users, adminUid, onClose, onCreate, onSave }: FormProps) {
  const edit = mode === 'edit' && !!room;

  const taken = useMemo(
    () => new Set(rooms.filter((r) => r.roomCode !== room?.roomCode).map((r) => r.roomCode.toUpperCase())),
    [rooms, room],
  );

  // creator candidates: the admin first, then everyone else by name
  const people = useMemo(
    () => [...users].sort((a, b) => (a.uid === adminUid ? -1 : b.uid === adminUid ? 1 : a.displayName.localeCompare(b.displayName))),
    [users, adminUid],
  );

  const [name, setName] = useState(room?.name ?? '');
  const [code, setCode] = useState(room?.roomCode ?? generateShortCode(taken));
  const [ownerUid, setOwnerUid] = useState(people.find((p) => p.uid === adminUid)?.uid ?? people[0]?.uid ?? '');
  const [ownerId, setOwnerId] = useState(room?.createdBy ?? room?.members[0]?.id ?? '');
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const members = room?.members ?? [];
  const remaining = members.filter((m) => !removed.includes(m.id));
  const normalized = normalizeCode(code);
  const codeErr = code ? validateRoomCode(code) || (taken.has(normalized) ? 'This code is already used by another room.' : '') : 'Enter a room code.';
  const codeChanged = edit && normalized !== room!.roomCode;
  const ownerPerson = people.find((p) => p.uid === ownerUid);
  const canSubmit = !busy && !!name.trim() && !codeErr && (edit ? remaining.length > 0 && remaining.some((m) => m.id === ownerId) : !!ownerPerson);

  const submit = async () => {
    if (!canSubmit) return;
    setErr('');
    setBusy(true);
    try {
      if (edit) await onSave(room!, { name, code, ownerId, removeIds: removed });
      else await onCreate({ name, code, owner: ownerPerson! });
    } catch (e) {
      setErr(authErrorMessage(e));
      setBusy(false);
    }
  };

  const toggleRemove = (id: string) => setRemoved((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <Sheet
      open
      layer={LAYER}
      onClose={busy ? () => undefined : onClose}
      title={edit ? 'Edit Room' : 'Create New Room'}
      footer={
        <button
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3.5 text-[15.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,201,122,0.7)] active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? <Spinner size={18} /> : edit ? <Check size={19} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
          {busy ? (edit ? 'Saving…' : 'Creating…') : edit ? 'Save changes' : 'Create Room'}
        </button>
      }
    >
      <p className={label}>Room name</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Flat 302 Boys, PG Room 12"
        autoFocus={!edit}
        className={field}
        maxLength={60}
      />

      <p className={cn(label, 'mt-4')}>Room code</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(cleanCode(e.target.value))}
          placeholder="ROOM-7819"
          autoCapitalize="characters"
          autoCorrect="off"
          className={cn(field, 'font-bold tracking-widest', codeErr && code && 'border-danger/60')}
        />
        <button
          onClick={() => setCode(generateShortCode(taken))}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[color:var(--border-green)] bg-brandsoft px-3.5 text-[13px] font-bold text-brand active:scale-95"
        >
          <WandSparkles size={16} /> Auto
        </button>
      </div>
      <p className={cn('mt-1.5 text-[12px]', codeErr ? 'text-danger' : 'text-muted')}>
        {codeErr || (normalized !== code ? `Will be saved as ${normalized}` : 'Roommates join with this code. Must be unique.')}
      </p>

      {codeChanged && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2.5">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-[12.5px] leading-snug">
            Changing the code moves the whole ledger to <b>{normalized}</b> and re-links every member automatically. The old code{' '}
            <b>{room!.roomCode}</b> stops working.
          </p>
        </div>
      )}

      {!edit && (
        <>
          <p className={cn(label, 'mt-4')}>Creator / initial member</p>
          <select
            value={ownerUid}
            onChange={(e) => setOwnerUid(e.target.value)}
            className={cn(field, 'appearance-none')}
            aria-label="Initial member"
          >
            {people.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.displayName}
                {p.uid === adminUid ? ' (You · Admin)' : ''} — {p.email}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] leading-snug text-muted">
            They become the room owner and its first member. The room starts with an empty ledger
            {ownerPerson?.currentRoomCode ? ` (they’re already in ${ownerPerson.currentRoomCode}, so they’ll switch using the new code).` : ' and opens for them automatically.'}
          </p>
        </>
      )}

      {edit && (
        <>
          <p className={cn(label, 'mt-5')}>
            Members · {remaining.length}
            {removed.length > 0 && <span className="normal-case tracking-normal text-danger"> ({removed.length} to remove)</span>}
          </p>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {members.map((m) => {
              const gone = removed.includes(m.id);
              const isOwner = m.id === ownerId;
              return (
                <div key={m.id} className={cn('flex items-center gap-2.5 px-3 py-2.5', gone && 'bg-dangersoft')}>
                  <Avatar member={m} size={36} className={cn(gone && 'opacity-50')} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('flex items-center gap-1 truncate text-[14px] font-semibold', gone && 'line-through opacity-60')}>
                      {m.name}
                      {isOwner && !gone && (
                        <span className="flex items-center gap-0.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-500">
                          <Crown size={10} /> OWNER
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11.5px] text-muted">{m.email}</p>
                  </div>
                  {gone ? (
                    <button
                      onClick={() => toggleRemove(m.id)}
                      className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold active:scale-95"
                    >
                      <Undo2 size={13} /> Undo
                    </button>
                  ) : (
                    <>
                      {!isOwner && (
                        <button
                          onClick={() => setOwnerId(m.id)}
                          className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-400/10 px-2 py-1.5 text-[11.5px] font-semibold text-amber-500 active:scale-95"
                        >
                          <Crown size={12} /> Make owner
                        </button>
                      )}
                      <button
                        onClick={() => toggleRemove(m.id)}
                        disabled={isOwner || remaining.length <= 1}
                        aria-label={`Remove ${m.name}`}
                        title={isOwner ? 'Make someone else owner first' : 'Remove from room'}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/40 bg-dangersoft text-danger active:scale-90 disabled:opacity-30"
                      >
                        <UserX size={15} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-muted">
            Removed members are sent back to the room picker with an alert. The owner can’t be removed until another member is made owner. Removed
            members can rejoin with the code unless you change it.
          </p>
        </>
      )}

      {err && (
        <p role="alert" className="anim-fade mt-4 rounded-xl border border-danger/40 bg-dangersoft px-3.5 py-2.5 text-[13px] leading-snug text-danger">
          {err}
        </p>
      )}
      <div className="h-2" />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete room — two-step guard                                        */
/* ------------------------------------------------------------------ */
interface DeleteProps {
  room: Room;
  expenseCount: number;
  volume: number;
  onClose: () => void;
  onConfirm: (room: Room) => Promise<void>;
}

export function DeleteRoomSheet({ room, expenseCount, volume, onClose, onConfirm }: DeleteProps) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const match = typed.trim().toUpperCase() === room.roomCode.toUpperCase();

  const go = async () => {
    if (!match || busy) return;
    setErr('');
    setBusy(true);
    try {
      await onConfirm(room);
    } catch (e) {
      setErr(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      layer={LAYER}
      onClose={busy ? () => undefined : onClose}
      title="Delete Room"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-2xl border border-line bg-surface2 py-3.5 text-[15px] font-semibold active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void go()}
            disabled={!match || busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-danger py-3.5 text-[15px] font-bold text-white active:scale-[0.98] disabled:opacity-35"
          >
            {busy ? <Spinner size={17} /> : <Trash2 size={17} />} {busy ? 'Deleting…' : 'Confirm Delete'}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-dangersoft p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger">
          <TriangleAlert size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-snug">
            Are you sure you want to permanently delete {room.name} (Code: {room.roomCode})?
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-muted">
            All associated expenses, settlements and member links will be wiped. This cannot be undone.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { v: String(room.members.length), l: 'members' },
          { v: String(expenseCount), l: 'expenses' },
          { v: formatINR(volume), l: 'kharcha' },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-line bg-surface2 py-2.5">
            <p className="text-[15px] font-bold">{s.v}</p>
            <p className="text-[11.5px] text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      <p className={cn(label, 'mt-5')}>
        Type <span className="normal-case tracking-wide text-ink">{room.roomCode}</span> to confirm
      </p>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={room.roomCode}
        autoCapitalize="characters"
        autoCorrect="off"
        autoFocus
        className={cn(field, 'text-center font-bold tracking-widest', match && 'border-danger')}
      />
      <p className="mt-2 text-[12px] leading-snug text-muted">
        Anyone currently inside this room is sent back to the “Create / Join room” screen with the alert “This room was closed by Admin.”
      </p>
      {err && (
        <p role="alert" className="anim-fade mt-3 rounded-xl border border-danger/40 bg-dangersoft px-3.5 py-2.5 text-[13px] text-danger">
          {err}
        </p>
      )}
      <div className="h-2" />
    </Sheet>
  );
}
