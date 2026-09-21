// Open banking (PSD2) provider contract. A resident connects one bank account
// read-only; we only ever fetch transactions, never move money.
export type BankTx = {
  externalId: string;
  bookedAt: string; // ISO
  amountCents: number; // negative = money out
  currency: string;
  counterparty: string;
  description: string;
};

export type BankAccount = { ref: string; label: string };

export type BankConsent = {
  sessionRef: string;
  accounts: BankAccount[];
  validUntil: string | null;
};

export type BankBank = { name: string };

export interface BankAdapter {
  name: string;
  // Banks the resident can choose from (empty when the provider picks one itself).
  banks(): Promise<BankBank[]>;
  // Returns the URL the resident is sent to in order to approve read access.
  start(input: { origin: string; state: string; bank: string | null; redirectUrl: string }): Promise<string>;
  // Exchanges what the bank sent back for a session and the accounts it covers.
  complete(input: { origin: string; code: string; tenantId: string }): Promise<BankConsent>;
  transactions(input: { sessionRef: string; accountRef: string; sinceIso: string; tenantId: string }): Promise<BankTx[]>;
}
