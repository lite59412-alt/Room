
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { authErrorMessage } from '../../lib/roomService';
import { Spinner } from './Logo';

interface Props {
  email: string;
  onSend: () => Promise<void>;
  onRefresh: () => Promise<void>;
  className?: string;
}

/** Shown to the admin address until its email is verified — verification is what unlocks the Admin Panel. */
export function VerifyEmailBanner({ email, onSend, onRefresh, className = '' }: Props) {
  const [busy, setBusy] = useState<'send' | 'check' | ''>('');
  const [note, setNote] = useState('');

  const run = async (kind: 'send' | 'check') => {
    setBusy(kind);
    setNote('');
    try {
      if (kind === 'send') {
        await onSend();
        setNote(`Verification link sent to ${email}. Open it, then tap “I’ve verified”.`);
      } else {
        await onRefresh();
        setNote('Checked. If the Admin Panel doesn’t appear, the link hasn’t been opened yet.');
      }
    } catch (e) {
      setNote(authErrorMessage(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className={`rounded-2xl border border-amber-400/50 bg-amber-400/10 px-3.5 py-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        <MailCheck size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <p className="text-[13px] leading-snug">
          <b>Verify {email}</b> to unlock the Admin Panel. Admin access only works for a verified email.
        </p>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          onClick={() => void run('send')}
          disabled={!!busy}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2 text-[13px] font-semibold active:scale-95 disabled:opacity-60"
        >
          {busy === 'send' && <Spinner size={14} />} Send link
        </button>
        <button
          onClick={() => void run('check')}
          disabled={!!busy}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
        >
          {busy === 'check' && <Spinner size={14} />} I’ve verified
        </button>
      </div>
      {note && <p className="mt-2 text-[12px] leading-snug text-muted">{note}</p>}
    </div>
  );
}
