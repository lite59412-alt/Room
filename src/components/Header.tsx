import { useState } from 'react';
import { Bell, Check, ChevronDown, Copy, Moon, Building2, ShieldCheck, Sun } from 'lucide-react';
import type { Room, SyncStatus } from '../types';
import { Avatar } from './ui/Avatar';
import { cn } from '../utils/cn';

interface Props {
  room: Room;
  status: SyncStatus;
  theme: 'dark' | 'light';
  unread: boolean;
  isOnline: (id: string) => boolean;
  onToggleTheme: () => void;
  onOpenRoom: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  /** Rendered only for the authorised admin email */
  onOpenAdmin?: () => void;
  meId: string;
}

export const SYNC_META: Record<SyncStatus, { label: string; color: string }> = {
  local: { label: 'Offline · will sync when back online', color: 'bg-amber-400' },
  connecting: { label: 'Connecting…', color: 'bg-sky-400' },
  syncing: { label: 'Syncing…', color: 'bg-sky-400' },
  synced: { label: 'Live · synced with roommates', color: 'bg-[#2ee58a]' },
  error: { label: 'Sync error · saved locally', color: 'bg-red-500' },
};

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function Header({ room, status, theme, unread, isOnline, onToggleTheme, onOpenRoom, onOpenNotifications, onOpenProfile, onOpenAdmin, meId }: Props) {
  const [copied, setCopied] = useState(false);
  const sync = SYNC_META[status];
  const dark = theme === 'dark';

  const copy = async () => {
    if (await copyText(room.roomCode)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-4">
      {/* Room chip */}
      <div className="flex min-w-0 items-center gap-2.5 rounded-[20px] border border-line bg-surface px-3 py-2.5 shadow-[var(--shadow-card)]">
        <button onClick={onOpenRoom} aria-label="Room settings" className="relative shrink-0 text-brand">
          <Building2 size={26} strokeWidth={1.6} />
          <span
            title={sync.label}
            className={cn('absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface', sync.color)}
          />
        </button>
        <div className="min-w-0">
          <button onClick={onOpenRoom} className="flex max-w-[132px] items-center gap-1.5 text-left">
            <span className="truncate text-[15.5px] font-semibold leading-tight">{room.name}</span>
            <ChevronDown size={16} className="shrink-0 text-muted" />
          </button>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-ink/90">
              {room.roomCode}
            </span>
            <button onClick={copy} aria-label="Copy room code" className="text-muted active:scale-90">
              {copied ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-2">
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            aria-label="Admin Panel"
            title="Admin Panel"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/60 bg-brandsoft text-brand shadow-[0_0_16px_rgba(34,201,122,0.65)] animate-pulse"
          >
            <ShieldCheck size={17} />
          </button>
        )}
        <button onClick={onOpenProfile} aria-label="Profile & roommates" className="flex items-center pl-1">
          {[...room.members].sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0)).slice(0, 3).map((m, i) => (
            <span key={m.id} className={cn(i > 0 && '-ml-3')} style={{ zIndex: 10 - i }}>
              <Avatar member={m} size={34} showDot online={isOnline(m.id)} ring="border-bg" />
            </span>
          ))}
        </button>
        <button onClick={onOpenNotifications} aria-label="Notifications" className="relative p-1.5 text-ink">
          <Bell size={24} strokeWidth={1.6} />
          {unread && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#2ee58a] ring-2 ring-bg" />}
        </button>
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1.5"
        >
          {dark ? <Sun size={17} className="text-amber-300" /> : <Moon size={17} className="text-sky" />}
          <span
            className={cn(
              'relative h-[22px] w-[38px] rounded-full transition-colors',
              dark ? 'bg-[#22c97a]' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all',
                dark ? 'left-[18px]' : 'left-[2px]',
              )}
            />
          </span>
        </button>
      </div>
    </header>
  );
}
