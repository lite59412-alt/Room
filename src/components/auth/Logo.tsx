import { Wallet } from 'lucide-react';

export function Logo({ size = 64 }: { size?: number }) {
  return (
    <span
      className="relative flex items-center justify-center rounded-[26%] bg-gradient-to-br from-[#2fd790] to-[#0e8f5e] text-white shadow-[0_12px_36px_-6px_rgba(34,201,122,0.65)]"
      style={{ width: size, height: size }}
    >
      <Wallet size={size * 0.5} strokeWidth={2} />
      <span className="absolute inset-0 rounded-[26%] ring-1 ring-inset ring-white/25" />
    </span>
  );
}

export function Spinner({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}
