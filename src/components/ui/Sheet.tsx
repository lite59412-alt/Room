import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** stacking layer, e.g. 'z-[70]' for modals opened on top of the admin panel */
  layer?: string;
}

/** Bottom sheet that slides up inside the mobile column */
export function Sheet({ open, onClose, title, children, footer, className, layer = 'z-50' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={cn('fixed inset-0 flex items-end justify-center', layer)}>
      <div className="anim-fade absolute inset-0 backdrop-blur-[2px]" style={{ background: 'var(--overlay)' }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'anim-sheet relative flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-[28px] border border-b-0 border-line bg-surface shadow-2xl',
          className,
        )}
      >
        <div className="flex shrink-0 flex-col items-center pt-2.5">
          <span className="h-1.5 w-11 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-muted active:scale-95"
          >
            <X size={18} />
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom shrink-0 border-t border-line bg-surface px-5 pb-4 pt-3">{footer}</div>}
      </div>
    </div>
  );
}
