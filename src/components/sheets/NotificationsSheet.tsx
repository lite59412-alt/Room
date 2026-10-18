import type { ReactNode } from 'react';
import { BellOff } from 'lucide-react';
import type { ExpenseEntry, Member, SettlementRecord } from '../../types';
import { Sheet } from '../ui/Sheet';
import { CategoryBubble } from '../ExpenseRow';
import { memberName } from '../../lib/calc';
import { dateTimeLabel, formatINR } from '../../lib/format';

interface Props {
  expenses: ExpenseEntry[];
  settlements: SettlementRecord[];
  members: Member[];
  meId: string;
  onClose: () => void;
}

export function NotificationsSheet({ expenses, settlements, members, meId, onClose }: Props) {
  type Item = { id: string; key: number; node: ReactNode };

  const derived: Item[] = [
    ...expenses.map((e) => ({
      id: e.id,
      key: e.createdAt ?? 0,
      node: (
        <div className="flex items-center gap-3 py-3">
          <CategoryBubble title={e.title} category={e.category} size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-snug">
              <b>{memberName(members, e.paidById, meId)}</b> added <b>{formatINR(e.amount)}</b> for <b className="text-brand">{e.title}</b>
            </p>
            <p className="text-[12px] text-muted">{dateTimeLabel(e.date, e.time)}</p>
          </div>
        </div>
      ),
    })),
    ...settlements.map((s) => ({
      id: s.id,
      key: s.createdAt ?? 0,
      node: (
        <div className="flex items-center gap-3 py-3">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-brandsoft text-lg">
            {s.status === 'pending_receiver_approval' ? '⏳' : s.status === 'rejected' ? '🚫' : '🤝'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-snug">
              <b>{memberName(members, s.fromMemberId, meId)}</b>{' '}
              {s.status === 'pending_receiver_approval' ? 'requested settlement of' : s.status === 'rejected' ? 'had a rejected claim of' : 'settled'}{' '}
              <b>{formatINR(s.amount)}</b> with <b>{memberName(members, s.toMemberId, meId)}</b> via {s.paymentMethod}
            </p>
            <p className="text-[12px] text-muted">{dateTimeLabel(s.date, s.time ?? '00:00')}</p>
          </div>
        </div>
      ),
    })),
  ];

  const items = derived.sort((a, b) => b.key - a.key).slice(0, 25);

  return (
    <Sheet open onClose={onClose} title="Notifications">
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-muted">
          <BellOff size={34} />
          <p className="mt-2 text-sm">Nothing new yet</p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {items.map((i) => (
            <div key={i.id}>{i.node}</div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
