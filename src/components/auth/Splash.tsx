import { useEffect, useState } from 'react';
import { Logo, Spinner } from './Logo';

export function Splash({ label = 'Loading…' }: { label?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-bg px-8 text-center">
      <Logo size={68} />
      <h1 className="mt-5 text-[22px] font-bold tracking-tight">RoomieKhata</h1>
      <div className="mt-6 flex items-center gap-3 text-brand">
        <Spinner />
        <span className="text-[14px] text-muted">{label}</span>
      </div>
      {slow && <p className="anim-fade mt-5 text-[12.5px] text-muted">Taking longer than usual… please check your internet connection.</p>}
    </div>
  );
}
