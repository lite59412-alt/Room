import { BarChart3, Users } from 'lucide-react';
import { formatINR } from '../lib/format';

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Sparkline({ values }: { values: number[] }) {
  const W = 180;
  const H = 52;
  const max = Math.max(...values, 1);
  const hasData = values.some((v) => v > 0);
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    hasData ? H - 4 - (v / max) * (H - 10) : H - 8,
  ]);
  const d = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[52px] w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c97a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22c97a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#spark-fill)" />
      <path
        d={d}
        fill="none"
        stroke="#2ee58a"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="anim-draw"
      />
    </svg>
  );
}

interface Props {
  total: number;
  share: number;
  memberCount: number;
  daily: number[];
}

export function SummaryCards({ total, share, memberCount, daily }: Props) {
  return (
    <section className="mt-4 grid grid-cols-2 gap-2.5 px-4">
      <div className="relative overflow-hidden rounded-[22px] border border-[color:var(--border-green)] bg-[image:var(--grad-green)] p-4 pt-[26px] shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] leading-snug text-ink/80">
            Total Room Khata
            <br />
            This Month
          </p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand">
            <BarChart3 size={18} />
          </span>
        </div>
        <p className="mt-2 text-[30px] font-bold leading-none tracking-tight">{formatINR(total, true)}</p>
        <div className="mt-2 -mx-1">
          <Sparkline values={daily} />
        </div>
        <p className="mt-1 text-[12px] text-muted">All expenses this month</p>
      </div>

      <div className="relative overflow-hidden rounded-[22px] border border-[color:var(--border-blue)] bg-[image:var(--grad-blue)] p-4 pt-[26px] shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] leading-snug text-sky">
            Your Equal Share
            <br />
            (Per Person)
          </p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-skysoft text-sky">
            <Users size={18} />
          </span>
        </div>
        <p className="mt-3 text-[30px] font-bold leading-none tracking-tight">{formatINR(share, true)}</p>
        <span className="mt-[26px] inline-block rounded-xl bg-skysoft px-3.5 py-2 text-[14px] font-semibold text-sky">
          {memberCount} Members
        </span>
      </div>
    </section>
  );
}
