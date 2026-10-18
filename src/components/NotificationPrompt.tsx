import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import type { PushApi } from '../hooks/usePush';

const KEY = 'rk.notifPromptDismissed';

/** Soft opt-in shown as soon as the dashboard opens (a tap is required by iOS / strict browsers). */
export function NotificationPrompt({ push, notify }: { push: PushApi; notify: (m: string) => void }) {
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(KEY) === '1');
  if (push.state !== 'default' || hidden) return null;

  return (
    <div className="anim-fade mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-[color:var(--border-green)] bg-surface px-3.5 py-3 shadow-[var(--shadow-card)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand">
        <BellRing size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-tight">Turn on phone notifications</p>
        <p className="text-[12px] leading-snug text-muted">New kharcha & settlement alerts — even when the app is closed.</p>
      </div>
      <button
        disabled={push.busy}
        onClick={async () => {
          const p = await push.enable();
          notify(
            p === 'granted'
              ? 'Notifications enabled 🔔'
              : p === 'denied'
                ? 'Notifications blocked — enable them in your browser settings'
                : 'Notifications are not available here',
          );
        }}
        className="shrink-0 rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
      >
        Allow
      </button>
      <button
        aria-label="Not now"
        onClick={() => {
          sessionStorage.setItem(KEY, '1');
          setHidden(true);
        }}
        className="shrink-0 text-muted active:scale-90"
      >
        <X size={17} />
      </button>
    </div>
  );
}
