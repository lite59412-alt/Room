import { useMemo, useState } from 'react';
import { Inbox, Search } from 'lucide-react';
import type { Category } from '../../types';
import type { TabProps } from '../../lib/view';
import { ExpenseRow } from '../ExpenseRow';
import { CATEGORIES } from '../../lib/categories';
import { dayLabel, formatINR } from '../../lib/format';
import { cn } from '../../utils/cn';

export function ActivityTab({ store, view, ui }: TabProps) {
  const { members } = store.data.room;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = view.sorted.filter(
      (e) =>
        (cat === 'all' || e.category === cat) &&
        (!needle ||
          e.title.toLowerCase().includes(needle) ||
          (e.note ?? '').toLowerCase().includes(needle) ||
          members.find((m) => m.id === e.paidById)?.name.toLowerCase().includes(needle)),
    );
    const map = new Map<string, typeof list>();
    list.forEach((e) => map.set(e.date, [...(map.get(e.date) ?? []), e]));
    return [...map.entries()];
  }, [view.sorted, q, cat, members]);

  return (
    <div className="px-4">
      <h1 className="mt-5 px-1 text-[26px] font-bold tracking-tight">Activity</h1>
      <p className="px-1 text-[13.5px] text-muted">Every kharcha, newest first. Tap one to view, edit or delete.</p>

      <div className="relative mt-4">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search item, note or person"
          className="w-full rounded-2xl border border-line bg-surface py-3 pl-10 pr-4 text-[14.5px] outline-none placeholder:text-muted/70 focus:border-brand"
        />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {[{ key: 'all' as const, label: 'All', emoji: '✨' }, ...CATEGORIES].map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium',
              cat === c.key ? 'border-brand bg-brandsoft text-brand' : 'border-line bg-surface text-muted',
            )}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="mt-10 flex flex-col items-center text-center text-muted">
          <Inbox size={34} />
          <p className="mt-2 text-sm">Nothing found.</p>
        </div>
      )}

      {groups.map(([date, items]) => (
        <section key={date} className="mt-5">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-[15px] font-semibold">{dayLabel(date)}</h3>
            <span className="text-[12.5px] text-muted">{formatINR(items.reduce((s, e) => s + e.amount, 0))}</span>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-card)]">
            {items.map((e) => (
              <ExpenseRow key={e.id} expense={e} members={members} meId={store.meId} onOpen={ui.openExpense} showDay={false} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
