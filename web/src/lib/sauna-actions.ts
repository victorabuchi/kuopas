'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getWeekStart, MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE, SLOT_LENGTH_HOURS } from './sauna';

function backTo(slotId: string, week: string, error?: string) {
  const params = new URLSearchParams({ slot: slotId, week });
  if (error) params.set('error', error);
  redirect(`/sauna?${params.toString()}`);
}

export async function bookSaunaAction(formData: FormData) {
  const slotId = String(formData.get('slotId') ?? '');
  const week = String(formData.get('week') ?? '');
  const startsAtRaw = String(formData.get('startsAt') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) backTo(slotId, week, 'Invalid time slot.');

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) backTo(slotId, week, "That turn's already in the past.");

  const maxAdvance = new Date(now);
  maxAdvance.setDate(maxAdvance.getDate() + MAX_DAYS_IN_ADVANCE);
  if (startsAt.getTime() > maxAdvance.getTime()) {
    backTo(slotId, week, `You can only book up to ${MAX_DAYS_IN_ADVANCE} days ahead.`);
  }

  const slot = await db.orm.public.SaunaSlot.where({ id: slotId }).first();
  if (!slot) backTo(slotId, week, 'Sauna not found.');

  const existing = await db.orm.public.SaunaBooking.where({ slotId, startsAt: startsAt.toISOString() }).first();
  if (existing) backTo(slotId, week, 'That turn was just booked by someone else.');

  const weekStart = getWeekStart(startsAt);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const tenantBookingsThisWeek = await db.orm.public.SaunaBooking.where({ tenantId: session.tenantId }).all();
  const bookingsThisWeekCount = tenantBookingsThisWeek.filter((b) => {
    const t = new Date(b.startsAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  }).length;
  const totalHoursThisWeek = bookingsThisWeekCount * SLOT_LENGTH_HOURS;
  if (totalHoursThisWeek + SLOT_LENGTH_HOURS > MAX_HOURS_PER_WEEK) {
    backTo(slotId, week, `You've already booked your ${MAX_HOURS_PER_WEEK} hours for this week.`);
  }

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + SLOT_LENGTH_HOURS);

  await db.orm.public.SaunaBooking.create({
    slotId,
    tenantId: session.tenantId,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });

  revalidatePath('/sauna');
  backTo(slotId, week);
}

export async function cancelSaunaBookingAction(formData: FormData) {
  const bookingId = String(formData.get('bookingId') ?? '');
  const slotId = String(formData.get('slotId') ?? '');
  const week = String(formData.get('week') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const booking = await db.orm.public.SaunaBooking.where({ id: bookingId }).first();
  if (!booking || booking.tenantId !== session.tenantId) backTo(slotId, week, 'Booking not found.');

  await db.orm.public.SaunaBooking.where({ id: bookingId }).delete();

  revalidatePath('/sauna');
  backTo(slotId, week);
}
