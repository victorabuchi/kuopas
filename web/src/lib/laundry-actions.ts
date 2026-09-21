'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getWeekStart, MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE } from './laundry';
import { getBookingContext, isAmenityAvailable, readRepeatWeeks, weeklyStarts } from './booking';

function backTo(machineId: string, week: string, error?: string, skipped = 0): never {
  const params = new URLSearchParams({ machine: machineId, week });
  if (error) params.set('error', error);
  if (skipped > 0) params.set('skipped', String(skipped));
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
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx || machine.buildingId !== ctx.buildingId || !(await isAmenityAvailable('laundry', ctx))) {
    backTo(machineId, week, 'Laundry is not available for your apartment.');
  }

  const repeat = readRepeatWeeks(formData);
  const seriesId = repeat > 1 ? randomUUID() : null;
  const mine = await db.orm.public.LaundryBooking.where({ tenantId: session.tenantId }).all();
  const takenStarts = new Set((await db.orm.public.LaundryBooking.where({ machineId }).all()).map((b) => new Date(b.startsAt).getTime()));

  let created = 0;
  let skipped = 0;
  let firstError: string | null = null;
  for (const [index, start] of weeklyStarts(startsAt, repeat).entries()) {
    const weekStart = getWeekStart(start);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const hoursThisWeek = mine.filter((b) => {
      const t = new Date(b.startsAt).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    }).length;

    let problem: string | null = null;
    if (takenStarts.has(start.getTime())) problem = 'That slot was just booked by someone else.';
    else if (hoursThisWeek >= MAX_HOURS_PER_WEEK) problem = `You've already booked your ${MAX_HOURS_PER_WEEK} hours for this week.`;
    if (problem) {
      if (index === 0) firstError = problem;
      skipped += 1;
      continue;
    }
    const endsAt = new Date(start);
    endsAt.setHours(endsAt.getHours() + 1);
    const row = await db.orm.public.LaundryBooking.create({
      machineId,
      tenantId: session.tenantId,
      startsAt: start.toISOString(),
      endsAt: endsAt.toISOString(),
      seriesId,
    });
    mine.push(row);
    takenStarts.add(start.getTime());
    created += 1;
  }
  if (created === 0 && firstError) backTo(machineId, week, firstError);

  revalidatePath('/laundry');
  revalidatePath('/booking');
  backTo(machineId, week, undefined, skipped);
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
