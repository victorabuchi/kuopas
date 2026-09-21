import { enableBankingAdapter } from './enablebanking';
import { mockAdapter } from './mock';
import type { BankAdapter } from './types';

export type BankMode = 'off' | 'mock' | 'enablebanking';

// OPENBANKING_PROVIDER=enablebanking needs its keys, and "mock" is refused in production.
export function bankMode(): BankMode {
  const provider = process.env['OPENBANKING_PROVIDER'];
  if (provider === 'enablebanking' && process.env['ENABLEBANKING_APP_ID'] && process.env['ENABLEBANKING_PRIVATE_KEY']) return 'enablebanking';
  if (provider === 'mock' && process.env.NODE_ENV !== 'production') return 'mock';
  return 'off';
}

export function bankAdapter(): BankAdapter | null {
  const mode = bankMode();
  return mode === 'enablebanking' ? enableBankingAdapter : mode === 'mock' ? mockAdapter : null;
}

export { defaultMockTransactions } from './mock';
export type { BankTx } from './types';
