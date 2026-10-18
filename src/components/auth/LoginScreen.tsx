import { Calculator, Radio, ShieldCheck, Smartphone } from 'lucide-react';
import { Logo, Spinner } from './Logo';

function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const FEATURES = [
  { icon: Radio, title: 'Real-time Expense Sharing', sub: 'Every roommate sees new kharcha instantly.' },
  { icon: Smartphone, title: '1-Tap UPI Settlement', sub: 'Pay or scan a QR and clear the hisab.' },
  { icon: Calculator, title: 'Automated Split', sub: 'Equal or custom split, balances done for you.' },
];

interface Props {
  busy: boolean;
  error: string;
  onSignIn: () => void;
  /** Firebase isn't configured yet → Google sign-in leads to one-time setup */
  needsSetup?: boolean;
}

export function LoginScreen({ busy, error, onSignIn, needsSetup }: Props) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-bg px-6 pb-8 pt-14">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#22c97a]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 rounded-full bg-[#3b9bff]/10 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <Logo size={84} />
        <h1 className="mt-6 text-[34px] font-extrabold tracking-tight">RoomieKhata</h1>
        <p className="mt-1.5 max-w-[280px] text-[15px] leading-snug text-muted">
          Bachelor room ka poora hisab — kharcha, split aur settlement, ek jagah.
        </p>
      </div>

      <ul className="relative mt-10 space-y-3">
        {FEATURES.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-[var(--shadow-card)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand">
              <Icon size={21} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-tight">{title}</span>
              <span className="block text-[12.5px] text-muted">{sub}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="relative mt-auto pt-10">
        {error && (
          <p role="alert" className="anim-fade mb-3 rounded-2xl border border-danger/40 bg-dangersoft px-4 py-3 text-[13px] leading-snug text-danger">
            {error}
          </p>
        )}
        <button
          onClick={onSignIn}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4 text-[16px] font-semibold text-slate-800 shadow-[0_10px_28px_-10px_rgba(255,255,255,0.35)] transition active:scale-[0.98] disabled:opacity-80"
        >
          {busy ? <Spinner className="text-slate-700" /> : <GoogleG />}
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {needsSetup && (
          <p className="mt-2 text-center text-[12px] text-amber-500">Firebase isn’t connected yet — Google sign-in needs a one-time setup.</p>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
          <ShieldCheck size={14} className="text-brand" /> Secure sign-in via Google. We never see your password.
        </p>
      </div>
    </div>
  );
}
