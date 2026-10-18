import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Logo } from './Logo';
import { parseFirebaseConfig, saveFirebaseConfig } from '../../lib/firebase';

/** Shown only when no Firebase project is configured yet (no VITE_FIREBASE_* env and nothing saved). */
export function SetupScreen({ onBack }: { onBack?: () => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');

  const connect = () => {
    const cfg = parseFirebaseConfig(text);
    if (!cfg) {
      setErr('Paste the firebaseConfig object (it needs at least apiKey and projectId).');
      return;
    }
    saveFirebaseConfig(cfg);
    window.location.reload();
  };

  const step = 'flex gap-3 text-[13.5px] leading-snug text-muted';
  const num = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brandsoft text-[12px] font-bold text-brand';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg px-6 pb-10 pt-12">
      <div className="flex flex-col items-center text-center">
        <Logo size={64} />
        <h1 className="mt-4 text-[26px] font-extrabold tracking-tight">Connect Firebase</h1>
        <p className="mt-1 text-[14px] text-muted">One-time setup so Google login and live sync can work.</p>
      </div>

      <ol className="mt-7 space-y-3.5 rounded-3xl border border-line bg-surface p-5">
        <li className={step}>
          <span className={num}>1</span>
          <span>Create a project at <b className="text-ink">console.firebase.google.com</b> and add a <b className="text-ink">Web app</b>.</span>
        </li>
        <li className={step}>
          <span className={num}>2</span>
          <span>Authentication → Sign-in method → enable <b className="text-ink">Google</b>. Add this site’s domain under Authorized domains.</span>
        </li>
        <li className={step}>
          <span className={num}>3</span>
          <span>Create a <b className="text-ink">Firestore</b> database, then publish the rules from <code className="rounded bg-surface2 px-1">firestore.rules</code>.</span>
        </li>
        <li className={step}>
          <span className={num}>4</span>
          <span>Paste the <code className="rounded bg-surface2 px-1">firebaseConfig</code> below (or set <code className="rounded bg-surface2 px-1">VITE_FIREBASE_*</code> in <code className="rounded bg-surface2 px-1">.env</code>).</span>
        </li>
      </ol>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setErr('');
        }}
        rows={7}
        spellCheck={false}
        placeholder={'{\n  apiKey: "…",\n  authDomain: "…",\n  projectId: "…",\n  messagingSenderId: "…",\n  appId: "…",\n  vapidKey: "…"   // optional, for background push\n}'}
        className="mt-5 w-full rounded-2xl border border-line bg-surface p-4 font-mono text-[12.5px] outline-none focus:border-brand"
      />
      {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}
      <button
        onClick={connect}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25d08a] to-[#12a870] py-4 text-[16px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,201,122,0.7)] active:scale-[0.98]"
      >
        <KeyRound size={19} /> Save & continue
      </button>
      {onBack && (
        <button onClick={onBack} className="mt-3 w-full py-2.5 text-center text-[14px] font-medium text-muted">
          ← Back to login
        </button>
      )}
    </div>
  );
}
