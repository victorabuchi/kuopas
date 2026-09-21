import { getSetting } from '../settings';
import type { BankAdapter, BankConsent, BankTx } from './types';

// Development stand-in: no real bank, fake transactions. A developer can
// replace the list for one person by saving JSON under the setting
// "mockbank:<tenantId>" (an array of BankTx).
function isoDaysAgo(days: number, hour = 12): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function defaultMockTransactions(): BankTx[] {
  return [
    { externalId: 'mock-1', bookedAt: isoDaysAgo(1), amountCents: -490, currency: 'EUR', counterparty: 'K-Market Kuopio', description: 'Card purchase dish soap' },
    { externalId: 'mock-2', bookedAt: isoDaysAgo(2), amountCents: -1235, currency: 'EUR', counterparty: 'S-market Petonen', description: 'Card purchase groceries' },
    { externalId: 'mock-3', bookedAt: isoDaysAgo(3), amountCents: -780, currency: 'EUR', counterparty: 'Lidl Kuopio', description: 'Card purchase coffee' },
    { externalId: 'mock-4', bookedAt: isoDaysAgo(4), amountCents: -1099, currency: 'EUR', counterparty: 'Spotify', description: 'Subscription' },
    { externalId: 'mock-5', bookedAt: isoDaysAgo(5), amountCents: -30000, currency: 'EUR', counterparty: 'Kuopas rent', description: 'Rent' },
    { externalId: 'mock-6', bookedAt: isoDaysAgo(6), amountCents: 500, currency: 'EUR', counterparty: 'Nobody Special', description: 'Lunch money' },
  ];
}

export const mockAdapter: BankAdapter = {
  name: 'mock',
  async banks() {
    return [{ name: 'Mock Bank' }];
  },
  async start({ origin, state, redirectUrl }) {
    return `${origin}/api/dev/mock-bank/consent?state=${encodeURIComponent(state)}&redirect=${encodeURIComponent(redirectUrl)}`;
  },
  async complete({ code }): Promise<BankConsent> {
    if (code !== 'mock-approved') throw new Error('Consent was not approved');
    return {
      sessionRef: `mock-session-${Date.now()}`,
      accounts: [{ ref: 'MOCK-ACC-1', label: 'FI** **** **** 0001' }],
      validUntil: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    };
  },
  async transactions({ tenantId, sinceIso }): Promise<BankTx[]> {
    const custom = await getSetting(`mockbank:${tenantId}`);
    const all = custom ? (JSON.parse(custom) as BankTx[]) : defaultMockTransactions();
    return all.filter((t) => t.bookedAt >= sinceIso);
  },
};
