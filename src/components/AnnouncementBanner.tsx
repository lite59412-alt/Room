import { Megaphone, TriangleAlert, Wrench, X } from 'lucide-react';
import type { Announcement } from '../types';
import { cn } from '../utils/cn';

const TONE = {
  info: 'border-sky/40 bg-skysoft text-sky',
  warning: 'border-amber-400/40 bg-amber-400/15 text-amber-500',
  success: 'border-brand/40 bg-brandsoft text-brand',
} as const;

export function AnnouncementBanner({ a, onDismiss }: { a: Announcement; onDismiss: () => void }) {
  const Icon = a.type === 'warning' ? TriangleAlert : Megaphone;
  return (
    <div className={cn('anim-fade mx-4 mt-3 flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5', TONE[a.type])}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink">{a.text}</p>
      <button onClick={onDismiss} aria-label="Dismiss announcement" className="shrink-0 text-muted active:scale-90">
        <X size={17} />
      </button>
    </div>
  );
}

export function MaintenanceBanner({ message, adminBypass }: { message?: string; adminBypass: boolean }) {
  return (
    <div className="anim-fade mx-4 mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-400/15 px-3.5 py-2.5">
      <Wrench size={18} className="mt-0.5 shrink-0 text-amber-500" />
      <p className="text-[13px] leading-snug">
        <b className="text-amber-500">Maintenance mode</b> — editing is paused.{' '}
        <span className="text-muted">{message || 'We’ll be back shortly.'}</span>
        {adminBypass && <span className="text-muted"> (You can still edit as admin.)</span>}
      </p>
    </div>
  );
}
