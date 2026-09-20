'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getStaffAccess, requireStaffAccess } from './portal-access';
import { savePhotoUpload, saveMediaUpload } from './uploads';
import { assignCluster } from './maintenance';

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
  const video = await saveMediaUpload(formData.get('video') as File | null, 'complaints');
  if (video && video.kind !== 'video') throw new Error('Use the photo field for pictures');

  const complaint = await db.orm.public.Complaint.create({
    tenantId: session.tenantId,
    category: category as (typeof CATEGORIES)[number],
    description,
    photoUrl,
    videoUrl: video?.url ?? null,
  });
  await assignCluster(complaint.id);

  revalidatePath('/messages');
}

// `actingAs` disambiguates an admin, who has both a tenant session and staff
// access at once: the tenant-side complaint thread always sends "tenant",
// the staff-side one always sends "staff", so an admin replying to their own
// complaint as a resident is never misattributed as a staff reply.
export async function sendComplaintMessageAction(formData: FormData) {
  const complaintId = String(formData.get('complaintId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const actingAs = String(formData.get('actingAs') ?? 'tenant');
  if (!complaintId || !content) throw new Error('Message content is required');

  const tenantSession = await getSession();
  const staffAccess = actingAs === 'staff' ? await getStaffAccess() : null;
  if (!tenantSession && !staffAccess) throw new Error('Not signed in');

  const complaint = await db.orm.public.Complaint.where({ id: complaintId }).first();
  if (!complaint) throw new Error('Complaint not found');
  if (!staffAccess) {
    if (!tenantSession || complaint.tenantId !== tenantSession.tenantId) {
      throw new Error('Not your complaint');
    }
  }

  await db.orm.public.ComplaintMessage.create({
    complaintId,
    senderTenantId: staffAccess ? null : tenantSession!.tenantId,
    senderStaffId: staffAccess ? staffAccess.staffId : null,
    content,
  });

  if (staffAccess && complaint.status === 'new') {
    await db.orm.public.Complaint.where({ id: complaintId }).update({
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    });
  }

  revalidatePath(`/complaints/${complaintId}`);
  revalidatePath(`/staff/complaints/${complaintId}`);
}

export async function updateComplaintStatusAction(formData: FormData) {
  await requireStaffAccess();

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
  await requireStaffAccess();

  const complaintId = String(formData.get('complaintId') ?? '').trim();
  const assignedStaffId = String(formData.get('assignedStaffId') ?? '').trim() || null;

  await db.orm.public.Complaint.where({ id: complaintId }).update({ assignedStaffId });

  revalidatePath(`/staff/complaints/${complaintId}`);
  revalidatePath('/staff/complaints');
}
