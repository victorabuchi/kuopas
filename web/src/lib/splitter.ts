import { getSetting } from './settings';

// Kuopas rents are all-inclusive, so by default the bill splitter is only for
// small purchases the flat makes together. An admin can switch to "all" to
// allow utilities and other bills too.
export const MICRO_CATEGORIES = ['dish_soap', 'coffee', 'cleaning', 'paper', 'kitchen', 'groceries', 'other_micro'] as const;
export const BILL_CATEGORIES = ['wifi', 'electricity', 'water', 'other'] as const;

export type SplitterConfig = { mode: 'micro' | 'all'; microLimitCents: number };

export const DEFAULT_MICRO_LIMIT_CENTS = 10000;

export async function getSplitterConfig(): Promise<SplitterConfig> {
  const mode = (await getSetting('splitter.mode')) === 'all' ? 'all' : 'micro';
  const limit = Number.parseInt((await getSetting('splitter.microLimitCents')) ?? '', 10);
  return { mode, microLimitCents: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_MICRO_LIMIT_CENTS };
}

export function allowedCategories(config: SplitterConfig): string[] {
  return config.mode === 'all' ? [...MICRO_CATEGORIES, ...BILL_CATEGORIES] : [...MICRO_CATEGORIES];
}

export type BillCheck = { ok: true; kind: 'micro' | 'bill' } | { ok: false; reason: 'category' | 'limit' };

export function checkBill(config: SplitterConfig, category: string, totalCents: number): BillCheck {
  if (!allowedCategories(config).includes(category)) return { ok: false, reason: 'category' };
  const micro = (MICRO_CATEGORIES as readonly string[]).includes(category);
  if (micro && totalCents > config.microLimitCents) return { ok: false, reason: 'limit' };
  return { ok: true, kind: micro ? 'micro' : 'bill' };
}
