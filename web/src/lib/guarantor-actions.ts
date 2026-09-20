'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';

const BACK = '/lease?tab=guarantor';

export async function requestGuarantorAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const institutionId = String(formData.get('institutionId') ?? '').trim();
  const open = await db.orm.public.GuarantorRequest.where({ tenantId: session.tenantId, status: 'pending' }).first();
  if (open) redirect(`${BACK}&sent=1`);

  if (institutionId) {
    const institution = await db.orm.public.GuarantorInstitution.where({ id: institutionId }).first();
    if (!institution || !institution.active) throw new Error('Institution not available');
    await db.orm.public.GuarantorRequest.create({ tenantId: session.tenantId, kind: 'institution', institutionId });
  } else {
    const guarantorName = String(formData.get('guarantorName') ?? '').trim();
    const guarantorEmail = String(formData.get('guarantorEmail') ?? '').trim();
    const guarantorPhone = String(formData.get('guarantorPhone') ?? '').trim();
    if (!guarantorName || (!guarantorEmail && !guarantorPhone)) {
      throw new Error('A guarantor name and an email or phone are required');
    }
    await db.orm.public.GuarantorRequest.create({
      tenantId: session.tenantId,
      kind: 'personal',
      guarantorName,
      guarantorEmail: guarantorEmail || null,
      guarantorPhone: guarantorPhone || null,
    });
  }

  revalidatePath('/staff/guarantors');
  redirect(`${BACK}&sent=1`);
}

export async function reviewGuarantorAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '');
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('Invalid decision');

  await db.orm.public.GuarantorRequest.where({ id }).update({
    status: decision,
    staffNote: String(formData.get('note') ?? '').trim() || null,
    decidedAt: new Date().toISOString(),
  });
  revalidatePath('/staff/guarantors');
}

export async function addGuarantorInstitutionAction(formData: FormData) {
  await requireStaffAccess();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim() || null;
  if (!name || !description) throw new Error('Name and description are required');
  await db.orm.public.GuarantorInstitution.create({ name, description, url });
  revalidatePath('/staff/guarantors');
}

export async function removeGuarantorInstitutionAction(formData: FormData) {
  await requireStaffAccess();
  await db.orm.public.GuarantorInstitution.where({ id: String(formData.get('id') ?? '') }).delete();
  revalidatePath('/staff/guarantors');
}
