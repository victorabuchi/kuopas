'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getWeekStart, MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE } from './laundry';

function backTo(machineId: string, week: string, error?: string) {
  const params = new URLSearchParams({ machine: machineId, week });
  if (error) params.set('error', error);
  redirect(`/laundry?${params.toString()}`);
}

export async function bookSlotAction(formData: FormData) {
  const machineId = String(formData.get('machineId') ?? '');
  const week = String(formData.get('week') ?? '');
  const startsAtRaw = String(formData.get('startsAt') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) backTo(machineId, week, 'Invalid time slot.');

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) backTo(machineId, week, "That slot's already in the past.");

  const maxAdvance = new Date(now);
  maxAdvance.setDate(maxAdvance.getDate() + MAX_DAYS_IN_ADVANCE);
  if (startsAt.getTime() > maxAdvance.getTime()) {
    backTo(machineId, week, `You can only book up to ${MAX_DAYS_IN_ADVANCE} days ahead.`);
  }

  const machine = await db.orm.public.LaundryMachine.where({ id: machineId }).first();
  if (!machine) backTo(machineId, week, 'Machine not found.');

  const existing = await db.orm.public.LaundryBooking.where({ machineId, startsAt: startsAt.toISOString() }).first();
  if (existing) backTo(machineId, week, 'That slot was just booked by someone else.');

  const weekStart = getWeekStart(startsAt);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const tenantBookingsThisWeek = await db.orm.public.LaundryBooking.where({ tenantId: session.tenantId }).all();
  const hoursThisWeek = tenantBookingsThisWeek.filter((b) => {
    const t = new Date(b.startsAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  }).length;
  if (hoursThisWeek >= MAX_HOURS_PER_WEEK) {
    backTo(machineId, week, `You've already booked your ${MAX_HOURS_PER_WEEK} hours for this week.`);
  }

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + 1);

  await db.orm.public.LaundryBooking.create({
    machineId,
    tenantId: session.tenantId,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });

  revalidatePath('/laundry');
  backTo(machineId, week);
}

export async function cancelBookingAction(formData: FormData) {
  const bookingId = String(formData.get('bookingId') ?? '');
  const machineId = String(formData.get('machineId') ?? '');
  const week = String(formData.get('week') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const booking = await db.orm.public.LaundryBooking.where({ id: bookingId }).first();
  if (!booking || booking.tenantId !== session.tenantId) backTo(machineId, week, 'Booking not found.');

  await db.orm.public.LaundryBooking.where({ id: bookingId }).delete();

  revalidatePath('/laundry');
  backTo(machineId, week);
}
