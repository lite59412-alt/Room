import { useState } from 'react';
import { BellRing, Check, Hourglass, X } from 'lucide-react';
import type { RoomStore } from '../hooks/useRoomData';
import { isPending, realName } from '../lib/calc';
import { dateTimeLabel, formatINR } from '../lib/format';
import { Avatar } from './ui/Avatar';

interface Props {
  store: RoomStore;
  notify: (m: string) => void;
  /**
   * incoming → approval prompts, shown ONLY to the receiver
   * outgoing → what the payer sees: "Waiting for X…" and "X rejected your payment"
   */
  mode: 'incoming' | 'outgoing';
  heading?: string;
}

const DISMISS_KEY = 'rk.dismissedRejects';
const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

export function PendingSettlements({ store, notify, mode, heading }: Props) {
  const { members } = store.data.room;
  const me = store.meId;
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  // ---------------- receiver: dedicated approval banner (nobody else ever sees these) ----------------
  if (mode === 'incoming') {
    const list = store.data.settlements
      .filter((s) => isPending(s) && s.toMemberId === me)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    if (!list.length) return null;
    return (
      <div className="space-y-2.5">
        {list.map((s) => {
          const payer = members.find((m) => m.id === s.fromMemberId);
          const name = realName(members, s.fromMemberId);
          return (
            <div
              key={s.id}
              className="anim-pop rounded-[22px] border border-amber-400/60 bg-amber-400/10 p-3.5 shadow-[0_0_24px_-6px_rgba(251,191,36,0.45)]"
            >
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-amber-500">
                <BellRing size={13} /> Payment confirmation needed
              </p>
              <div className="mt-2 flex items-start gap-3">
                {payer && <Avatar member={payer} size={44} ring="border-amber-400/60" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-snug">
                    {name} ne aapko {formatINR(s.amount)} transfer kiye hain. Kya aapko paise mil gaye?
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    via {s.paymentMethod} · {dateTimeLabel(s.date, s.time ?? '00:00')}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    store.approveSettlement(s.id);
                    notify(`Approved ${formatINR(s.amount)} from ${name} · hisab clear`);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#25d08a] to-[#12a870] px-2 py-3 text-[13.5px] font-bold text-white active:scale-[0.97]"
                >
                  <Check size={17} strokeWidth={3} /> ✅ Approve & Settle
                </button>
                <button
                  onClick={() => {
                    store.rejectSettlement(s.id);
                    notify(`Rejected ${name}’s ${formatINR(s.amount)} claim · ${name} has been alerted`);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/50 bg-dangersoft px-2 py-3 text-[13.5px] font-bold text-danger active:scale-[0.97]"
                >
                  <X size={17} strokeWidth={3} /> ❌ Not Received / Reject
                </button>
              </div>
              <p className="mt-2 text-[11.5px] text-muted">Approve only after the money has actually reached your account.</p>
            </div>
          );
        })}
      </div>
    );
  }

  // ---------------- payer: waiting + rejected alerts ----------------
  const waiting = store.data.settlements.filter((s) => isPending(s) && s.fromMemberId === me);
  const rejected = store.data.settlements.filter((s) => s.status === 'rejected' && s.fromMemberId === me && !dismissed.includes(s.id));
  if (!waiting.length && !rejected.length) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    setDismissed(next);
  };

  return (
    <div className="space-y-2.5">
      {heading && <h3 className="px-1 text-[15px] font-semibold">{heading}</h3>}

      {rejected.map((s) => {
        const to = realName(members, s.toMemberId);
        return (
          <div key={s.id} className="rounded-[22px] border border-danger/50 bg-dangersoft p-3.5">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-danger">
              <X size={13} strokeWidth={3} /> Settlement rejected
            </p>
            <p className="mt-1 text-[15px] font-semibold leading-snug">
              {to} marked your {formatINR(s.amount)} payment as not received. The debt is back as before.
            </p>
            <button
              onClick={() => dismiss(s.id)}
              className="mt-2.5 w-full rounded-xl border border-line bg-surface py-2.5 text-[13.5px] font-semibold active:scale-[0.98]"
            >
              OK, got it
            </button>
          </div>
        );
      })}

      {waiting.map((s) => {
        const to = members.find((m) => m.id === s.toMemberId);
        const toName = realName(members, s.toMemberId);
        return (
          <div key={s.id} className="rounded-[22px] border border-amber-400/50 bg-amber-400/10 p-3.5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              {to && <Avatar member={to} size={44} ring="border-amber-400/60" />}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-wide text-amber-500">
                  <Hourglass size={12} /> Pending
                </p>
                <p className="text-[15px] font-semibold leading-snug">Waiting for {toName} to confirm payment</p>
                <p className="text-[12.5px] text-muted">
                  You paid {formatINR(s.amount)} via {s.paymentMethod} · {dateTimeLabel(s.date, s.time ?? '00:00')}
                </p>
              </div>
              <p className="shrink-0 text-[18px] font-bold">{formatINR(s.amount)}</p>
            </div>
            <button
              onClick={() => {
                store.undoSettlement(s.id);
                notify('Request withdrawn');
              }}
              className="mt-3 w-full rounded-xl border border-line bg-surface2 py-2.5 text-[13.5px] font-semibold active:scale-[0.98]"
            >
              Withdraw request
            </button>
          </div>
        );
      })}
    </div>
  );
}
