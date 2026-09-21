'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getWeekStart, MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE, SLOT_LENGTH_HOURS } from './sauna';
import {
  getBookingContext,
  inviteParticipants,
  isAmenityAvailable,
  readParticipantInput,
  readRepeatWeeks,
  removeParticipants,
  resolveParticipants,
  weeklyStarts,
} from './booking';
import { getLocale } from './i18n';
import { getLiving } from './living';

function backTo(slotId: string, week: string, error?: string, skipped = 0): never {
  const params = new URLSearchParams({ slot: slotId, week });
  if (error) params.set('error', error);
  if (skipped > 0) params.set('skipped', String(skipped));
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

  const ctx = await getBookingContext(session.tenantId);
  const bk = getLiving(await getLocale()).booking;
  if (!ctx || slot.buildingId !== ctx.buildingId || !(await isAmenityAvailable('sauna', ctx))) {
    backTo(slotId, week, bk.errors.notAvailable);
  }
  const people = await resolveParticipants(ctx, readParticipantInput(formData), slot.capacity);
  if (!people.ok) {
    backTo(slotId, week, people.reason === 'capacity' ? bk.errors.capacity.replace('{n}', String(slot.capacity)) : bk.errors.outsider);
  }

  // A standing weekly turn: the first week follows the normal rules, later
  // weeks may be booked ahead but still respect clashes and the weekly limit.
  const repeat = readRepeatWeeks(formData);
  const seriesId = repeat > 1 ? randomUUID() : null;
  const mine = await db.orm.public.SaunaBooking.where({ tenantId: session.tenantId }).all();
  const taken = await db.orm.public.SaunaBooking.where({ slotId }).all();
  const takenStarts = new Set(taken.map((b) => new Date(b.startsAt).getTime()));

  let created = 0;
  let skipped = 0;
  let firstError: string | null = null;
  for (const [index, start] of weeklyStarts(startsAt, repeat).entries()) {
    const weekStart = getWeekStart(start);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const bookedThatWeek = mine.filter((b) => {
      const t = new Date(b.startsAt).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    }).length;

    let problem: string | null = null;
    if (takenStarts.has(start.getTime())) problem = 'That turn was just booked by someone else.';
    else if ((bookedThatWeek + 1) * SLOT_LENGTH_HOURS > MAX_HOURS_PER_WEEK) problem = `You've already booked your ${MAX_HOURS_PER_WEEK} hours for this week.`;
    if (problem) {
      if (index === 0) firstError = problem;
      skipped += 1;
      continue;
    }

    const endsAt = new Date(start);
    endsAt.setHours(endsAt.getHours() + SLOT_LENGTH_HOURS);
    const row = await db.orm.public.SaunaBooking.create({
      slotId,
      tenantId: session.tenantId,
      startsAt: start.toISOString(),
      endsAt: endsAt.toISOString(),
      seriesId,
    });
    mine.push(row);
    takenStarts.add(start.getTime());
    created += 1;
    await inviteParticipants({
      kind: 'sauna',
      bookingId: row.id,
      organiserName: ctx.tenantName,
      ids: people.ids,
      title: slot.label,
      when: `${start.toLocaleDateString()} ${String(start.getHours()).padStart(2, '0')}:00`,
      pushTitle: bk.pushInvite,
      notify: created === 1,
    });
  }
  if (created === 0 && firstError) backTo(slotId, week, firstError);

  revalidatePath('/sauna');
  revalidatePath('/booking');
  backTo(slotId, week, undefined, skipped);
}

export async function cancelSaunaBookingAction(formData: FormData) {
  const bookingId = String(formData.get('bookingId') ?? '');
  const slotId = String(formData.get('slotId') ?? '');
  const week = String(formData.get('week') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const booking = await db.orm.public.SaunaBooking.where({ id: bookingId }).first();
  if (!booking || booking.tenantId !== session.tenantId) backTo(slotId, week, 'Booking not found.');

  await removeParticipants('sauna', bookingId);
  await db.orm.public.SaunaBooking.where({ id: bookingId }).delete();

  revalidatePath('/sauna');
  revalidatePath('/booking');
  backTo(slotId, week);
}
