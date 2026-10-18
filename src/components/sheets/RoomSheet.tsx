import { useState } from 'react';
import { Check, Copy, DoorOpen, LogIn, LogOut, MessageCircle } from 'lucide-react';
import type { RoomStore } from '../../hooks/useRoomData';
import { Sheet } from '../ui/Sheet';
import { SYNC_META, copyText } from '../Header';
import { authErrorMessage } from '../../lib/roomService';
import { whatsappUrl } from '../../lib/calc';
import { cn } from '../../utils/cn';

const field =
  'w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-[14.5px] outline-none placeholder:text-muted/70 focus:border-brand';
const label = 'mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted';

interface Props {
  store: RoomStore;
  onClose: () => void;
  notify: (m: string) => void;
  onJoin: (code: string) => Promise<void>;
  onLeave: () => Promise<void>;
}

export function RoomSheet({ store, onClose, notify, onJoin, onLeave }: Props) {
  const { room } = store.data;
  const [name, setName] = useState(room.name);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const sync = SYNC_META[store.status];

  const invite = `Join my room "${room.name}" on RoomieKhata 🏠\nRoom code: *${room.roomCode}*\nSign in with Google, tap "Join Room via Code" and enter the code.`;

  const run = async (fn: () => Promise<void>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Room"
      footer={
        <button
          disabled={!name.trim() || name.trim() === room.name || store.frozen}
          onClick={() => {
            store.renameRoom(name);
            notify('Room renamed');
            onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3.5 text-[15.5px] font-bold text-white disabled:opacity-40 active:scale-[0.98]"
        >
          <Check size={19} strokeWidth={3} /> Save room name
        </button>
      }
    >
      <p className={label}>Room name</p>
      <input value={name} onChange={(e) => setName(e.target.value)} className={field} />

      <p className={cn(label, 'mt-4')}>Room code</p>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface2 px-3.5 py-2.5">
        <span className="flex-1 text-[16px] font-bold tracking-widest">{room.roomCode}</span>
        <button
          aria-label="Copy room code"
          className="text-muted"
          onClick={async () => {
            if (await copyText(room.roomCode)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }}
        >
          {copied ? <Check size={18} className="text-brand" /> : <Copy size={18} />}
        </button>
      </div>
      <a
        href={whatsappUrl(invite)}
        target="_blank"
        rel="noreferrer"
        className="mt-2.5 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-[14px] font-bold text-white active:scale-[0.98]"
      >
        <MessageCircle size={17} /> Invite roommates on WhatsApp
      </a>
      <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-muted">
        <span className={cn('h-2 w-2 rounded-full', sync.color)} /> {sync.label}
      </p>

      <p className={cn(label, 'mt-5')}>Switch to another room</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ROOM-482913"
          className={field}
          autoCapitalize="characters"
        />
        <button
          disabled={code.trim().length < 3 || busy}
          onClick={() => run(() => onJoin(code))}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-[14px] font-bold text-white disabled:opacity-40"
        >
          <LogIn size={16} /> Join
        </button>
      </div>
      {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}

      <p className={cn(label, 'mt-5')}>Leave room</p>
      {confirmLeave ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setConfirmLeave(false)} className="rounded-xl border border-line bg-surface2 py-2.5 text-[14px] font-semibold">
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => run(onLeave)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-danger py-2.5 text-[14px] font-bold text-white"
          >
            <LogOut size={16} /> Yes, leave
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmLeave(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/40 bg-dangersoft py-2.5 text-[14px] font-semibold text-danger"
        >
          <DoorOpen size={17} /> Leave this room
        </button>
      )}
      <p className="mt-1.5 text-[12px] text-muted">Your past kharcha stays in the room for the others.</p>
      <div className="h-2" />
    </Sheet>
  );
}
