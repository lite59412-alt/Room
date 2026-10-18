import { MoreHorizontal } from 'lucide-react';
import type { ExpenseEntry, Member } from '../types';
import { lookFor } from '../lib/categories';
import { memberName, perHead } from '../lib/calc';
import { dateTimeLabel, formatINR, formatTime } from '../lib/format';

export function CategoryBubble({ title, category, size = 50 }: { title: string; category: ExpenseEntry['category']; size?: number }) {
  const look = lookFor(title, category);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: `${look.tint}88`,
        background: `radial-gradient(circle at 30% 25%, ${look.tint}40, ${look.tint}12)`,
        fontSize: size * 0.5,
      }}
    >
      {look.emoji}
    </span>
  );
}

interface Props {
  expense: ExpenseEntry;
  members: Member[];
  meId: string;
  onOpen: (e: ExpenseEntry) => void;
  showDay?: boolean;
}

export function ExpenseRow({ expense: e, members, meId, onOpen, showDay = true }: Props) {
  const look = lookFor(e.title, e.category);
  const n = e.splitBetween.length;
  const payer = memberName(members, e.paidById, meId);
  const full = n === members.length;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(e)}
      onKeyDown={(ev) => ev.key === 'Enter' && onOpen(e)}
      className="flex items-center gap-3 px-3.5 py-3 text-left transition active:bg-surface2"
    >
      <CategoryBubble title={e.title} category={e.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold leading-tight">
          {e.title} {look.tail && <span className="text-[15px]">{look.tail}</span>}
        </p>
        <p className="mt-0.5 truncate text-[13.5px] text-muted">
          Paid by <span className="font-medium text-sky">{payer}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
          <span className="truncate">{showDay ? dateTimeLabel(e.date, e.time) : formatTime(e.time)}</span>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${
              full ? 'bg-skysoft text-sky' : 'bg-amber-400/15 text-amber-500'
            }`}
          >
            {n} of {members.length}
          </span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[17px] font-bold leading-tight">{formatINR(e.amount)}</p>
        <p className="mt-0.5 text-[13px] text-muted">{formatINR(perHead(e, members.length))} each</p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink/80">
        <MoreHorizontal size={20} />
      </span>
    </div>
  );
}
