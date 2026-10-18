import { useState, type ReactNode } from 'react';
import {
  Archive,
  Bell,
  ChevronDown,
  ChevronRight,
  Cloud,
  LogOut,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
} from 'lucide-react';
import type { TabProps } from '../../lib/view';
import { Avatar } from '../ui/Avatar';
import { SYNC_META } from '../Header';
import { buildWhatsAppText, isPending, whatsappUrl } from '../../lib/calc';
import { dayLabel, formatINR } from '../../lib/format';
import { cn } from '../../utils/cn';

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-3 overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-card)]', className)}>
      {children}
    </div>
  );
}

function Row({
  icon,
  title,
  sub,
  onClick,
  right,
  danger,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  onClick?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface2">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          danger ? 'bg-dangersoft text-danger' : 'bg-brandsoft text-brand',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[15px] font-semibold', danger && 'text-danger')}>{title}</span>
        {sub && <span className="block truncate text-[12.5px] text-muted">{sub}</span>}
      </span>
      {right ?? <ChevronRight size={18} className="text-muted" />}
    </button>
  );
}

export function MoreTab({ store, view, ui }: TabProps) {
  const { room, archives } = store.data;
  const me = room.members.find((m) => m.id === store.meId);
  const [confirm, setConfirm] = useState<'archive' | 'clear' | null>(null);
  const [openArchive, setOpenArchive] = useState<string | null>(null);
  const sync = SYNC_META[store.status];
  const pendingCount = store.data.settlements.filter(isPending).length;
  const push = ui.push;
  const pushSub =
    push.state === 'unsupported'
      ? 'Not supported on this browser (on iPhone: Add to Home Screen first)'
      : push.state === 'denied'
        ? 'Blocked — allow notifications in browser settings'
        : push.state === 'default'
          ? 'Off — tap to enable'
          : push.remote === 'active'
            ? 'On · works even when the app is closed'
            : push.remote === 'no-vapid'
              ? 'On for this device · background push server not configured'
              : push.remote === 'local'
                ? 'On · this device only'
                : push.remote === 'no-sw'
                  ? 'Service worker unavailable on this host'
                  : push.remote === 'error'
                    ? 'Enabled, but registering for push failed'
                    : 'Setting up…';

  return (
    <div className="px-4">
      <h1 className="mt-5 px-1 text-[26px] font-bold tracking-tight">More</h1>
      <p className="px-1 text-[13.5px] text-muted">Account, room settings and month-end.</p>

      {/* Account */}
      {me && (
        <button
          onClick={ui.openProfile}
          className="mt-4 flex w-full items-center gap-3.5 rounded-[22px] border border-[color:var(--border-green)] bg-[image:var(--grad-green)] p-4 text-left shadow-[var(--shadow-card)] active:scale-[0.99]"
        >
          <Avatar member={me} size={56} ring="border-brand/70" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold leading-tight">{store.displayName || me.name}</span>
            <span className="block truncate text-[12.5px] text-muted">{me.email}</span>
            <span className="mt-0.5 block truncate text-[12px] font-medium text-brand">{me.upiId || 'Add your UPI ID'}</span>
          </span>
          <ChevronRight size={18} className="text-muted" />
        </button>
      )}

      {ui.openAdmin && (
        <button
          onClick={ui.openAdmin}
          className="mt-3 flex w-full items-center gap-3 rounded-[22px] border border-brand/60 bg-brandsoft px-4 py-3.5 text-left shadow-[0_0_24px_rgba(34,201,122,0.4)] active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-brand">
            <ShieldCheck size={20} />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-bold text-brand">Admin Panel</span>
            <span className="block text-[12.5px] text-muted">Rooms, users, broadcast & maintenance</span>
          </span>
          <ChevronRight size={18} className="text-brand" />
        </button>
      )}

      <Card>
        <div className="divide-y divide-line">
          <Row
            icon={<Bell size={19} />}
            title="Phone notifications"
            sub={pushSub}
            onClick={async () => {
              if (push.state === 'default') {
                const p = await push.enable();
                ui.notify(p === 'granted' ? 'Notifications enabled 🔔' : 'Notifications not enabled');
              } else if (push.state === 'granted') {
                ui.notify((await push.test()) ? 'Test notification sent — check your status bar' : 'Could not show a notification');
              }
            }}
            right={
              <span className="text-[13px] font-semibold text-sky">
                {push.state === 'default' ? 'Enable' : push.state === 'granted' ? 'Send test' : ''}
              </span>
            }
          />
          <Row icon={<Users size={19} />} title="Room & Roommates" sub={`${room.name} · ${room.roomCode}`} onClick={ui.openRoom} />
          <Row
            icon={store.theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}
            title="Appearance"
            sub={store.theme === 'dark' ? 'Dark mode' : 'Light mode'}
            onClick={store.toggleTheme}
            right={<span className="text-[13px] font-semibold text-sky">Switch</span>}
          />
          <a
            href={whatsappUrl(buildWhatsAppText(store.data))}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
              <MessageCircle size={19} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold">Share summary on WhatsApp</span>
              <span className="block text-[12.5px] text-muted">One tap group message</span>
            </span>
            <ChevronRight size={18} className="text-muted" />
          </a>
          <Row
            icon={<Cloud size={19} />}
            title="Live sync"
            sub={sync.label}
            right={<span className={cn('h-2.5 w-2.5 rounded-full', sync.color)} />}
          />
        </div>
      </Card>

      {/* Month end */}
      <h3 className="mt-6 px-1 text-[15px] font-semibold">Month-end</h3>
      <Card className="p-4">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Save this month’s ledger ({formatINR(view.total)} across {store.data.expenses.length} kharcha) to history and
          reset every balance to ₹0 for the next month.
        </p>
        {confirm === 'archive' ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirm(null)} className="rounded-xl border border-line bg-surface2 py-3 text-[14px] font-semibold">
              Cancel
            </button>
            <button
              onClick={() => {
                store.archiveMonth();
                setConfirm(null);
                ui.notify('Month archived · balances reset');
              }}
              className="rounded-xl bg-brand py-3 text-[14px] font-bold text-white"
            >
              Yes, archive
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm('archive')}
            disabled={store.data.expenses.length === 0 || pendingCount > 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--border-green)] bg-brandsoft py-3 text-[14.5px] font-bold text-brand disabled:opacity-40"
          >
            <Archive size={18} /> Archive Month & Reset
          </button>
        )}
        {pendingCount > 0 && (
          <p className="mt-2 text-[12px] text-amber-500">Resolve the {pendingCount} pending settlement{pendingCount > 1 ? 's' : ''} first (receiver must approve or reject).</p>
        )}
      </Card>

      {archives.length > 0 && (
        <>
          <h3 className="mt-6 px-1 text-[15px] font-semibold">Past months</h3>
          <Card>
            <div className="divide-y divide-line">
              {archives.map((a) => {
                const open = openArchive === a.id;
                return (
                  <div key={a.id}>
                    <button onClick={() => setOpenArchive(open ? null : a.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                      <span className="flex-1">
                        <span className="block text-[15px] font-semibold">{a.label}</span>
                        <span className="block text-[12.5px] text-muted">
                          Archived {dayLabel(new Date(a.archivedAt).toISOString().slice(0, 10))} · {a.expenses?.length ?? 0} kharcha
                        </span>
                      </span>
                      <span className="text-[15px] font-bold">{formatINR(a.total)}</span>
                      <ChevronDown size={18} className={cn('text-muted transition', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <div className="space-y-1.5 bg-surface2 px-4 py-3 text-[13.5px]">
                        <p className="text-muted">Per person: {formatINR(a.perPerson)}</p>
                        {a.members.map((m) => (
                          <div key={m.id} className="flex justify-between">
                            <span>{m.name}</span>
                            <b>{formatINR(a.spentByMember?.[m.id] ?? 0)}</b>
                          </div>
                        ))}
                        <p className="pt-1 text-muted">{a.settlements?.length ?? 0} settlement(s) recorded</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* Danger zone */}
      <h3 className="mt-6 px-1 text-[15px] font-semibold">Account & data</h3>
      <Card>
        <div className="divide-y divide-line">
          {store.isAdmin &&
            (confirm === 'clear' ? (
              <div className="flex items-center gap-2 bg-dangersoft px-4 py-3">
                <span className="flex-1 text-[13.5px] font-medium">Permanently delete ALL data in this room?</span>
                <button onClick={() => setConfirm(null)} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold">
                  No
                </button>
                <button
                  onClick={() => {
                    store.clearAll();
                    setConfirm(null);
                    ui.notify('All data cleared');
                  }}
                  className="rounded-lg bg-danger px-3 py-1.5 text-[13px] font-bold text-white"
                >
                  Yes
                </button>
              </div>
            ) : (
              <Row danger icon={<Trash2 size={18} />} title="Clear all data (Super Admin)" sub="Permanently delete every entry in this room" onClick={() => setConfirm('clear')} />
            ))}
          <Row
            danger
            icon={<LogOut size={18} />}
            title="Sign out"
            sub={me?.email}
            onClick={ui.signOut}
          />
        </div>
      </Card>

      <p className="mt-6 text-center text-[12px] text-muted">RoomieKhata · made for bachelor rooms 🏠</p>
    </div>
  );
}
