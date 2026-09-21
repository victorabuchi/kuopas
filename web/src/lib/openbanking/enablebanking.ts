import { createSign } from 'node:crypto';
import type { BankAdapter, BankBank, BankConsent, BankTx } from './types';

// Enable Banking (enablebanking.com) adapter, a Finnish open banking
// aggregator that covers Finnish banks. Required environment:
//   ENABLEBANKING_APP_ID        application id (also the JWT key id)
//   ENABLEBANKING_PRIVATE_KEY   the application's RSA private key in PEM form
//                               (use \n for line breaks when set as one line)
//
// NOTE: written from Enable Banking's public API description and NOT yet run
// against their live API. Check the request and response shapes with your
// Enable Banking sandbox before relying on it in production.

const API = 'https://api.enablebanking.com';

function jwt(): string {
  const appId = process.env['ENABLEBANKING_APP_ID'];
  const key = process.env['ENABLEBANKING_PRIVATE_KEY']?.replace(/\\n/g, '\n');
  if (!appId || !key) throw new Error('Enable Banking is not configured');
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ typ: 'JWT', alg: 'RS256', kid: appId });
  const body = b64({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(key).toString('base64url');
  return `${head}.${body}.${sig}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Enable Banking ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

type EbTx = {
  entry_reference?: string;
  transaction_id?: string;
  transaction_amount: { amount: string; currency: string };
  credit_debit_indicator?: 'DBIT' | 'CRDT';
  booking_date?: string;
  value_date?: string;
  creditor?: { name?: string };
  debtor?: { name?: string };
  remittance_information?: string[];
  status?: string;
};

export const enableBankingAdapter: BankAdapter = {
  name: 'enablebanking',
  async banks(): Promise<BankBank[]> {
    const { aspsps } = await call<{ aspsps: { name: string }[] }>('/aspsps?country=FI');
    return aspsps.map((a) => ({ name: a.name }));
  },
  async start({ state, bank, redirectUrl }) {
    if (!bank) throw new Error('Choose a bank');
    const { url } = await call<{ url: string }>('/auth', {
      method: 'POST',
      body: JSON.stringify({
        access: { valid_until: new Date(Date.now() + 90 * 86_400_000).toISOString() },
        aspsp: { name: bank, country: 'FI' },
        state,
        redirect_url: redirectUrl,
        psu_type: 'personal',
      }),
    });
    return url;
  },
  async complete({ code }): Promise<BankConsent> {
    const session = await call<{
      session_id: string;
      accounts: { uid: string; account_id?: { iban?: string }; name?: string }[];
      access?: { valid_until?: string };
    }>('/sessions', { method: 'POST', body: JSON.stringify({ code }) });
    return {
      sessionRef: session.session_id,
      accounts: session.accounts.map((a) => ({ ref: a.uid, label: a.account_id?.iban ? `${a.account_id.iban.slice(0, 4)} **** ${a.account_id.iban.slice(-4)}` : (a.name ?? 'Account') })),
      validUntil: session.access?.valid_until ?? null,
    };
  },
  async transactions({ accountRef, sinceIso }): Promise<BankTx[]> {
    const out: BankTx[] = [];
    let key: string | null = null;
    do {
      const query: string = `date_from=${sinceIso.slice(0, 10)}${key ? `&continuation_key=${encodeURIComponent(key)}` : ''}`;
      const page: { transactions: EbTx[]; continuation_key?: string | null } = await call(`/accounts/${accountRef}/transactions?${query}`);
      for (const t of page.transactions) {
        if (t.status && t.status !== 'BOOK') continue;
        const cents = Math.round(Number(t.transaction_amount.amount) * 100);
        const outgoing = t.credit_debit_indicator === 'DBIT';
        out.push({
          externalId: t.entry_reference ?? t.transaction_id ?? `${t.booking_date}-${t.transaction_amount.amount}-${t.creditor?.name ?? t.debtor?.name ?? ''}`,
          bookedAt: new Date(t.booking_date ?? t.value_date ?? Date.now()).toISOString(),
          amountCents: outgoing ? -Math.abs(cents) : Math.abs(cents),
          currency: t.transaction_amount.currency,
          counterparty: (outgoing ? t.creditor?.name : t.debtor?.name) ?? '',
          description: (t.remittance_information ?? []).join(' ').slice(0, 200),
        });
      }
      key = page.continuation_key ?? null;
    } while (key);
    return out;
  },
};
