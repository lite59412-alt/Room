import { useMemo, useState } from 'react';
import { Check, Lock, Users } from 'lucide-react';
import type { Category, ExpenseEntry, Member } from '../../types';
import type { NewExpense } from '../../hooks/useRoomData';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { CATEGORIES, QUICK_TITLES } from '../../lib/categories';
import { formatINR, toDateStr, toTimeStr } from '../../lib/format';
import { cn } from '../../utils/cn';

interface Props {
  members: Member[];
  meId: string;
  editing?: ExpenseEntry | null;
  onClose: () => void;
  onSave: (input: NewExpense, editingId?: string) => void;
}

const label = 'mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted';
const field =
  'w-full rounded-2xl border border-line bg-surface2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-brand';

export function AddExpenseSheet({ members, meId, editing, onClose, onSave }: Props) {
  const now = useMemo(() => new Date(), []);
  const allIds = members.map((m) => m.id);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [title, setTitle] = useState(editing?.title ?? '');
  // STRICT OWNERSHIP: new kharcha is always in the signed-in user's name; an edit keeps the original payer
  const payerId = editing ? editing.paidById : meId;
  const payer = members.find((m) => m.id === payerId);
  const [custom, setCustom] = useState(editing ? editing.splitBetween.length !== members.length : false);
  const [split, setSplit] = useState<string[]>(editing?.splitBetween ?? allIds);
  const [category, setCategory] = useState<Category>(editing?.category ?? 'groceries');
  const [date, setDate] = useState(editing?.date ?? toDateStr(now));
  const [time, setTime] = useState(editing?.time ?? toTimeStr(now));
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState('');

  const amt = parseFloat(amount) || 0;
  const sharing = custom ? split : allIds;
  const each = sharing.length ? amt / sharing.length : 0;

  const onAmount = (v: string) => {
    let s = v.replace(/[^\d.]/g, '');
    const i = s.indexOf('.');
    if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2);
    setAmount(s.slice(0, 9));
    setError('');
  };

  const toggle = (id: string) =>
    setSplit((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));

  const save = () => {
    if (amt <= 0) {
      setError('Enter an amount greater than ₹0');
      return;
    }
    const cat = CATEGORIES.find((c) => c.key === category)!;
    onSave(
      {
        title: title.trim() || cat.label,
        amount: Math.round(amt * 100) / 100,
        paidById: payerId,
        splitBetween: sharing,
        category,
        date,
        time,
        note: note.trim() || undefined,
      },
      editing?.id,
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Edit Kharcha' : 'Add Kharcha'}
      footer={
        <button
          onClick={save}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-4 text-[16px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,201,122,0.7)] active:scale-[0.98]"
        >
          <Check size={20} strokeWidth={3} />
          {editing ? 'Update' : 'Save'} Kharcha{amt > 0 ? ` · ${formatINR(amt)}` : ''}
        </button>
      }
    >
      {/* Amount */}
      <div className="rounded-3xl border border-[color:var(--border-green)] bg-[image:var(--grad-green)] px-5 py-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Amount</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[38px] font-bold text-brand">₹</span>
          <input
            autoFocus
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            aria-label="Amount"
            className="w-full min-w-0 bg-transparent text-[44px] font-bold leading-tight tracking-tight text-ink outline-none placeholder:text-muted/40"
          />
        </div>
        <p className="min-h-[18px] text-[13px] text-muted">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : amt > 0 ? (
            <>
              {formatINR(each)} each · {sharing.length} {sharing.length === 1 ? 'person' : 'people'}
            </>
          ) : (
            'How much was spent?'
          )}
        </p>
      </div>

      {/* Title */}
      <p className={cn(label, 'mt-5')}>What for?</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kirana Dukan" className={field} />
      <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5">
        {QUICK_TITLES.map((q) => (
          <button
            key={q.title}
            onClick={() => {
              setTitle(q.title);
              setCategory(q.category);
            }}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition active:scale-95',
              title === q.title ? 'border-brand bg-brandsoft text-brand' : 'border-line bg-surface2 text-ink',
            )}
          >
            {q.title}
          </button>
        ))}
      </div>

      {/* Paid by — locked to the signed-in account */}
      <p className={cn(label, 'mt-5')}>Paid by</p>
      <div className="flex items-center gap-3 rounded-2xl border border-brand/40 bg-brandsoft px-3.5 py-3">
        {payer && <Avatar member={payer} size={42} ring="border-brand" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">
            {payer?.name ?? 'You'} {payerId === meId && <span className="text-[12.5px] font-medium text-brand">(You)</span>}
          </p>
          <p className="text-[12px] leading-snug text-muted">
            {editing && payerId !== meId
              ? 'Original payer — cannot be changed'
              : 'Locked to your account. You can only add kharcha in your own name.'}
          </p>
        </div>
        <Lock size={18} className="shrink-0 text-brand" />
      </div>

      {/* Split */}
      <p className={cn(label, 'mt-5')}>Split mode</p>
      <div className="grid grid-cols-2 rounded-2xl border border-line bg-surface2 p-1">
        {[
          { v: false, t: `Equally · all ${members.length}` },
          { v: true, t: 'Custom' },
        ].map((o) => (
          <button
            key={o.t}
            onClick={() => {
              setCustom(o.v);
              if (!o.v) setSplit(allIds);
            }}
            className={cn(
              'rounded-xl py-2.5 text-[14px] font-semibold transition',
              custom === o.v ? 'bg-brand text-white shadow' : 'text-muted',
            )}
          >
            {o.t}
          </button>
        ))}
      </div>
      {custom && (
        <div className="mt-2.5 space-y-2">
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <Users size={14} /> Untick roommates who were away or didn’t share this.
          </p>
          {members.map((m) => {
            const on = split.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition',
                  on ? 'border-brand/50 bg-brandsoft' : 'border-line bg-surface2 opacity-70',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-md border-2',
                    on ? 'border-brand bg-brand text-white' : 'border-muted/50',
                  )}
                >
                  {on && <Check size={15} strokeWidth={3.5} />}
                </span>
                <Avatar member={m} size={32} />
                <span className="flex-1 text-[14.5px] font-medium">{m.id === meId ? `${m.name} (You)` : m.name}</span>
                <span className="text-[13px] font-semibold text-muted">{on && amt > 0 ? formatINR(each) : '—'}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category */}
      <p className={cn(label, 'mt-5')}>Category</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition active:scale-95',
              category === c.key ? 'border-brand bg-brandsoft text-brand' : 'border-line bg-surface2',
            )}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Date/time + note */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div>
          <p className={label}>Date</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
        <div>
          <p className={label}>Time</p>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
        </div>
      </div>
      <p className={cn(label, 'mt-5')}>Note (optional)</p>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className={field} />
      <div className="h-2" />
    </Sheet>
  );
}
