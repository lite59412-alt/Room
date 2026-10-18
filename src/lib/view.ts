import type { AppData, ExpenseEntry, Transfer } from '../types';
import type { RoomStore } from '../hooks/useRoomData';
import type { Tab } from '../components/BottomNav';
import type { PushApi } from '../hooks/usePush';
import { dailyTotals, netBalances, simplifyDebts, sortExpenses, spentByMember, totalOf } from './calc';

export interface View {
  total: number;
  share: number;
  spent: Record<string, number>;
  net: Record<string, number>;
  transfers: Transfer[];
  daily: number[];
  sorted: ExpenseEntry[];
}

export function buildView(d: AppData): View {
  const members = d.room.members;
  const total = totalOf(d.expenses);
  const net = netBalances(d.expenses, d.settlements, members);
  return {
    total,
    share: members.length ? total / members.length : 0,
    spent: spentByMember(d.expenses, members),
    net,
    transfers: simplifyDebts(net),
    daily: dailyTotals(d.expenses, 14),
    sorted: sortExpenses(d.expenses),
  };
}

export interface UI {
  openExpense: (e: ExpenseEntry) => void;
  openAdd: () => void;
  openPay: (t: Transfer) => void;
  openRoom: () => void;
  notify: (msg: string) => void;
  goTab: (t: Tab) => void;
  openProfile: () => void;
  signOut: () => void;
  push: PushApi;
  /** undefined unless the signed-in user is the authorised admin */
  openAdmin?: () => void;
}

export interface TabProps {
  store: RoomStore;
  view: View;
  ui: UI;
}
