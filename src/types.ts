export type Category = 'groceries' | 'food' | 'bills' | 'rent' | 'other';

export interface Member {
  /** Firebase Auth uid */
  id: string;
  name: string;
  email?: string;
  phone?: string;
  upiId?: string;
  /** Google photo URL (empty → initials) */
  avatar: string;
}

/** users/{uid} */
export interface Profile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  upiId: string;
  phone: string;
  currentRoomCode: string;
  createdAt: number;
  onboarded?: boolean;
  /** one-time message shown on the room-picker (e.g. "This room was closed by Admin."); cleared after the user dismisses it */
  notice?: string;
}

export interface Announcement {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'success';
  createdAt: number;
  by?: string;
}

/** config/app — global switches controlled by the admin */
export interface AppConfig {
  announcement?: Announcement | null;
  maintenance?: boolean;
  maintenanceMessage?: string;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  members: Member[];
  createdBy?: string;
  createdAt?: number;
  /** Month-archive cut-off: ledger entries older than this belong to an archive */
  cycleStart?: number;
}

export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  splitBetween: string[];
  category: Category;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
  /** uid of the account that created this entry — only this user (or Super Admin) may edit/delete it */
  addedBy?: string;
  createdAt?: number;
}

export interface SettlementRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date: string;
  paymentMethod: 'UPI' | 'Cash';
  /** pending = payer claims to have paid, waiting for the receiver to approve */
  status: 'pending_receiver_approval' | 'settled' | 'rejected';
  time?: string;
  createdAt?: number;
}

export interface ArchiveRecord {
  id: string;
  label: string;
  archivedAt: number;
  total: number;
  perPerson: number;
  members: Member[];
  spentByMember: Record<string, number>;
  expenses: ExpenseEntry[];
  settlements: SettlementRecord[];
}

export interface AppData {
  room: Room;
  expenses: ExpenseEntry[];
  settlements: SettlementRecord[];
  archives: ArchiveRecord[];
  updatedAt: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'syncing' | 'error';

export interface ToastInfo {
  id: string;
  who: string;
  amount: number;
  title: string;
  at: number;
}

