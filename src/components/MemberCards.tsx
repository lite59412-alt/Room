import { ArrowDown, ArrowUpRight, Scale } from 'lucide-react';
import type { Member } from '../types';
import { Avatar } from './ui/Avatar';
import { formatINR } from '../lib/format';
import { cn } from '../utils/cn';

interface Props {
  members: Member[];
  meId: string;
  spent: Record<string, number>;
  net: Record<string, number>;
  isOnline: (id: string) => boolean;
  onSelect?: (id: string) => void;
}

export function MemberCards({ members, meId, spent, net, isOnline, onSelect }: Props) {
  return (
    <section className="mt-3 grid grid-cols-3 gap-2.5 px-4">
      {members.map((m) => {
        const n = net[m.id] ?? 0;
        const pos = n >= 0.5;
        const neg = n <= -0.5;
        const me = m.id === meId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect?.(m.id)}
            className={cn(
              'flex flex-col items-center rounded-[22px] border bg-surface px-2 pb-2.5 pt-3.5 shadow-[var(--shadow-card)] transition active:scale-[0.98]',
              me ? 'border-[color:var(--border-green)] ring-1 ring-brand/30' : 'border-line',
            )}
          >
            <Avatar member={m} size={52} showDot online={isOnline(m.id)} ring={me ? 'border-brand/60' : 'border-line'} />
            <p className="mt-2 max-w-full truncate text-[16px] font-semibold leading-tight">{me ? 'You' : m.name}</p>
            <p className="mt-0.5 max-w-full truncate text-[12.5px] text-muted">Spent {formatINR(spent[m.id] ?? 0)}</p>
            <div className="mt-2.5 h-px w-full bg-line" />
            <div
              className={cn(
                'mt-2.5 flex w-full items-center justify-between gap-1 rounded-xl border px-2 py-1.5',
                pos && 'border-brand/40 bg-brandsoft',
                neg && 'border-danger/40 bg-dangersoft',
                !pos && !neg && 'border-line bg-surface2',
              )}
            >
              <div className="min-w-0 text-left">
                <p
                  className={cn(
                    'truncate text-[14px] font-bold leading-tight',
                    pos && 'text-brand',
                    neg && 'text-danger',
                    !pos && !neg && 'text-ink',
                  )}
                >
                  {pos ? `+${formatINR(n)}` : neg ? `-${formatINR(-n)}` : '₹0'}
                </p>
                <p className="truncate text-[11.5px] text-muted">{pos ? 'Lena hai' : neg ? 'Dena hai' : 'Balanced'}</p>
              </div>
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  pos && 'bg-brand/20 text-brand',
                  neg && 'bg-danger/20 text-danger',
                  !pos && !neg && 'bg-line text-muted',
                )}
              >
                {pos ? <ArrowUpRight size={14} /> : neg ? <ArrowDown size={14} /> : <Scale size={13} />}
              </span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
