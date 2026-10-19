import { useState, type FormEvent } from 'react';
import { Calculator, Eye, EyeOff, KeyRound, Lock, Mail, Radio, ShieldCheck, Smartphone, User } from 'lucide-react';
import type { Credentials } from '../../hooks/useAuth';
import { Logo, Spinner } from './Logo';
import { cn } from '../../utils/cn';

const FEATURES = [
  { icon: Radio, title: 'Real-time Expense Sharing', sub: 'Every roommate sees new kharcha instantly.' },
  { icon: Smartphone, title: '1-Tap UPI Settlement', sub: 'Pay or scan a QR and clear the hisab.' },
  { icon: Calculator, title: 'Automated Split', sub: 'Equal or custom split, balances done for you.' },
];

interface Props {
  busy: boolean;
  error: string;
  onSignIn: (c: Credentials) => Promise<boolean>;
  onSignUp: (c: Credentials) => Promise<boolean>;
  onReset: (email: string) => Promise<boolean>;
  /** Firebase isn't configured yet → submitting leads to the one-time setup */
  needsSetup?: boolean;
  onSetup?: () => void;
}

const field =
  'w-full rounded-2xl border border-line bg-surface px-4 py-3.5 pl-11 text-[15.5px] text-ink outline-none placeholder:text-muted/70 focus:border-brand';

export function LoginScreen({ busy, error, onSignIn, onSignUp, onReset, needsSetup, onSetup }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [info, setInfo] = useState('');

  const register = mode === 'signup';
  const shownError = error;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setInfo('');
    if (needsSetup) return onSetup?.();
    if (register) await onSignUp({ name, email, password });
    else await onSignIn({ email, password });
    // success → onAuthStateChanged swaps this screen out; nothing else to do here
  };

  const forgot = async () => {
    setInfo('');
    if (needsSetup) return onSetup?.();
    if (await onReset(email)) setInfo(`Password reset link sent to ${email.trim()}. Check your inbox (and spam).`);
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-bg px-6 pb-8 pt-12">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#22c97a]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 rounded-full bg-[#3b9bff]/10 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <Logo size={72} />
        <h1 className="mt-5 text-[32px] font-extrabold tracking-tight">RoomieKhata</h1>
        <p className="mt-1.5 max-w-[290px] text-[14.5px] leading-snug text-muted">
          Bachelor room ka poora hisab — kharcha, split aur settlement, ek jagah.
        </p>
      </div>

      <ul className="relative mt-6 space-y-2.5">
        {FEATURES.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand">
              <Icon size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold leading-tight">{title}</span>
              <span className="block text-[12px] text-muted">{sub}</span>
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} noValidate className="relative mt-auto pt-7">
        {/* Sign in / Create account */}
        <div className="mb-4 grid grid-cols-2 rounded-2xl border border-line bg-surface p-1">
          {(
            [
              ['signin', 'Sign in'],
              ['signup', 'Create account'],
            ] as const
          ).map(([k, t]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setMode(k);
                setInfo('');
              }}
              className={cn('rounded-xl py-2.5 text-[14px] font-semibold transition', mode === k ? 'bg-brand text-white shadow' : 'text-muted')}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {register && (
            <div className="relative anim-fade">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                autoCapitalize="words"
                maxLength={40}
                aria-label="Your name"
                className={field}
              />
            </div>
          )}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              placeholder="Email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Email"
              className={field}
            />
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? 'text' : 'password'}
              placeholder={register ? 'Password or PIN (min 6)' : 'Password or PIN'}
              autoComplete={register ? 'new-password' : 'current-password'}
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Password"
              className={cn(field, 'pr-12')}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted active:scale-90"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {register && <p className="mt-2 px-1 text-[12px] text-muted">Use at least 6 characters — a 6-digit PIN works too. You only need to do this once.</p>}

        {shownError && (
          <p role="alert" className="anim-fade mt-3 rounded-2xl border border-danger/40 bg-dangersoft px-4 py-3 text-[13px] leading-snug text-danger">
            {shownError}
          </p>
        )}
        {info && !shownError && (
          <p role="status" className="anim-fade mt-3 rounded-2xl border border-[color:var(--border-green)] bg-brandsoft px-4 py-3 text-[13px] leading-snug text-brand">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-4 text-[16px] font-bold text-white shadow-[0_10px_28px_-10px_rgba(34,201,122,0.8)] transition active:scale-[0.98] disabled:opacity-70"
        >
          {busy ? <Spinner size={20} /> : <KeyRound size={19} />}
          {busy ? (register ? 'Creating account…' : 'Signing in…') : register ? 'Create account' : 'Sign in'}
        </button>

        {!register && (
          <button type="button" onClick={() => void forgot()} disabled={busy} className="mt-3 w-full py-2 text-center text-[13.5px] font-medium text-sky">
            Forgot password?
          </button>
        )}

        {needsSetup && (
          <p className="mt-2 text-center text-[12px] text-amber-500">Firebase isn’t connected yet — tapping the button opens the one-time setup.</p>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
          <ShieldCheck size={14} className="shrink-0 text-brand" /> You stay signed in on this phone. Passwords are handled by Firebase — never stored by us.
        </p>
      </form>
    </div>
  );
}
