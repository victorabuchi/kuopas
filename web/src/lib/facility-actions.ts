'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { requireStaffAccess } from './portal-access';
import { AMENITY_KINDS, INVENTORY_KINDS, isSpaceKind, removeParticipants } from './booking';

function backTo(buildingId: string, anchor = ''): never {
  revalidatePath('/staff/facilities');
  revalidatePath('/booking');
  redirect(`/staff/facilities?building=${buildingId}${anchor}`);
}

function intField(formData: FormData, name: string, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(formData.get(name) ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// One form sets every kind at once, for a building or for a single apartment.
// "auto" removes the explicit setting so the default applies again.
export async function saveAmenitiesAction(formData: FormData) {
  await requireStaffAccess();
  const scope = String(formData.get('scope') ?? '');
  const targetId = String(formData.get('targetId') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');

  for (const kind of AMENITY_KINDS) {
    const state = String(formData.get(`state_${kind}`) ?? 'auto');
    if (scope === 'building') {
      const row = await db.orm.public.BuildingAmenity.where({ buildingId: targetId, kind }).first();
      if (state === 'auto') {
        if (row) await db.orm.public.BuildingAmenity.where({ id: row.id }).delete();
      } else if (row) {
        await db.orm.public.BuildingAmenity.where({ id: row.id }).update({ enabled: state === 'yes' });
      } else {
        await db.orm.public.BuildingAmenity.create({ buildingId: targetId, kind, enabled: state === 'yes' });
      }
    } else if (scope === 'unit') {
      const row = await db.orm.public.UnitAmenity.where({ unitId: targetId, kind }).first();
      if (state === 'auto') {
        if (row) await db.orm.public.UnitAmenity.where({ id: row.id }).delete();
      } else if (row) {
        await db.orm.public.UnitAmenity.where({ id: row.id }).update({ enabled: state === 'yes' });
      } else {
        await db.orm.public.UnitAmenity.create({ unitId: targetId, kind, enabled: state === 'yes' });
      }
    }
  }
  backTo(buildingId);
}

export async function addInventoryAction(formData: FormData) {
  await requireStaffAccess();
  const kind = String(formData.get('kind') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');
  const label = String(formData.get('label') ?? '').trim().slice(0, 60);
  if (!label || !(INVENTORY_KINDS as readonly string[]).includes(kind)) backTo(buildingId, '#inventory');

  if (kind === 'laundry') {
    if (!(await db.orm.public.LaundryMachine.where({ buildingId, label }).first())) {
      await db.orm.public.LaundryMachine.create({ buildingId, label });
    }
  } else if (kind === 'sauna') {
    if (!(await db.orm.public.SaunaSlot.where({ buildingId, label }).first())) {
      await db.orm.public.SaunaSlot.create({ buildingId, label });
    }
  } else if (!(await db.orm.public.ParkingSpot.where({ buildingId, label }).first())) {
    await db.orm.public.ParkingSpot.create({ buildingId, label });
  }
  backTo(buildingId, '#inventory');
}

export async function removeInventoryAction(formData: FormData) {
  await requireStaffAccess();
  const kind = String(formData.get('kind') ?? '');
  const id = String(formData.get('id') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');

  if (kind === 'laundry') {
    await db.orm.public.LaundryMachine.where({ id, buildingId }).delete();
  } else if (kind === 'sauna') {
    const bookings = await db.orm.public.SaunaBooking.where({ slotId: id }).all();
    for (const b of bookings) await removeParticipants('sauna', b.id);
    await db.orm.public.SaunaSlot.where({ id, buildingId }).delete();
  } else if (kind === 'parking') {
    await db.orm.public.ParkingSpot.where({ id, buildingId }).delete();
  }
  backTo(buildingId, '#inventory');
}

export async function setSaunaCapacityAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');
  await db.orm.public.SaunaSlot.where({ id, buildingId }).update({ capacity: intField(formData, 'capacity', 1, 50, 6) });
  backTo(buildingId, '#inventory');
}

export async function saveSpaceAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');
  const kind = String(formData.get('kind') ?? '');
  const name = String(formData.get('name') ?? '').trim().slice(0, 80);
  if (!name || !isSpaceKind(kind)) backTo(buildingId, '#spaces');

  const openHour = intField(formData, 'openHour', 0, 23, 8);
  const closeHour = intField(formData, 'closeHour', 1, 24, 22);
  if (closeHour <= openHour) backTo(buildingId, '#spaces');

  const values = {
    kind,
    name,
    description: String(formData.get('description') ?? '').trim().slice(0, 240) || null,
    capacity: intField(formData, 'capacity', 1, 200, 6),
    openHour,
    closeHour,
    maxHoursPerBooking: intField(formData, 'maxHoursPerBooking', 1, 24, 2),
    maxHoursPerWeek: intField(formData, 'maxHoursPerWeek', 1, 168, 4),
    advanceDays: intField(formData, 'advanceDays', 1, 365, 14),
  };

  if (id) {
    await db.orm.public.BookableSpace.where({ id, buildingId }).update(values);
  } else if (!(await db.orm.public.BookableSpace.where({ buildingId, name }).first())) {
    await db.orm.public.BookableSpace.create({ buildingId, ...values });
  }
  backTo(buildingId, '#spaces');
}

export async function deleteSpaceAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');
  const bookings = await db.orm.public.SpaceBooking.where({ spaceId: id }).all();
  for (const b of bookings) await removeParticipants('space', b.id);
  await db.orm.public.BookableSpace.where({ id, buildingId }).delete();
  backTo(buildingId, '#spaces');
}

export async function staffCancelSpaceBookingAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const buildingId = String(formData.get('buildingId') ?? '');
  await removeParticipants('space', id);
  await db.orm.public.SpaceBooking.where({ id }).delete();
  backTo(buildingId, '#bookings');
}
