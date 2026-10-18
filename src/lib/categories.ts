import type { Category } from '../types';

export const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'groceries', label: 'Groceries', emoji: '🛒' },
  { key: 'food', label: 'Food', emoji: '🍛' },
  { key: 'bills', label: 'Bills', emoji: '🧾' },
  { key: 'rent', label: 'Rent', emoji: '🏠' },
  { key: 'other', label: 'Other', emoji: '📦' },
];

export const QUICK_TITLES: { title: string; category: Category }[] = [
  { title: 'Sabzi', category: 'groceries' },
  { title: 'Milk', category: 'groceries' },
  { title: 'Cylinder', category: 'bills' },
  { title: 'Dinner', category: 'food' },
  { title: 'WiFi', category: 'bills' },
  { title: 'Room Rent', category: 'rent' },
];

interface Look {
  emoji: string;
  tail?: string;
  tint: string; // css color for ring/bg
}

const KEYWORDS: { re: RegExp; look: Look }[] = [
  { re: /sabzi|sabji|veg|tamatar|aloo|pyaz/i, look: { emoji: '🧺', tail: '🥬', tint: '#d9822b' } },
  { re: /milk|doodh|dairy|dahi|curd/i, look: { emoji: '🥛', tail: '🥛', tint: '#3b9bff' } },
  { re: /cylinder|gas|lpg/i, look: { emoji: '🧯', tint: '#ff4d5e' } },
  { re: /wifi|internet|broadband/i, look: { emoji: '📶', tint: '#8b7bff' } },
  { re: /chai|tea|samosa|coffee/i, look: { emoji: '☕', tint: '#c98a4b' } },
  { re: /dinner|lunch|breakfast|food|zomato|swiggy|pizza|biryani/i, look: { emoji: '🍛', tint: '#f59e0b' } },
  { re: /rent/i, look: { emoji: '🏠', tint: '#22c97a' } },
  { re: /electric|bijli|light|bill/i, look: { emoji: '💡', tint: '#facc15' } },
  { re: /clean|soap|detergent|broom/i, look: { emoji: '🧼', tint: '#38bdf8' } },
];

const CATEGORY_LOOK: Record<Category, Look> = {
  groceries: { emoji: '🛒', tint: '#22c97a' },
  food: { emoji: '🍛', tint: '#f59e0b' },
  bills: { emoji: '🧾', tint: '#8b7bff' },
  rent: { emoji: '🏠', tint: '#22c97a' },
  other: { emoji: '📦', tint: '#9aa6ba' },
};

export function lookFor(title: string, category: Category): Look {
  const hit = KEYWORDS.find((k) => k.re.test(title));
  return hit ? hit.look : CATEGORY_LOOK[category];
}

export function categoryLabel(c: Category): string {
  return CATEGORIES.find((x) => x.key === c)?.label ?? c;
}
