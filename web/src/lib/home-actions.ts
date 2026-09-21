'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { requireStaffAccess } from './portal-access';
import { floorFromUnitCode } from './units';
import { UNIT_KINDS } from './unit-kinds';


function back(buildingId: string, extra = ''): never {
  revalidatePath('/staff/homes');
  revalidatePath('/apply/homes');
  redirect(`/staff/homes?building=${buildingId}${extra}`);
}

function unitValues(formData: FormData) {
  const kind = String(formData.get('kind') ?? 'unspecified');
  const rooms = Number.parseInt(String(formData.get('roomCount') ?? '1'), 10);
  const from = String(formData.get('availableFrom') ?? '').trim();
  return {
    kind: (UNIT_KINDS as readonly string[]).includes(kind) ? kind : 'unspecified',
    roomCount: Math.max(1, Math.min(12, Number.isFinite(rooms) ? rooms : 1)),
    furnished: formData.get('furnished') === 'on',
    temporary: formData.get('temporary') === 'on',
    openForApplications: formData.get('openForApplications') === 'on',
    availableFrom: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : null,
  };
}

export async function saveUnitAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');
  const values = unitValues(formData);
  const unit = await db.orm.public.Unit.where({ id }).first();
  // A studio is one room by definition.
  if (unit) await db.orm.public.Unit.where({ id }).update({ ...values, roomCount: values.kind === 'studio' ? 1 : values.roomCount });
  back(buildingId);
}

export async function addUnitsAction(formData: FormData) {
  await requireStaffAccess();
  const buildingId = String(formData.get('buildingId') ?? '');
  const label = String(formData.get('stairwell') ?? '').trim().slice(0, 10) || 'A';
  const codes = [...new Set(String(formData.get('codes') ?? '').split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean))];
  const values = unitValues(formData);

  let stairwell = await db.orm.public.Stairwell.where({ buildingId, label }).first();
  if (!stairwell) stairwell = await db.orm.public.Stairwell.create({ buildingId, label });

  let added = 0;
  for (const code of codes) {
    let floor: number;
    try {
      floor = floorFromUnitCode(code);
    } catch {
      continue;
    }
    if (await db.orm.public.Unit.where({ stairwellId: stairwell.id, code }).first()) continue;
    await db.orm.public.Unit.create({
      stairwellId: stairwell.id,
      code,
      floor,
      ...values,
      roomCount: values.kind === 'studio' ? 1 : values.roomCount,
    });
    added += 1;
  }
  back(buildingId, `&added=${added}`);
}

export async function deleteUnitAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');
  const residents = await db.orm.public.Tenant.where({ unitId: id }).all();
  if (residents.length === 0) await db.orm.public.Unit.where({ id }).delete();
  back(buildingId);
}
