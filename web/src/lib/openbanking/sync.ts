import { db } from '../../prisma/db';
import { getSplitterConfig } from '../splitter';
import { bankAdapter } from './index';

const KEEP_DAYS = 60;

// Fetches the last 30 days and keeps only what the flat splitter needs: small
// outgoing purchases and small incoming transfers. Everything else, such as
// rent or large payments, is never stored. Entries older than 60 days are removed.
export async function syncConnection(connectionId: string): Promise<{ added: number } | { error: 'expired' | 'off' }> {
  const connection = await db.orm.public.BankConnection.where({ id: connectionId }).first();
  const adapter = bankAdapter();
  if (!connection || !adapter || adapter.name !== connection.provider) return { error: 'off' };
  if (connection.consentExpiresAt && new Date(connection.consentExpiresAt).getTime() < Date.now()) return { error: 'expired' };

  const { microLimitCents } = await getSplitterConfig();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const txs = await adapter.transactions({ sessionRef: connection.sessionRef, accountRef: connection.accountRef, sinceIso: since, tenantId: connection.tenantId });

  const existing = new Set((await db.orm.public.LedgerEntry.where({ connectionId }).all()).map((e) => e.externalId));
  let added = 0;
  for (const tx of txs) {
    if (Math.abs(tx.amountCents) === 0 || Math.abs(tx.amountCents) > microLimitCents) continue;
    if (existing.has(tx.externalId)) continue;
    await db.orm.public.LedgerEntry.create({
      connectionId,
      externalId: tx.externalId,
      bookedAt: tx.bookedAt,
      amountCents: tx.amountCents,
      currency: tx.currency,
      counterparty: tx.counterparty.slice(0, 120),
      description: tx.description.slice(0, 200),
    });
    added += 1;
  }

  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  const all = await db.orm.public.LedgerEntry.where({ connectionId }).all();
  for (const e of all) if (new Date(e.bookedAt).getTime() < cutoff) await db.orm.public.LedgerEntry.where({ id: e.id }).delete();

  await db.orm.public.BankConnection.where({ id: connectionId }).update({ lastSyncAt: new Date().toISOString() });
  return { added };
}
