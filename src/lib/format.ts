const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** ₹4,350 — Indian digit grouping */
export function formatINR(n: number, spaced = false): string {
  const v = Math.round(n * 100) / 100;
  const sign = v < 0 ? '-' : '';
  return `${sign}₹${spaced ? ' ' : ''}${inr.format(Math.abs(v))}`;
}

export const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

/** "19:45" -> "7:45 PM" */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m || 0)} ${ap}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** "Today" | "Yesterday" | "12 Mar" */
export function dayLabel(dateStr: string): string {
  if (dateStr === todayStr()) return 'Today';
  if (dateStr === daysAgoStr(1)) return 'Yesterday';
  return parseDate(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "Mon, 12 Mar 2026" */
export function longDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "Today, 9:20 AM" */
export function dateTimeLabel(dateStr: string, time: string): string {
  return `${dayLabel(dateStr)}, ${formatTime(time)}`;
}

export function monthLabel(d = new Date()): string {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
