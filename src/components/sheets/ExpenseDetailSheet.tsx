import { useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import type { ExpenseEntry, Member } from '../../types';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { CategoryBubble } from '../ExpenseRow';
import { categoryLabel } from '../../lib/categories';
import { memberName, perHead } from '../../lib/calc';
import { formatINR, formatTime, longDate } from '../../lib/format';

interface Props {
  expense: ExpenseEntry;
  members: Member[];
  meId: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** true only for the account that added this kharcha, or the Super Admin */
  canModify: boolean;
  ownerName: string;
}

export function ExpenseDetailSheet({ expense: e, members, meId, onClose, onEdit, onDelete, canModify, ownerName }: Props) {
  const [confirm, setConfirm] = useState(false);
  const each = perHead(e, members.length);
  const payer = members.find((m) => m.id === e.paidById);
  return (
    <Sheet
      open
      onClose={onClose}
      title="Kharcha Details"
      footer={
        !canModify ? (
          <p className="flex items-center justify-center gap-2 text-center text-[13px] leading-snug text-muted">
            <Lock size={15} className="shrink-0" />
            <span>
              Only <b className="text-ink">{ownerName}</b> (who added this) or the Super Admin can edit or delete it.
            </span>
          </p>
        ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface2 py-3.5 text-[15px] font-semibold active:scale-[0.98]"
          >
            <Pencil size={17} /> Edit
          </button>
          <button
            onClick={() => (confirm ? onDelete() : setConfirm(true))}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold active:scale-[0.98] ${
              confirm ? 'bg-danger text-white' : 'border border-danger/40 bg-dangersoft text-danger'
            }`}
          >
            <Trash2 size={17} /> {confirm ? 'Tap to confirm' : 'Delete'}
          </button>
        </div>
        )
      }
    >
      <div className="flex items-center gap-3.5">
        <CategoryBubble title={e.title} category={e.category} size={58} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[19px] font-bold leading-tight">{e.title}</p>
          <p className="text-[13px] text-muted">
            {categoryLabel(e.category)} · {longDate(e.date)}, {formatTime(e.time)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[color:var(--border-green)] bg-[image:var(--grad-green)] p-4">
        <p className="text-[12px] uppercase tracking-wider text-muted">Total</p>
        <p className="text-[32px] font-bold leading-tight">{formatINR(e.amount, true)}</p>
        <div className="mt-2 flex items-center gap-2 text-[13.5px] text-muted">
          {payer && <Avatar member={payer} size={22} />}
          Paid by <b className="text-sky">{memberName(members, e.paidById, meId)}</b> · {formatINR(each)} each ·{' '}
          {e.splitBetween.length} of {members.length}
        </div>
      </div>

      <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wider text-muted">Split breakdown</p>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {members.map((m) => {
          const inSplit = e.splitBetween.includes(m.id);
          const paid = m.id === e.paidById;
          const delta = (paid ? e.amount : 0) - (inSplit ? each : 0);
          return (
            <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar member={m} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold">{memberName(members, m.id, meId)}</p>
                <p className="text-[12px] text-muted">
                  {inSplit ? `Share ${formatINR(each)}` : 'Not part of this split'}
                  {paid ? ` · paid ${formatINR(e.amount)}` : ''}
                </p>
              </div>
              <span
                className={`text-[14px] font-bold ${delta > 0.4 ? 'text-brand' : delta < -0.4 ? 'text-danger' : 'text-muted'}`}
              >
                {delta > 0.4 ? `+${formatINR(delta)}` : delta < -0.4 ? `-${formatINR(-delta)}` : '₹0'}
              </span>
            </div>
          );
        })}
      </div>

      {e.note && (
        <>
          <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wider text-muted">Note</p>
          <p className="rounded-2xl border border-line bg-surface2 px-4 py-3 text-[14px]">{e.note}</p>
        </>
      )}
      <div className="h-2" />
    </Sheet>
  );
}
