import { useState } from 'react';
import { ArrowRight, DoorOpen, LogOut, PlusCircle, ShieldCheck, Smartphone, TriangleAlert, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Profile } from '../../types';
import { getFirebase } from '../../lib/firebase';
import { authErrorMessage, createRoom, joinRoom } from '../../lib/roomService';
import { Avatar } from '../ui/Avatar';
import { Logo, Spinner } from './Logo';
import { cn } from '../../utils/cn';

interface Props {
  user: User;
  profile: Profile;
  onSaveProfile: (patch: Partial<Profile>) => Promise<void>;
  onSignOut: () => void;
  /** only passed for the authorised admin account */
  onOpenAdmin?: () => void;
}

const field =
  'w-full rounded-2xl border border-line bg-surface2 px-4 py-3.5 text-[15.5px] text-ink outline-none placeholder:text-muted/70 focus:border-brand';
const label = 'mb-1.5 mt-4 block text-[12px] font-semibold uppercase tracking-wider text-muted';
const UPI_RE = /^[\w.\-]{2,}@[\w.\-]{2,}$/;

/** New user: profile + UPI prompt → Create/Join room. Existing user without a room: straight to Create/Join. */
export function OnboardingScreen({ user, profile, onSaveProfile, onSignOut, onOpenAdmin }: Props) {
  const [step, setStep] = useState<'profile' | 'room'>(profile.onboarded ? 'room' : 'profile');
  const [name, setName] = useState(profile.displayName);
  const [upi, setUpi] = useState(profile.upiId);
  const [phone, setPhone] = useState(profile.phone);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const me = { id: user.uid, name: name || profile.displayName, avatar: profile.photoURL, email: profile.email };
  const firstName = (name || profile.displayName).split(' ')[0];

  const continueProfile = () => {
    if (!name.trim()) return setErr('Please enter your name.');
    if (upi.trim() && !UPI_RE.test(upi.trim())) return setErr('That UPI ID looks invalid (example: name@okhdfcbank).');
    onSaveProfile({ displayName: name.trim(), upiId: upi.trim(), phone: phone.trim(), onboarded: true }).catch(() => undefined);
    setErr('');
    setStep('room');
  };

  const submitRoom = async () => {
    const { db } = getFirebase()!;
    const merged: Profile = { ...profile, displayName: name.trim() || profile.displayName, upiId: upi.trim(), phone: phone.trim() };
    setErr('');
    setBusy(true);
    try {
      if (mode === 'create') await createRoom(db, merged, roomName);
      else await joinRoom(db, merged, code);
      // profile snapshot flips currentRoomCode → App moves to the dashboard
    } catch (e) {
      setErr(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-bg px-6 pb-8 pt-10">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#22c97a]/15 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="text-[17px] font-bold tracking-tight">RoomieKhata</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              aria-label="Admin Panel"
              className="flex items-center gap-1.5 rounded-full border border-brand/60 bg-brandsoft px-3 py-1.5 text-[12.5px] font-bold text-brand shadow-[0_0_16px_rgba(34,201,122,0.5)]"
            >
              <ShieldCheck size={14} /> Admin
            </button>
          )}
          <button onClick={onSignOut} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-muted">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {profile.notice && (
        <div role="alert" className="anim-fade relative mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-3.5 py-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug">{profile.notice}</p>
          <button
            aria-label="Dismiss"
            onClick={() => void onSaveProfile({ notice: '' }).catch(() => undefined)}
            className="shrink-0 text-muted active:scale-90"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div key={step} className="anim-fade relative mt-8 flex-1">
        {step === 'profile' ? (
          <>
            <div className="flex items-center gap-4">
              <Avatar member={me} size={64} ring="border-brand/60" />
              <div className="min-w-0">
                <p className="text-[13px] text-muted">Welcome 👋</p>
                <h1 className="truncate text-[24px] font-extrabold leading-tight tracking-tight">{firstName}</h1>
                <p className="truncate text-[12.5px] text-muted">{profile.email}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-[17px] font-bold">Set up your profile</h2>
              <p className="mt-0.5 text-[13px] text-muted">Roommates will use your UPI ID to pay you back.</p>

              <label className={label}>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} autoComplete="name" />

              <label className={label}>
                <Smartphone size={12} className="-mt-0.5 mr-1 inline" />
                UPI ID <span className="normal-case tracking-normal">(recommended)</span>
              </label>
              <input
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                placeholder="yourname@okhdfcbank"
                autoCapitalize="none"
                autoCorrect="off"
                className={field}
              />

              <label className={label}>Phone (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91 98765 43210" className={field} />
            </div>
            {err && <p className="mt-3 text-[13px] text-danger">{err}</p>}
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">
              {profile.onboarded && !profile.currentRoomCode ? 'Choose your room' : `Namaste, ${firstName}!`}
            </h1>
            <p className="mt-1 text-[14px] text-muted">Create a room for your flat, or join your roommates with their code.</p>

            <div className="mt-5 grid grid-cols-2 rounded-2xl border border-line bg-surface p-1">
              {(
                [
                  ['create', 'Create a New Room', PlusCircle],
                  ['join', 'Join Room via Code', DoorOpen],
                ] as const
              ).map(([k, t, Icon]) => (
                <button
                  key={k}
                  onClick={() => {
                    setMode(k);
                    setErr('');
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-[13px] font-semibold leading-tight transition',
                    mode === k ? 'bg-brand text-white shadow' : 'text-muted',
                  )}
                >
                  <Icon size={16} className="shrink-0" /> {t}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              {mode === 'create' ? (
                <>
                  <h2 className="text-[17px] font-bold">Create a New Room</h2>
                  <p className="mt-0.5 text-[13px] text-muted">You’ll get a room code to share with your roommates.</p>
                  <label className={label}>Room name</label>
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Our Flat, Room 12" className={field} />
                </>
              ) : (
                <>
                  <h2 className="text-[17px] font-bold">Join Room via Code</h2>
                  <p className="mt-0.5 text-[13px] text-muted">Ask a roommate for the code shown in their app header.</p>
                  <label className={label}>Room code</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ROOM-482913"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    className={cn(field, 'text-center text-[18px] font-bold tracking-widest')}
                  />
                </>
              )}
            </div>
            {err && (
              <p role="alert" className="anim-fade mt-3 rounded-2xl border border-danger/40 bg-dangersoft px-4 py-3 text-[13px] text-danger">
                {err}
              </p>
            )}
          </>
        )}
      </div>

      <div className="relative pt-6">
        <button
          onClick={step === 'profile' ? continueProfile : submitRoom}
          disabled={busy || (step === 'room' && mode === 'join' && code.trim().length < 3)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-4 text-[16px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,201,122,0.7)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? (
            <>
              <Spinner size={18} /> {mode === 'create' ? 'Creating room…' : 'Joining room…'}
            </>
          ) : step === 'profile' ? (
            <>
              Continue <ArrowRight size={19} />
            </>
          ) : mode === 'create' ? (
            <>
              <PlusCircle size={19} /> Create Room
            </>
          ) : (
            <>
              <DoorOpen size={19} /> Join Room
            </>
          )}
        </button>
        {step === 'profile' && (
          <button
            onClick={() => {
              setUpi('');
              onSaveProfile({ displayName: name.trim() || profile.displayName, onboarded: true }).catch(() => undefined);
              setStep('room');
            }}
            className="mt-3 w-full py-2 text-center text-[13.5px] font-medium text-muted"
          >
            Skip UPI for now
          </button>
        )}
        {step === 'room' && profile.onboarded && (
          <button onClick={() => setStep('profile')} className="mt-3 w-full py-2 text-center text-[13.5px] font-medium text-muted">
            Edit profile / UPI ID
          </button>
        )}
      </div>
    </div>
  );
}
