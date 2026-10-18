import { ArrowLeftRight, ChevronRight, PartyPopper, Send } from 'lucide-react';
import type { Member, Transfer } from '../types';
import { memberName } from '../lib/calc';
import { formatINR } from '../lib/format';

interface Props {
  transfers: Transfer[];
  members: Member[];
  meId: string;
  onPay: (t: Transfer) => void;
}

/** "Hisab Clear Karo" — minimal debt paths */
export function SettleCard({ transfers, members, meId, onPay }: Props) {
  const title = (
    <p className="flex items-center gap-1.5 text-[14px] font-semibold text-amber-400">
      Hisab Clear Karo <span className="text-[15px]">🤝</span>
    </p>
  );

  if (!transfers.length) {
    return (
      <section className="mx-4 mt-3.5 flex items-center gap-3 rounded-[22px] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]">
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand">
          <PartyPopper size={24} />
        </span>
        <div>
          {title}
          <p className="text-[16px] font-semibold leading-snug">Sab barabar hai!</p>
          <p className="text-[13px] text-muted">No pending payments. Khata clear.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-4 mt-3.5 rounded-[22px] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]">
      {transfers.map((t, i) => (
        <div key={`${t.from}-${t.to}`} className={i > 0 ? 'mt-3 border-t border-line pt-3' : ''}>
          <div className="flex items-center gap-3">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[color:var(--border-green)] bg-brandsoft text-ink">
              <ArrowLeftRight size={24} />
            </span>
            <div className="min-w-0 flex-1">
              {i === 0 && title}
              <p className="text-[16px] font-semibold leading-snug">
                {memberName(members, t.from, meId)} {t.from === meId ? 'owe' : 'owes'} {memberName(members, t.to, meId)}{' '}
                {formatINR(t.amount)}
              </p>
              <p className="text-[13px] text-muted">
                {i === 0
                  ? transfers.length === 1
                    ? 'One payment. Khata clear.'
                    : `${transfers.length} payments. Khata clear.`
                  : 'Pay to clear khata.'}
              </p>
            </div>
            <button
              onClick={() => onPay(t)}
              className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] px-3 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(34,201,122,0.7)] active:scale-[0.97]"
            >
              <Send size={17} className="-rotate-12" /> Pay via UPI <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
