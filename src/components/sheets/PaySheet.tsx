import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Banknote, CheckCircle2, Copy, Pencil, Smartphone } from 'lucide-react';
import type { Member, Transfer } from '../../types';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { copyText } from '../Header';
import { memberName, upiLink } from '../../lib/calc';
import { formatINR } from '../../lib/format';

interface Props {
  transfer: Transfer;
  members: Member[];
  meId: string;
  onClose: () => void;
  onSaveUpi: (memberId: string, upi: string) => void;
  onSettle: (t: Transfer, method: 'UPI' | 'Cash') => void;
}

export function PaySheet({ transfer: t, members, meId, onClose, onSaveUpi, onSettle }: Props) {
  const from = members.find((m) => m.id === t.from);
  const to = members.find((m) => m.id === t.to);
  const [editing, setEditing] = useState(!to?.upiId);
  const [upi, setUpi] = useState(to?.upiId ?? '');
  const [copied, setCopied] = useState(false);
  if (!from || !to) return null;

  const role: 'to' | 'from' | 'other' = meId === t.to ? 'to' : meId === t.from ? 'from' : 'other';
  const validUpi = /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upi.trim());
  const link = to.upiId ? upiLink(to.upiId, to.name, t.amount) : '';

  return (
    <Sheet
      open
      onClose={onClose}
      title="Pay via UPI"
      footer={
        role !== 'from' ? (
          <p className="text-center text-[13px] leading-snug text-muted">
            {role === 'to' ? (
              <>
                Only <b className="text-ink">{from.name}</b> (the payer) can send a payment request. You’ll get an{' '}
                <b className="text-ink">Approve / Reject</b> prompt once they do.
              </>
            ) : (
              <>
                Only <b className="text-ink">{from.name}</b> (payer) can record this payment, and only{' '}
                <b className="text-ink">{to.name}</b> (receiver) can approve it.
              </>
            )}
          </p>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={() => onSettle(t, 'UPI')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3.5 text-[15.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,201,122,0.7)] active:scale-[0.98]"
            >
              <CheckCircle2 size={20} /> I’ve paid {formatINR(t.amount)} · Request Settle
            </button>
            <button
              onClick={() => onSettle(t, 'Cash')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface2 py-3 text-[14.5px] font-semibold active:scale-[0.98]"
            >
              <Banknote size={18} /> Paid in cash · Request Settle
            </button>
            <p className="text-center text-[12px] text-muted">
              {to.name} must confirm they received it. The khata clears only after their approval.
            </p>
          </div>
        )
      }
    >
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-surface2 px-3 py-3.5">
        <div className="flex flex-col items-center gap-1">
          <Avatar member={from} size={46} />
          <span className="text-[13px] font-semibold">{memberName(members, from.id, meId)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[26px] font-bold leading-none text-brand">{formatINR(t.amount)}</span>
          <ArrowRight className="mt-1 text-muted" size={22} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Avatar member={to} size={46} />
          <span className="text-[13px] font-semibold">{memberName(members, to.id, meId)}</span>
        </div>
      </div>

      {/* Receiver UPI */}
      <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wider text-muted">
        {to.name}’s UPI ID
      </p>
      {editing ? (
        <div className="flex gap-2">
          <input
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
            placeholder="name@bank"
            autoCapitalize="none"
            autoCorrect="off"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-surface2 px-4 py-3 text-[15px] outline-none focus:border-brand"
          />
          <button
            disabled={!validUpi}
            onClick={() => {
              onSaveUpi(to.id, upi.trim());
              setEditing(false);
            }}
            className="rounded-2xl bg-brand px-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface2 px-4 py-3">
          <span className="flex-1 truncate text-[15px] font-semibold">{to.upiId}</span>
          <button
            aria-label="Copy UPI"
            onClick={async () => {
              if (await copyText(to.upiId!)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
            className="text-muted"
          >
            {copied ? <CheckCircle2 size={18} className="text-brand" /> : <Copy size={18} />}
          </button>
          <button aria-label="Edit UPI" onClick={() => setEditing(true)} className="text-muted">
            <Pencil size={17} />
          </button>
        </div>
      )}

      {link && !editing && (
        <>
          <a
            href={link}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-green)] bg-brandsoft py-3.5 text-[15px] font-bold text-brand active:scale-[0.98]"
          >
            <Smartphone size={19} /> Open UPI App (GPay / PhonePe / Paytm)
          </a>
          <div className="mt-4 flex flex-col items-center rounded-3xl bg-white p-4">
            <QRCodeSVG value={link} size={176} level="M" marginSize={0} />
            <p className="mt-2.5 text-[12px] font-medium text-slate-500">Scan with any UPI app · {formatINR(t.amount)}</p>
          </div>
          <p className="mt-3 text-center text-[12px] text-muted">
            After paying, tap <b>Settle Up</b> so everyone’s balance updates.
          </p>
        </>
      )}
      <div className="h-2" />
    </Sheet>
  );
}
