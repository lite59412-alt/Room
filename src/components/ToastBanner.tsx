import { useEffect, useState } from 'react';
import { Radio, X } from 'lucide-react';
import type { ToastInfo } from '../types';
import { formatINR } from '../lib/format';

function ago(at: number, now: number) {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 45) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} hr ago`;
}

export function ToastBanner({ toast, onClose }: { toast: ToastInfo | null; onClose: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!toast) return;
    setNow(Date.now());
    const hide = setTimeout(onClose, 9000);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearTimeout(hide);
      clearInterval(tick);
    };
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div key={toast.id} className="anim-toast pointer-events-none relative z-20 -mb-5 mt-3 flex justify-center px-4">
      <div className="pointer-events-auto flex w-[90%] items-center gap-2.5 rounded-2xl border border-[color:var(--border-green)] bg-surface px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgba(34,201,122,0.35)]">
        <Radio size={18} className="shrink-0 text-brand" />
        <p className="min-w-0 flex-1 truncate text-[13px] leading-tight text-ink">
          <b className="font-semibold">{toast.who}</b> added <b className="font-semibold">{formatINR(toast.amount)}</b> for{' '}
          <b className="font-semibold text-brand">{toast.title}</b>
          <span className="text-muted"> - {ago(toast.at, now)}</span>
        </p>
        <button onClick={onClose} aria-label="Dismiss" className="shrink-0 text-muted active:scale-90">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
