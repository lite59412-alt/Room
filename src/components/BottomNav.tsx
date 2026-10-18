import { ArrowLeftRight, Home, ListChecks, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '../utils/cn';

export type Tab = 'home' | 'activity' | 'settlements' | 'more';

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  onAdd: () => void;
  /** pending approvals waiting for you */
  badge?: number;
}

export function BottomNav({ tab, onTab, onAdd, badge = 0 }: Props) {
  const item = (key: Tab, label: string, Icon: typeof Home) => (
    <button
      key={key}
      onClick={() => onTab(key)}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 pt-1 text-[12.5px] font-medium transition-colors',
        tab === key ? 'text-brand' : 'text-muted',
      )}
    >
      <span className="relative">
        <Icon size={25} strokeWidth={tab === key ? 2.4 : 1.8} fill={key === 'home' && tab === key ? 'currentColor' : 'none'} />
        {key === 'settlements' && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-[var(--c-bg)]">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md">
      <div className="safe-bottom relative flex items-end rounded-t-[28px] border border-b-0 border-line bg-[color:var(--nav-bg)] px-1 pb-3 pt-3 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur">
        {item('home', 'Home', Home)}
        {item('activity', 'Activity', ListChecks)}
        <div className="flex flex-1 flex-col items-center gap-1 pt-1">
          <button
            onClick={onAdd}
            aria-label="Add kharcha"
            className="-mt-9 flex h-[56px] w-[56px] items-center justify-center rounded-full border-[5px] border-bg bg-gradient-to-b from-[#2fd790] to-[#12a870] text-white shadow-[0_8px_22px_-4px_rgba(34,201,122,0.75)] ring-1 ring-brand/40 active:scale-95"
          >
            <Plus size={30} strokeWidth={2.4} />
          </button>
          <span className="-mt-0.5 text-[12.5px] font-medium text-muted">Add</span>
        </div>
        {item('settlements', 'Settlements', ArrowLeftRight)}
        {item('more', 'More', MoreHorizontal)}
      </div>
    </nav>
  );
}
