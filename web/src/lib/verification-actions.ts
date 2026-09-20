'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { savePrivateDocument, deletePrivateDocument } from './uploads';
import { confirmEmailCode, sendEmailCode } from './verification';

const BACK = '/lease?tab=verify';

async function requireTenant(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  return session.tenantId;
}

export async function requestEmailCodeAction(formData: FormData) {
  const tenantId = await requireTenant();
  const email = String(formData.get('email') ?? '').trim();
  const result = await sendEmailCode(tenantId, email);
  if (!result.ok) redirect(`${BACK}&err=${result.error}`);
  redirect(`${BACK}&sent=1${result.devCode ? `&devcode=${result.devCode}` : ''}`);
}

export async function confirmEmailCodeAction(formData: FormData) {
  const tenantId = await requireTenant();
  const code = String(formData.get('code') ?? '').trim();
  const ok = await confirmEmailCode(tenantId, code);
  revalidatePath('/lease');
  redirect(ok ? `${BACK}&done=1` : `${BACK}&err=code`);
}

export async function submitDocumentVerificationAction(formData: FormData) {
  const tenantId = await requireTenant();
  const method = String(formData.get('method') ?? '');
  if (method !== 'government_id' && method !== 'enrollment_document') throw new Error('Invalid document type');

  const pending = await db.orm.public.IdentityVerification.where({ tenantId, status: 'pending' }).first();
  if (pending) redirect(`${BACK}&docsent=1`);

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) redirect(`${BACK}&err=file`);

  const docPath = await savePrivateDocument(file, `verification/${tenantId}`);
  await db.orm.public.IdentityVerification.create({
    tenantId,
    method,
    status: 'pending',
    institution: String(formData.get('institution') ?? '').trim() || null,
    detail: String(formData.get('studentNumber') ?? '').trim() || null,
    docPath,
  });

  revalidatePath('/staff/verifications');
  redirect(`${BACK}&docsent=1`);
}

// Staff review. The document is deleted the moment a decision is made.
export async function reviewVerificationAction(formData: FormData) {
  const access = await requireStaffAccess();
  const id = String(formData.get('id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('Invalid decision');

  const record = await db.orm.public.IdentityVerification.where({ id }).first();
  if (!record || record.status !== 'pending') return;

  await deletePrivateDocument(record.docPath);
  await db.orm.public.IdentityVerification.where({ id }).update({
    status: decision,
    reviewNote: note,
    reviewedById: access.staffId,
    decidedAt: new Date().toISOString(),
    docPath: null,
  });

  revalidatePath('/staff/verifications');
}

export async function addVerifiedDomainAction(formData: FormData) {
  const access = await requireStaffAccess();
  if (!access.isAdmin) throw new Error('Only an admin can do this');

  const domain = String(formData.get('domain') ?? '').trim().toLowerCase().replace(/^@/, '');
  const institution = String(formData.get('institution') ?? '').trim();
  if (!domain.includes('.') || !institution) throw new Error('Domain and institution are required');

  const existing = await db.orm.public.VerifiedDomain.where({ domain }).first();
  if (!existing) await db.orm.public.VerifiedDomain.create({ domain, institution });
  revalidatePath('/admin/verification');
}

export async function removeVerifiedDomainAction(formData: FormData) {
  const access = await requireStaffAccess();
  if (!access.isAdmin) throw new Error('Only an admin can do this');
  await db.orm.public.VerifiedDomain.where({ id: String(formData.get('id') ?? '') }).delete();
  revalidatePath('/admin/verification');
}

