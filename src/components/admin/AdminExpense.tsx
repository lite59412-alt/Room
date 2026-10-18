import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { ExpenseEntry } from '../../types';
import { formatINR } from '../../lib/format';
import { cn } from '../../utils/cn';

/** One expense row with Super-Admin override: edit title/amount or delete */
export function AdminExpense({
  e,
  payerName,
  onSave,
  onDelete,
}: {
  e: ExpenseEntry;
  payerName: string;
  onSave: (patch: { title: string; amount: number }) => void;
  onDelete: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(e.title);
  const [amount, setAmount] = useState(String(e.amount));
  const [confirm, setConfirm] = useState(false);
  const input = 'min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-brand';
  if (edit) {
    const amt = parseFloat(amount) || 0;
    return (
      <div className="flex items-center gap-1.5 py-1.5">
        <input value={title} onChange={(ev) => setTitle(ev.target.value)} className={cn(input, 'flex-1')} />
        <input value={amount} onChange={(ev) => setAmount(ev.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className={cn(input, 'w-20')} />
        <button
          aria-label="Save"
          disabled={!title.trim() || amt <= 0}
          onClick={() => {
            onSave({ title: title.trim(), amount: amt });
            setEdit(false);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-40"
        >
          <Check size={16} strokeWidth={3} />
        </button>
        <button aria-label="Cancel" onClick={() => setEdit(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted">
          <X size={16} />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold">{e.title}</p>
        <p className="truncate text-[11.5px] text-muted">
          {payerName} · {e.date}
        </p>
      </div>
      <span className="text-[13.5px] font-bold">{formatINR(e.amount)}</span>
      <button aria-label="Edit expense" onClick={() => setEdit(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted active:scale-90">
        <Pencil size={14} />
      </button>
      <button
        aria-label="Delete expense"
        onClick={() => (confirm ? onDelete() : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        className={cn(
          'flex h-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold active:scale-90',
          confirm ? 'border-danger bg-danger text-white' : 'w-8 border-danger/40 bg-dangersoft text-danger',
        )}
      >
        {confirm ? 'Sure?' : <Trash2 size={14} />}
      </button>
    </div>
  );
}
