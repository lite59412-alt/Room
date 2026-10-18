import { ArrowRight, Banknote, CheckCircle2, Copy, Hourglass, MessageCircle, PartyPopper, Send, Undo2, XCircle } from 'lucide-react';
import type { TabProps } from '../../lib/view';
import { Avatar } from '../ui/Avatar';
import { PendingSettlements } from '../PendingSettlements';
import { copyText } from '../Header';
import { buildWhatsAppText, isPending, memberName, whatsappUrl } from '../../lib/calc';
import { dateTimeLabel, formatINR } from '../../lib/format';

export function SettlementsTab({ store, view, ui }: TabProps) {
  const { room, settlements } = store.data;
  const { members } = room;
  const me = store.meId;
  const text = buildWhatsAppText(store.data);
  const history = settlements.filter((s) => !isPending(s));

  return (
    <div className="px-4">
      <h1 className="mt-5 px-1 text-[26px] font-bold tracking-tight">Settlements</h1>
      <p className="px-1 text-[13.5px] text-muted">The payer sends a request — the khata clears only when the receiver approves.</p>

      {/* The payer's own status (waiting / rejected). Receiver prompts are the banner at the top of the app. */}
      <div className="mt-4 empty:hidden">
        <PendingSettlements store={store} notify={ui.notify} mode="outgoing" />
      </div>

      {/* Pending transfers */}
      <h3 className="mb-2 mt-5 px-1 text-[15px] font-semibold">Hisab Clear Karo 🤝</h3>
      {view.transfers.length === 0 ? (
        <div className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brandsoft text-brand">
            <PartyPopper size={22} />
          </span>
          <div>
            <p className="text-[16px] font-semibold">Sab barabar hai!</p>
            <p className="text-[13px] text-muted">No pending payments.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {view.transfers.map((t) => {
            const from = members.find((m) => m.id === t.from)!;
            const to = members.find((m) => m.id === t.to)!;
            const isPayer = me === t.from;
            const isReceiver = me === t.to;
            const awaiting = settlements.some((s) => isPending(s) && s.fromMemberId === t.from && s.toMemberId === t.to);
            return (
              <div key={`${t.from}-${t.to}`} className="rounded-[22px] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <Avatar member={from} size={44} />
                  <ArrowRight size={18} className="text-muted" />
                  <Avatar member={to} size={44} />
                  <div className="min-w-0 flex-1 pl-1">
                    <p className="truncate text-[15px] font-semibold leading-tight">
                      {memberName(members, t.from, me)} → {memberName(members, t.to, me)}
                    </p>
                    <p className="truncate text-[12.5px] text-muted">{to.upiId ?? 'No UPI ID yet'}</p>
                  </div>
                  <p className="text-[20px] font-bold text-brand">{formatINR(t.amount)}</p>
                </div>
                {awaiting && (
                  <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-[12.5px] font-medium text-amber-500">
                    <Hourglass size={13} /> A payment for this is awaiting {isReceiver ? 'your' : `${to.name}’s`} approval
                  </p>
                )}
                <div className="mt-3 grid grid-cols-5 gap-2">
                  <button
                    onClick={() => ui.openPay(t)}
                    className="col-span-3 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-2.5 text-[14px] font-semibold text-white active:scale-[0.97]"
                  >
                    <Send size={16} className="-rotate-12" /> {isPayer ? 'Pay via UPI' : 'View details'}
                  </button>
                  <button
                    disabled={!isPayer || awaiting}
                    onClick={() => {
                      store.addSettlement(t.from, t.to, t.amount, 'Cash');
                      ui.notify(`Request sent · waiting for ${to.name} to confirm ${formatINR(t.amount)}`);
                    }}
                    className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface2 py-2.5 text-[13.5px] font-semibold active:scale-[0.97] disabled:opacity-40"
                  >
                    <Banknote size={16} /> Request Settle
                  </button>
                </div>
                {!isPayer && (
                  <p className="mt-2 text-[11.5px] leading-snug text-muted">
                    {isReceiver
                      ? `${from.name} sends the request after paying you — you’ll get an Approve / Reject prompt.`
                      : `Only ${from.name} can send this request, and only ${to.name} can approve it.`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp */}
      <h3 className="mb-2 mt-6 px-1 text-[15px] font-semibold">WhatsApp group summary</h3>
      <div className="rounded-[22px] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]">
        <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-surface2 p-3.5 font-sans text-[13px] leading-relaxed text-ink/90">
          {text}
        </pre>
        <div className="mt-3 grid grid-cols-5 gap-2">
          <a
            href={whatsappUrl(text)}
            target="_blank"
            rel="noreferrer"
            className="col-span-3 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-[14.5px] font-bold text-white active:scale-[0.97]"
          >
            <MessageCircle size={19} /> Share on WhatsApp
          </a>
          <button
            onClick={async () => ui.notify((await copyText(text)) ? 'Summary copied' : 'Copy failed')}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface2 py-3 text-[13.5px] font-semibold active:scale-[0.97]"
          >
            <Copy size={16} /> Copy
          </button>
        </div>
      </div>

      {/* History */}
      <h3 className="mb-2 mt-6 px-1 text-[15px] font-semibold">Payment history</h3>
      {history.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-[13px] text-muted">
          Approved and rejected payments will show up here.
        </p>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
          {history.map((s) => {
            const rejected = s.status === 'rejected';
            // same rule as the server: receiver (or Super Admin) can undo; payer can only clear a rejected one
            const canUndo = store.isAdmin || s.toMemberId === me || (rejected && s.fromMemberId === me);
            return (
              <div key={s.id} className="flex items-center gap-3 px-3.5 py-3">
                {rejected ? <XCircle size={22} className="shrink-0 text-danger" /> : <CheckCircle2 size={22} className="shrink-0 text-brand" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold">
                    {memberName(members, s.fromMemberId, me)} {rejected ? 'claimed' : 'paid'} {memberName(members, s.toMemberId, me)}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {dateTimeLabel(s.date, s.time ?? '00:00')} · {s.paymentMethod} ·{' '}
                    <span className={rejected ? 'font-semibold text-danger' : 'font-semibold text-brand'}>
                      {rejected ? 'Rejected by receiver' : 'Approved by receiver'}
                    </span>
                  </p>
                </div>
                <span className={`text-[15px] font-bold ${rejected ? 'text-muted line-through' : ''}`}>{formatINR(s.amount)}</span>
                {canUndo && (
                  <button
                    aria-label={rejected ? 'Dismiss' : 'Undo settlement'}
                    onClick={() => {
                      store.undoSettlement(s.id);
                      ui.notify(rejected ? 'Dismissed' : 'Settlement undone · balances restored');
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-muted active:scale-90"
                  >
                    <Undo2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
