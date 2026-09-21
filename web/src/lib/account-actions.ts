'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession, destroySession } from './session';
import { emailConfigured, sendEmail } from './email';
import { canDeleteAccount, createDeletionToken, deleteTenantAccount, readDeletionToken } from './account-deletion';

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// Anyone can ask from the public page. We answer the same way whether or not
// the address has an account, and only the mailbox owner can confirm.
export async function requestAccountDeletionAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email.includes('@')) redirect('/delete-account?error=email');

  const tenant = await db.orm.public.Tenant.where({ email }).first();
  let devLink = '';
  if (tenant) {
    const link = `${await origin()}/delete-account/confirm?token=${createDeletionToken(tenant.id)}`;
    const sent = await sendEmail(
      email,
      'Confirm deleting your Kuopas account',
      `Someone asked to delete the Kuopas account for this email address.\n\nIf that was you, open this link within 24 hours to confirm:\n${link}\n\nIf it was not you, ignore this email and nothing will happen.`,
    );
    if (!sent && !emailConfigured() && process.env.NODE_ENV !== 'production') devLink = link;
  }
  redirect(`/delete-account?sent=1${devLink ? `&devlink=${encodeURIComponent(devLink)}` : ''}`);
}

export async function confirmAccountDeletionAction(formData: FormData) {
  const tenantId = readDeletionToken(String(formData.get('token') ?? ''));
  if (!tenantId) redirect('/delete-account?error=token');
  const result = await deleteTenantAccount(tenantId);
  if (!result.ok) redirect(`/delete-account?error=${result.reason}`);
  const session = await getSession();
  if (session?.tenantId === tenantId) await destroySession();
  redirect('/delete-account/done');
}

// The signed-in path used from Settings: type your email to confirm.
export async function deleteMyAccountAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');
  if (String(formData.get('confirm') ?? '').trim().toLowerCase() !== tenant.email.toLowerCase()) redirect('/delete-account?error=confirm');

  const check = await canDeleteAccount(tenant.id);
  if (!check.ok) redirect(`/delete-account?error=${check.reason}`);
  await deleteTenantAccount(tenant.id);
  await destroySession();
  redirect('/delete-account/done');
}
