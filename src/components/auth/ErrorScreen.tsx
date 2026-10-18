import { LogOut, RefreshCw, TriangleAlert } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSignOut?: () => void;
}

export function ErrorScreen({ title, message, onRetry, retryLabel = 'Try again', onSignOut }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-bg px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dangersoft text-danger">
        <TriangleAlert size={30} />
      </span>
      <h1 className="mt-5 text-[21px] font-bold">{title}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{message}</p>
      <div className="mt-7 flex w-full flex-col gap-3">
        {onRetry && (
          <button onClick={onRetry} className="flex items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-[15px] font-bold text-white active:scale-[0.98]">
            <RefreshCw size={18} /> {retryLabel}
          </button>
        )}
        {onSignOut && (
          <button onClick={onSignOut} className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3.5 text-[15px] font-semibold active:scale-[0.98]">
            <LogOut size={18} /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}
