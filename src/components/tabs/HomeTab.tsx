import { ChevronRight, Inbox } from 'lucide-react';
import type { TabProps } from '../../lib/view';
import { SummaryCards } from '../SummaryCards';
import { MemberCards } from '../MemberCards';
import { SettleCard } from '../SettleCard';
import { ExpenseRow } from '../ExpenseRow';
import { PendingSettlements } from '../PendingSettlements';

export function HomeTab({ store, view, ui }: TabProps) {
  const { members } = store.data.room;
  const recent = view.sorted.slice(0, 3);
  return (
    <>
      <SummaryCards total={view.total} share={view.share} memberCount={members.length} daily={view.daily} />
      <MemberCards
        members={members}
        meId={store.meId}
        spent={view.spent}
        net={view.net}
        isOnline={store.isOnline}
        onSelect={() => ui.goTab('settlements')}
      />
      <div className="mx-4 mt-3.5 empty:hidden">
        <PendingSettlements store={store} notify={ui.notify} mode="outgoing" />
      </div>
      <SettleCard transfers={view.transfers} members={members} meId={store.meId} onPay={ui.openPay} />

      <div className="mt-5 flex items-center justify-between px-5">
        <h2 className="text-[19px] font-semibold tracking-tight">Recent Activity</h2>
        <button onClick={() => ui.goTab('activity')} className="flex items-center gap-0.5 text-[14.5px] font-medium text-sky">
          View All <ChevronRight size={17} />
        </button>
      </div>
      <section className="mx-4 mt-2.5 divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-card)]">
        {recent.length === 0 && (
          <div className="flex flex-col items-center px-6 py-9 text-center text-muted">
            <Inbox size={30} />
            <p className="mt-2 text-sm">No kharcha yet. Tap “Add Kharcha” to start.</p>
          </div>
        )}
        {recent.map((e) => (
          <ExpenseRow key={e.id} expense={e} members={members} meId={store.meId} onOpen={ui.openExpense} />
        ))}
      </section>
    </>
  );
}
