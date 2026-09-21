'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { savePhotoUpload } from './uploads';
import { sendPushToTenant } from './push';
import { assignCluster } from './maintenance';
import { AREAS, CONDITIONS, INSPECTION_KINDS, TEMPLATE, fingerprint } from './inspection';

const EDITABLE = ['draft', 'changes_requested'];

async function requireTenant() {
  const session = await getSession();
  if (!session) redirect('/login');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant?.unitId) redirect('/apply');
  return { tenant, unitId: tenant.unitId };
}

export async function startInspectionAction(formData: FormData) {
  const { tenant, unitId } = await requireTenant();
  const kind = String(formData.get('kind') ?? '');
  if (!(INSPECTION_KINDS as readonly string[]).includes(kind)) redirect('/inspection');

  const existing = await db.orm.public.Inspection.where({ tenantId: tenant.id, unitId, kind }).first();
  if (existing) redirect(`/inspection/${existing.id}`);

  const due = new Date();
  due.setDate(due.getDate() + (kind === 'move_in' ? 14 : 7));
  const inspection = await db.orm.public.Inspection.create({
    unitId,
    tenantId: tenant.id,
    kind,
    dueAt: due.toISOString(),
  });
  for (const row of TEMPLATE) await db.orm.public.InspectionItem.create({ inspectionId: inspection.id, area: row.area, item: row.item });
  revalidatePath('/inspection');
  redirect(`/inspection/${inspection.id}`);
}

async function ownEditable(inspectionId: string) {
  const { tenant } = await requireTenant();
  const inspection = await db.orm.public.Inspection.where({ id: inspectionId }).first();
  if (!inspection || inspection.tenantId !== tenant.id) redirect('/inspection');
  return inspection;
}

export async function saveInspectionAreaAction(formData: FormData) {
  const inspectionId = String(formData.get('inspectionId') ?? '');
  const area = String(formData.get('area') ?? '');
  const inspection = await ownEditable(inspectionId);
  const def = AREAS.find((a) => a.key === area);
  if (!def || !EDITABLE.includes(inspection.status)) redirect(`/inspection/${inspectionId}`);

  const items = await db.orm.public.InspectionItem.where({ inspectionId, area }).all();
  for (const key of def.items) {
    const row = items.find((i) => i.item === key);
    if (!row) continue;
    const condition = String(formData.get(`condition_${key}`) ?? 'unset');
    if (condition !== 'unset' && !(CONDITIONS as readonly string[]).includes(condition)) continue;
    const note = String(formData.get(`note_${key}`) ?? '').trim().slice(0, 300) || null;
    const uploaded = await savePhotoUpload(formData.get(`photo_${key}`) as File | null, `inspections/${inspectionId}`);
    const photoUrl = uploaded ?? (formData.get(`removephoto_${key}`) === '1' ? null : row.photoUrl);
    await db.orm.public.InspectionItem.where({ id: row.id }).update({ condition, note, photoUrl });
  }
  revalidatePath(`/inspection/${inspectionId}`);
  redirect(`/inspection/${inspectionId}?saved=${area}#${area}`);
}

export async function submitInspectionAction(formData: FormData) {
  const inspectionId = String(formData.get('inspectionId') ?? '');
  const inspection = await ownEditable(inspectionId);
  if (!EDITABLE.includes(inspection.status)) redirect(`/inspection/${inspectionId}`);

  const items = await db.orm.public.InspectionItem.where({ inspectionId }).all();
  if (items.some((i) => i.condition === 'unset')) redirect(`/inspection/${inspectionId}?error=incomplete`);
  if (items.some((i) => ['minor', 'damaged', 'missing'].includes(i.condition) && !i.note && !i.photoUrl)) {
    redirect(`/inspection/${inspectionId}?error=evidence`);
  }

  const submittedAt = new Date().toISOString();
  await db.orm.public.Inspection.where({ id: inspectionId }).update({
    status: 'submitted',
    submittedAt,
    contentHash: fingerprint(inspectionId, inspection.tenantId, submittedAt, items),
    staffNote: null,
  });
  revalidatePath('/inspection');
  revalidatePath('/staff/inspections');
  redirect(`/inspection/${inspectionId}?submitted=1`);
}

// Staff side.
export async function reviewInspectionAction(formData: FormData) {
  const access = await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;
  const inspection = await db.orm.public.Inspection.where({ id }).first();
  if (!inspection || inspection.status !== 'submitted') redirect(`/staff/inspections/${id}`);

  if (decision === 'acknowledge') {
    await db.orm.public.Inspection.where({ id }).update({
      status: 'acknowledged',
      acknowledgedById: access.staffId,
      acknowledgedAt: new Date().toISOString(),
      staffNote: note,
    });
  } else if (decision === 'changes') {
    await db.orm.public.Inspection.where({ id }).update({ status: 'changes_requested', staffNote: note });
    await sendPushToTenant(inspection.tenantId, { title: 'Kuopas', body: 'Kuopas asked for changes to your inspection', url: `/inspection/${id}` }).catch(() => undefined);
  }
  revalidatePath('/staff/inspections');
  revalidatePath(`/staff/inspections/${id}`);
  redirect(`/staff/inspections/${id}`);
}

const TICKET_CATEGORY: Record<string, 'plumbing' | 'electrical' | 'heating' | 'appliance' | 'pest' | 'noise' | 'structural' | 'other'> = {
  'kitchen.sink': 'plumbing',
  'bathroom.toilet': 'plumbing',
  'bathroom.shower': 'plumbing',
  'bathroom.sink': 'plumbing',
  'bathroom.ventilation': 'heating',
  'room.electrics': 'electrical',
  'kitchen.stove': 'appliance',
  'kitchen.fridge': 'appliance',
};

// Turns a recorded defect into a maintenance ticket, so the maintenance team
// works from the same photo the resident took.
export async function openTicketFromItemAction(formData: FormData) {
  await requireStaffAccess();
  const itemId = String(formData.get('itemId') ?? '');
  const item = await db.orm.public.InspectionItem.where({ id: itemId }).first();
  const inspection = item ? await db.orm.public.Inspection.where({ id: item.inspectionId }).first() : null;
  if (!item || !inspection) return;

  const complaint = await db.orm.public.Complaint.create({
    tenantId: inspection.tenantId,
    category: TICKET_CATEGORY[`${item.area}.${item.item}`] ?? 'structural',
    description: `From the ${inspection.kind === 'move_in' ? 'move-in' : 'move-out'} inspection: ${item.area} / ${item.item} is ${item.condition}. ${item.note ?? ''}`.trim(),
    photoUrl: item.photoUrl,
  });
  await assignCluster(complaint.id);
  revalidatePath('/staff/complaints');
  redirect(`/staff/inspections/${inspection.id}?ticket=1`);
}
