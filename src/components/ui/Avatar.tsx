import { useEffect, useState } from 'react';
import type { Member } from '../../types';
import { cn } from '../../utils/cn';

const GRADS = [
  'from-emerald-500 to-teal-700',
  'from-sky-500 to-indigo-700',
  'from-fuchsia-500 to-purple-700',
  'from-amber-500 to-orange-700',
];

function gradFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}

interface Props {
  member: Pick<Member, 'id' | 'name' | 'avatar'>;
  size?: number;
  online?: boolean;
  showDot?: boolean;
  ring?: string;
  className?: string;
}

/** Google profile photo with an initials fallback */
export function Avatar({ member, size = 44, online = true, showDot = false, ring, className }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [member.avatar]);
  const src = !failed && member.avatar ? member.avatar : null;
  const dot = Math.max(10, Math.round(size * 0.26));
  return (
    <span className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      <span className={cn('block h-full w-full overflow-hidden rounded-full border-2 bg-surface2', ring ?? 'border-line')}>
        {src ? (
          <img
            src={src}
            alt={member.name}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span
            className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br font-bold text-white', gradFor(member.id))}
            style={{ fontSize: size * 0.4 }}
          >
            {(member.name || '?').slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      {showDot && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-bg',
            online ? 'bg-[#2ee58a] shadow-[0_0_8px_rgba(46,229,138,0.8)]' : 'bg-slate-500',
          )}
          style={{ width: dot, height: dot, right: -1, bottom: 0 }}
        />
      )}
    </span>
  );
}
