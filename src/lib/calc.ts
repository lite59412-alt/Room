import type { AppData, ExpenseEntry, Member, SettlementRecord, Transfer } from '../types';
import { formatINR, monthLabel } from './format';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Only the account that added a kharcha — or the Super Admin — may edit / delete it */
export function canModifyExpense(e: ExpenseEntry, uid: string, isAdmin: boolean): boolean {
  return isAdmin || (e.addedBy ?? e.paidById) === uid;
}

export function sortExpenses(list: ExpenseEntry[]): ExpenseEntry[] {
  return [...list].sort((a, b) => {
    const ka = `${a.date} ${a.time}`;
    const kb = `${b.date} ${b.time}`;
    if (ka !== kb) return ka < kb ? 1 : -1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

export function totalOf(expenses: ExpenseEntry[]): number {
  return r2(expenses.reduce((s, e) => s + e.amount, 0));
}

export function spentByMember(expenses: ExpenseEntry[], members: Member[]): Record<string, number> {
  const out: Record<string, number> = {};
  members.forEach((m) => (out[m.id] = 0));
  expenses.forEach((e) => {
    out[e.paidById] = r2((out[e.paidById] ?? 0) + e.amount);
  });
  return out;
}

export const isPending = (s: SettlementRecord) => s.status === 'pending_receiver_approval';
export const isSettled = (s: SettlementRecord) => (s.status ?? 'settled') === 'settled';

/** net > 0 → others owe this member (lena hai). net < 0 → member owes (dena hai) */
export function netBalances(
  expenses: ExpenseEntry[],
  settlements: SettlementRecord[],
  members: Member[],
): Record<string, number> {
  const net: Record<string, number> = {};
  members.forEach((m) => (net[m.id] = 0));
  expenses.forEach((e) => {
    const split = e.splitBetween.length ? e.splitBetween : members.map((m) => m.id);
    const share = e.amount / split.length;
    net[e.paidById] = (net[e.paidById] ?? 0) + e.amount;
    split.forEach((id) => {
      net[id] = (net[id] ?? 0) - share;
    });
  });
  settlements.filter(isSettled).forEach((s) => {
    net[s.fromMemberId] = (net[s.fromMemberId] ?? 0) + s.amount;
    net[s.toMemberId] = (net[s.toMemberId] ?? 0) - s.amount;
  });
  Object.keys(net).forEach((k) => (net[k] = r2(net[k])));
  return net;
}

/** Minimal-transfer debt simplification (greedy: biggest debtor pays biggest creditor) */
export function simplifyDebts(net: Record<string, number>): Transfer[] {
  const creditors = Object.entries(net)
    .filter(([, v]) => v >= 0.5)
    .map(([id, v]) => ({ id, v }))
    .sort((a, b) => b.v - a.v);
  const debtors = Object.entries(net)
    .filter(([, v]) => v <= -0.5)
    .map(([id, v]) => ({ id, v: -v }))
    .sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v);
    if (amt >= 0.5) out.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(amt) });
    debtors[i].v = r2(debtors[i].v - amt);
    creditors[j].v = r2(creditors[j].v - amt);
    if (debtors[i].v < 0.5) i++;
    if (creditors[j].v < 0.5) j++;
  }
  return out;
}

export function perHead(e: ExpenseEntry, memberCount: number): number {
  const n = e.splitBetween.length || memberCount || 1;
  return r2(e.amount / n);
}

export function memberName(members: Member[], id: string, meId?: string): string {
  if (id === meId) return 'You';
  return members.find((m) => m.id === id)?.name ?? 'Unknown';
}

export function realName(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? 'Unknown';
}

/** Daily totals for the last N days (oldest → newest) for the sparkline */
export function dailyTotals(expenses: ExpenseEntry[], days = 14): number[] {
  const out: number[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push(expenses.filter((e) => e.date === key).reduce((s, e) => s + e.amount, 0));
  }
  return out;
}

export function upiLink(upiId: string, name: string, amount: number, note = 'RoomieKhata settlement'): string {
  const p = new URLSearchParams({ pa: upiId, pn: name, am: String(amount), cu: 'INR', tn: note });
  return `upi://pay?${p.toString().replace(/\+/g, '%20')}`;
}

export function buildWhatsAppText(data: AppData): string {
  const { room, expenses, settlements } = data;
  const members = room.members;
  const total = totalOf(expenses);
  const share = members.length ? total / members.length : 0;
  const spent = spentByMember(expenses, members);
  const net = netBalances(expenses, settlements, members);
  const transfers = simplifyDebts(net);
  const lines: string[] = [];
  lines.push(`🏠 *${room.name}* – RoomieKhata`);
  lines.push(`📅 ${monthLabel()}`);
  lines.push('');
  lines.push(`💰 *Total Room Kharcha:* ${formatINR(total)}`);
  lines.push(`👥 *Per person share:* ${formatINR(share)} (${members.length} members)`);
  lines.push('');
  lines.push('📊 *Kisne kitna kharch kiya*');
  members.forEach((m) => {
    const n = net[m.id] ?? 0;
    const tag = n >= 0.5 ? `(+${formatINR(n)} lena hai)` : n <= -0.5 ? `(-${formatINR(-n)} dena hai)` : '(balanced ✅)';
    lines.push(`• ${m.name}: ${formatINR(spent[m.id] ?? 0)} ${tag}`);
  });
  lines.push('');
  lines.push('🤝 *Hisab Clear Karo*');
  if (!transfers.length) {
    lines.push('✅ Sab barabar hai, koi payment baaki nahi!');
  } else {
    transfers.forEach((t) => {
      const to = members.find((m) => m.id === t.to);
      lines.push(
        `• ${realName(members, t.from)} ➜ ${realName(members, t.to)}: *${formatINR(t.amount)}*${
          to?.upiId ? ` (UPI: ${to.upiId})` : ''
        }`,
      );
    });
  }
  lines.push('');
  lines.push('_Sent via RoomieKhata_');
  return lines.join('\n');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
