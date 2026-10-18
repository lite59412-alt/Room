import { useState } from 'react';
import { Check, Cloud, Crown, LogOut, ShieldCheck } from 'lucide-react';
import type { Member } from '../../types';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { SYNC_META } from '../Header';
import type { SyncStatus } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  me: Member;
  members: Member[];
  roomName: string;
  roomCode: string;
  isOnline: (id: string) => boolean;
  onClose: () => void;
  onSave: (patch: { displayName: string; upiId: string; phone: string }) => void;
  onSignOut: () => void;
  onOpenAdmin?: () => void;
  status: SyncStatus;
  ownerId?: string;
  /** Google account email is verified by Firebase Auth */
  verified: boolean;
}

const field =
  'w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-[14.5px] outline-none placeholder:text-muted/70 focus:border-brand';
const label = 'mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted';
const UPI_RE = /^[\w.\-]{2,}@[\w.\-]{2,}$/;

export function ProfileSheet({ me, members, roomName, roomCode, isOnline, onClose, onSave, onSignOut, onOpenAdmin, status, verified, ownerId }: Props) {
  const sync = SYNC_META[status];
  const [name, setName] = useState(me.name);
  const [upi, setUpi] = useState(me.upiId ?? '');
  const [phone, setPhone] = useState(me.phone ?? '');
  const [err, setErr] = useState('');
  const dirty = name !== me.name || upi !== (me.upiId ?? '') || phone !== (me.phone ?? '');

  const save = () => {
    if (!name.trim()) return setErr('Name cannot be empty.');
    if (upi.trim() && !UPI_RE.test(upi.trim())) return setErr('That UPI ID looks invalid (example: name@okhdfcbank).');
    onSave({ displayName: name.trim(), upiId: upi.trim(), phone: phone.trim() });
    setErr('');
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Profile"
      footer={
        dirty ? (
          <button
            onClick={save}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3.5 text-[15.5px] font-bold text-white active:scale-[0.98]"
          >
            <Check size={19} strokeWidth={3} /> Save profile
          </button>
        ) : (
          <button
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/40 bg-dangersoft py-3.5 text-[15.5px] font-bold text-danger active:scale-[0.98]"
          >
            <LogOut size={19} /> Sign Out
          </button>
        )
      }
    >
      <div className="flex items-center gap-4 rounded-3xl border border-[color:var(--border-green)] bg-[image:var(--grad-green)] p-4">
        <Avatar member={me} size={68} ring="border-brand/70" />
        <div className="min-w-0">
          <p className="truncate text-[19px] font-bold leading-tight">{me.name}</p>
          <p className="truncate text-[13px] text-muted">{me.email}</p>
          <p className="mt-1 truncate text-[12px] font-medium text-brand">
            {roomName} · {roomCode}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-line bg-surface2 px-3.5 py-2.5">
        <Cloud size={17} className="shrink-0 text-brand" />
        <span className="min-w-0 flex-1 text-[13px] font-medium">
          {status === 'synced' ? 'Verified cloud sync' : 'Cloud sync'}
          <span className="block text-[12px] font-normal text-muted">
            {verified ? 'Google account verified · ' : ''}
            {sync.label}
          </span>
        </span>
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', sync.color)} />
      </div>

      <p className={cn(label, 'mt-5')}>Display name</p>
      <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div>
          <p className={label}>UPI ID</p>
          <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" autoCapitalize="none" className={field} />
        </div>
        <div>
          <p className={label}>Phone</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Optional" className={field} />
        </div>
      </div>
      {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}

      {onOpenAdmin && (
        <button
          onClick={onOpenAdmin}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/60 bg-brandsoft py-3.5 text-[15px] font-bold text-brand shadow-[0_0_22px_rgba(34,201,122,0.45)] active:scale-[0.98]"
        >
          <ShieldCheck size={19} /> Open Admin Panel
        </button>
      )}

      <p className={cn(label, 'mt-6')}>Roommates · {members.length}</p>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
            <Avatar member={m} size={38} showDot online={isOnline(m.id)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold">
                {m.name} {m.id === me.id && <span className="text-[12px] font-medium text-brand">(You)</span>}
                {m.id === ownerId && <Crown size={12} className="ml-1 inline -translate-y-px text-amber-500" aria-label="Room owner" />}
              </p>
              <p className="truncate text-[12px] text-muted">{m.upiId || 'No UPI ID yet'}</p>
            </div>
            <span className={cn('text-[11.5px] font-medium', isOnline(m.id) ? 'text-brand' : 'text-muted')}>
              {isOnline(m.id) ? 'Online' : 'Away'}
            </span>
          </div>
        ))}
      </div>
      <div className="h-2" />
    </Sheet>
  );
}
