'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getBookingContext, isAmenityAvailable } from './booking';

export async function claimParkingSpotAction(formData: FormData) {
  const spotId = String(formData.get('spotId') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const alreadyHeld = await db.orm.public.ParkingSpot.where({ tenantId: session.tenantId }).first();
  if (alreadyHeld) redirect('/parking?error=' + encodeURIComponent('You already have a parking spot. Release it first.'));

  const spot = await db.orm.public.ParkingSpot.where({ id: spotId }).first();
  if (!spot) redirect('/parking?error=' + encodeURIComponent('Spot not found.'));
  if (spot.tenantId) redirect('/parking?error=' + encodeURIComponent('That spot was just taken by someone else.'));
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx || spot.buildingId !== ctx.buildingId || !(await isAmenityAvailable('parking', ctx))) {
    redirect('/parking?error=' + encodeURIComponent('Parking is not available for your apartment.'));
  }

  await db.orm.public.ParkingSpot.where({ id: spotId }).update({ tenantId: session.tenantId });

  revalidatePath('/parking');
  redirect('/parking');
}

export async function releaseParkingSpotAction(formData: FormData) {
  const spotId = String(formData.get('spotId') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const spot = await db.orm.public.ParkingSpot.where({ id: spotId }).first();
  if (!spot || spot.tenantId !== session.tenantId) redirect('/parking?error=' + encodeURIComponent('Spot not found.'));

  await db.orm.public.ParkingSpot.where({ id: spotId }).update({ tenantId: null });

  revalidatePath('/parking');
  redirect('/parking');
}
