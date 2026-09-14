'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getStaffSession } from './staff-session';
import { savePhotoUpload } from './uploads';

const CATEGORIES = [
  'plumbing', 'electrical', 'heating', 'appliance', 'pest', 'noise', 'structural', 'other',
] as const;

export async function submitComplaintAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const category = String(formData.get('category') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const photo = formData.get('photo') as File | null;

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    throw new Error('Invalid category');
  }
  if (!description) throw new Error('Description is required');

  const photoUrl = await savePhotoUpload(photo, 'complaints');

  await db.orm.public.Complaint.create({
    tenantId: session.tenantId,
    category: category as (typeof CATEGORIES)[number],
    description,
    photoUrl,
  });

  revalidatePath('/complaints');
}

export async function sendComplaintMessageAction(formData: FormData) {
  const complaintId = String(formData.get('complaintId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!complaintId || !content) throw new Error('Message content is required');

  const tenantSession = await getSession();
  const staffSession = await getStaffSession();
  if (!tenantSession && !staffSession) throw new Error('Not signed in');

  const complaint = await db.orm.public.Complaint.where({ id: complaintId }).first();
  if (!complaint) throw new Error('Complaint not found');
  if (tenantSession && complaint.tenantId !== tenantSession.tenantId) {
    throw new Error('Not your complaint');
  }

  await db.orm.public.ComplaintMessage.create({
    complaintId,
    senderTenantId: tenantSession ? tenantSession.tenantId : null,
    senderStaffId: staffSession ? staffSession.staffId : null,
    content,
  });

  if (staffSession && complaint.status === 'new') {
    await db.orm.public.Complaint.where({ id: complaintId }).update({
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    });
  }

  revalidatePath(`/complaints/${complaintId}`);
  revalidatePath(`/staff/complaints/${complaintId}`);
}

export async function updateComplaintStatusAction(formData: FormData) {
  const staffSession = await getStaffSession();
  if (!staffSession) throw new Error('Not signed in as staff');

  const complaintId = String(formData.get('complaintId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!['new', 'in_progress', 'resolved'].includes(status)) throw new Error('Invalid status');

  await db.orm.public.Complaint.where({ id: complaintId }).update({
    status: status as 'new' | 'in_progress' | 'resolved',
    updatedAt: new Date().toISOString(),
  });

  revalidatePath(`/staff/complaints/${complaintId}`);
  revalidatePath('/staff/complaints');
}

export async function assignComplaintAction(formData: FormData) {
  const staffSession = await getStaffSession();
  if (!staffSession) throw new Error('Not signed in as staff');

  const complaintId = String(formData.get('complaintId') ?? '').trim();
  const assignedStaffId = String(formData.get('assignedStaffId') ?? '').trim() || null;

  await db.orm.public.Complaint.where({ id: complaintId }).update({ assignedStaffId });

  revalidatePath(`/staff/complaints/${complaintId}`);
  revalidatePath('/staff/complaints');
}
