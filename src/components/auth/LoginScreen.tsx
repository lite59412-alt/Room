import { useState } from 'react';
import { Calculator, Lock, Mail, Radio, Smartphone, User, UserPlus, LogIn } from 'lucide-react';
import { Logo, Spinner } from './Logo';

const FEATURES = [
  { icon: Radio, title: 'Real-time Expense Sharing', sub: 'Har roommate ko kharcha turant dikhega.' },
  { icon: Smartphone, title: '1-Tap UPI Settlement', sub: 'Settle karo aur hisab clear pao.' },
  { icon: Calculator, title: 'Automated Split', sub: 'Equal ya custom hisab automatically hoga.' },
];

interface Props {
  busy: boolean;
  error: string;
  onSignIn: (email: string, pass: string) => void;
  onSignUp: (name: string, email: string, pass: string) => void;
}

export function LoginScreen({ busy, error, onSignIn, onSignUp }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localErr, setLocalErr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr('');

    if (!email.trim() || !password.trim()) {
      setLocalErr('Email aur password daalna zaroori hai.');
      return;
    }
    if (password.length < 6) {
      setLocalErr('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setLocalErr('Apna naam daaliye.');
        return;
      }
      onSignUp(name, email, password);
    } else {
      onSignIn(email, password);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-y-auto bg-bg px-6 pb-12 pt-10">
      <div className="relative flex flex-col items-center text-center">
        <Logo size={72} />
        <h1 className="mt-4 text-[30px] font-extrabold tracking-tight">RoomieKhata</h1>
        <p className="mt-1 max-w-[280px] text-[14px] leading-snug text-muted">
          Bachelor room ka poora hisab — bina kisi jhanjhat ke.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex rounded-2xl border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => { setIsRegister(false); setLocalErr(''); }}
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold transition ${!isRegister ? 'bg-brand text-white shadow' : 'text-muted'}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setIsRegister(true); setLocalErr(''); }}
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold transition ${isRegister ? 'bg-brand text-white shadow' : 'text-muted'}`}
        >
          Create Account
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        {isRegister && (
          <div>
            <label className="mb-1 block text-[12px] font-semibold uppercase text-muted">Aapka Naam</label>
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2 px-3.5 py-3">
              <User size={18} className="text-muted" />
              <input
                type="text"
                required
                placeholder="e.g. Barun Ray"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-[14.5px] outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase text-muted">Email ID</label>
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2 px-3.5 py-3">
            <Mail size={18} className="text-muted" />
            <input
              type="email"
              required
              placeholder="e.g. yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-[14.5px] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase text-muted">Password</label>
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2 px-3.5 py-3">
            <Lock size={18} className="text-muted" />
            <input
              type="password"
              required
              placeholder="Kam se kam 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-[14.5px] outline-none"
            />
          </div>
        </div>

        {(localErr || error) && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-dangersoft px-3 py-2 text-[12.5px] text-danger">
            {localErr || error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-3.5 text-[15.5px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(34,201,122,0.6)] active:scale-95 disabled:opacity-50"
        >
          {busy ? (
            <Spinner size={18} />
          ) : isRegister ? (
            <>
              <UserPlus size={18} /> Create Account
            </>
          ) : (
            <>
              <LogIn size={18} /> Sign In
            </>
          )}
        </button>
      </form>

      {/* Features List */}
      <ul className="mt-6 space-y-2.5">
        {FEATURES.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-3.5 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <span className="block text-[13.5px] font-semibold leading-tight">{title}</span>
              <span className="block text-[11.5px] text-muted">{sub}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
