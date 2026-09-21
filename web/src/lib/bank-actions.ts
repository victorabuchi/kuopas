'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { splitCents } from './split';
import { MICRO_CATEGORIES, checkBill, getSplitterConfig } from './splitter';
import { syncConnection } from './openbanking/sync';

async function member() {
  const session = await getSession();
  if (!session) redirect('/login');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant?.unitId) redirect('/apply');
  const flatmates = await db.orm.public.Tenant.where({ unitId: tenant.unitId }).all();
  const connection = await db.orm.public.BankConnection.where({ tenantId: tenant.id }).first();
  return { tenant, unitId: tenant.unitId, flatmates, connection };
}

function back(extra = ''): never {
  revalidatePath('/household');
  redirect(`/household?tab=ledger${extra}`);
}

export async function syncBankAction() {
  const { connection } = await member();
  if (!connection) return back();
  // redirect() works by throwing, so it must stay outside the try block.
  let outcome = '&err=bank_failed';
  try {
    const result = await syncConnection(connection.id);
    outcome = 'error' in result ? `&err=${result.error === 'expired' ? 'bank_expired' : 'bank_off'}` : `&synced=${result.added}`;
  } catch (error) {
    console.error('Bank sync failed:', error);
  }
  return back(outcome);
}

export async function disconnectBankAction() {
  const { connection } = await member();
  // Entries go with the connection (cascade).
  if (connection) await db.orm.public.BankConnection.where({ id: connection.id }).delete();
  return back('&disconnected=1');
}

async function ownEntry(entryId: string, connectionId: string | undefined) {
  const entry = await db.orm.public.LedgerEntry.where({ id: entryId }).first();
  return entry && connectionId && entry.connectionId === connectionId ? entry : null;
}

export async function shareEntryAction(formData: FormData) {
  const { tenant, unitId, flatmates, connection } = await member();
  const entry = await ownEntry(String(formData.get('entryId') ?? ''), connection?.id);
  if (!entry || entry.status !== 'new' || entry.amountCents >= 0) return back();

  const category = String(formData.get('category') ?? '');
  const totalCents = Math.abs(entry.amountCents);
  const config = await getSplitterConfig();
  const check = checkBill(config, category, totalCents);
  if (!check.ok || !(MICRO_CATEGORIES as readonly string[]).includes(category)) return back('&err=error');

  const memberIds = new Set(flatmates.map((m) => m.id));
  let chosen = formData.getAll('participant').map(String).filter((id) => memberIds.has(id));
  if (chosen.length === 0) chosen = [...memberIds];
  if (!chosen.includes(tenant.id)) chosen.push(tenant.id);
  const amounts = splitCents(totalCents, chosen.map(() => 1));

  const bill = await db.orm.public.SharedBill.create({
    unitId,
    title: entry.counterparty || 'Shared purchase',
    category,
    totalCents,
    paidById: tenant.id,
    kind: 'micro',
    ledgerEntryId: entry.id,
    note: null,
  });
  const now = new Date().toISOString();
  for (const [i, id] of chosen.entries()) {
    await db.orm.public.BillShare.create({ billId: bill.id, tenantId: id, amountCents: amounts[i]!, paidAt: id === tenant.id ? now : null });
  }
  await db.orm.public.LedgerEntry.where({ id: entry.id }).update({ status: 'shared', billId: bill.id });
  return back();
}

export async function ignoreEntryAction(formData: FormData) {
  const { connection } = await member();
  const entry = await ownEntry(String(formData.get('entryId') ?? ''), connection?.id);
  if (entry && entry.status === 'new') await db.orm.public.LedgerEntry.where({ id: entry.id }).update({ status: 'ignored' });
  return back();
}

// A flatmate paid you back: confirm which share it settles.
export async function matchCreditAction(formData: FormData) {
  const { tenant, connection } = await member();
  const entry = await ownEntry(String(formData.get('entryId') ?? ''), connection?.id);
  const share = await db.orm.public.BillShare.where({ id: String(formData.get('shareId') ?? '') }).first();
  if (!entry || !share || entry.status !== 'new' || entry.amountCents <= 0 || share.paidAt) return back();
  const bill = await db.orm.public.SharedBill.where({ id: share.billId }).first();
  if (!bill || bill.paidById !== tenant.id || share.amountCents !== entry.amountCents) return back();

  await db.orm.public.BillShare.where({ id: share.id }).update({ paidAt: new Date().toISOString() });
  await db.orm.public.LedgerEntry.where({ id: entry.id }).update({ status: 'matched', billId: bill.id });
  return back();
}
