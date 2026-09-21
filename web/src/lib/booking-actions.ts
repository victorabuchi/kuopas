'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getLocale } from './i18n';
import { getLiving } from './living';
import { getWeekStart, addDays } from './booking-grid';
import {
  getBookingContext,
  inviteParticipants,
  isAmenityAvailable,
  isSpaceKind,
  overlaps,
  readParticipantInput,
  readRepeatWeeks,
  removeParticipants,
  resolveParticipants,
  weeklyStarts,
} from './booking';

function back(spaceId: string, week: string, error?: string, skipped = 0): never {
  const params = new URLSearchParams({ week });
  if (error) params.set('error', error);
  if (skipped > 0) params.set('skipped', String(skipped));
  redirect(`/booking/space/${spaceId}?${params.toString()}`);
}

function fill(text: string, n: number) {
  return text.replace('{n}', String(n));
}

export async function bookSpaceAction(formData: FormData) {
  const spaceId = String(formData.get('spaceId') ?? '');
  const week = String(formData.get('week') ?? '');
  const startsAt = new Date(String(formData.get('startsAt') ?? ''));
  const hours = Number.parseInt(String(formData.get('hours') ?? '1'), 10);
  const note = String(formData.get('note') ?? '').trim().slice(0, 200) || null;

  const session = await getSession();
  if (!session) redirect('/login');
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx) redirect('/login');
  const e = getLiving(await getLocale()).booking.errors;

  const space = await db.orm.public.BookableSpace.where({ id: spaceId }).first();
  if (!space || space.buildingId !== ctx.buildingId || !isSpaceKind(space.kind)) back(spaceId, week, e.notFound);
  if (!(await isAmenityAvailable(space.kind, ctx))) back(spaceId, week, e.notAvailable);

  if (Number.isNaN(startsAt.getTime()) || startsAt.getMinutes() !== 0 || !Number.isInteger(hours) || hours < 1) {
    back(spaceId, week, e.invalidTime);
  }
  if (hours > space.maxHoursPerBooking) back(spaceId, week, e.tooLong);

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) back(spaceId, week, e.past);
  if (startsAt.getTime() > addDays(now, space.advanceDays).getTime()) back(spaceId, week, fill(e.tooFar, space.advanceDays));

  const startHour = startsAt.getHours();
  if (startHour < space.openHour || startHour + hours > space.closeHour) back(spaceId, week, e.closed);

  const people = await resolveParticipants(ctx, readParticipantInput(formData), space.capacity);
  if (!people.ok) back(spaceId, week, people.reason === 'capacity' ? fill(e.capacity, space.capacity) : e.outsider);

  const repeat = readRepeatWeeks(formData);
  const seriesId = repeat > 1 ? randomUUID() : null;
  const existing = await db.orm.public.SpaceBooking.where({ spaceId }).all();
  const busy = existing.map((b) => ({ start: new Date(b.startsAt).getTime(), end: new Date(b.endsAt).getTime(), tenantId: b.tenantId }));

  let created = 0;
  let skipped = 0;
  let firstError: string | null = null;
  for (const [index, start] of weeklyStarts(startsAt, repeat).entries()) {
    const end = new Date(start);
    end.setHours(end.getHours() + hours);
    const weekStart = getWeekStart(start);
    const weekEnd = addDays(weekStart, 7);
    const bookedHours = busy
      .filter((b) => b.tenantId === ctx.tenantId && b.start >= weekStart.getTime() && b.start < weekEnd.getTime())
      .reduce((sum, b) => sum + (b.end - b.start) / 3_600_000, 0);

    let problem: string | null = null;
    if (busy.some((b) => overlaps(start.getTime(), end.getTime(), b.start, b.end))) problem = e.taken;
    else if (bookedHours + hours > space.maxHoursPerWeek) problem = fill(e.weekly, space.maxHoursPerWeek);
    if (problem) {
      if (index === 0) firstError = problem;
      skipped += 1;
      continue;
    }

    const row = await db.orm.public.SpaceBooking.create({
      spaceId,
      tenantId: ctx.tenantId,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      note,
      seriesId,
    });
    busy.push({ start: start.getTime(), end: end.getTime(), tenantId: ctx.tenantId });
    created += 1;
    await inviteParticipants({
      kind: 'space',
      bookingId: row.id,
      organiserName: ctx.tenantName,
      ids: people.ids,
      title: space.name,
      when: `${start.toLocaleDateString()} ${String(start.getHours()).padStart(2, '0')}:00`,
      pushTitle: getLiving(await getLocale()).booking.pushInvite,
      notify: created === 1,
    });
  }
  if (created === 0 && firstError) back(spaceId, week, firstError);

  revalidatePath('/booking');
  back(spaceId, week, undefined, skipped);
}

export async function cancelSpaceBookingAction(formData: FormData) {
  const bookingId = String(formData.get('bookingId') ?? '');
  const spaceId = String(formData.get('spaceId') ?? '');
  const week = String(formData.get('week') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');

  const booking = await db.orm.public.SpaceBooking.where({ id: bookingId }).first();
  if (!booking || booking.tenantId !== session.tenantId) back(spaceId, week, getLiving(await getLocale()).booking.errors.notFound);

  await removeParticipants('space', bookingId);
  await db.orm.public.SpaceBooking.where({ id: bookingId }).delete();

  revalidatePath('/booking');
  if (returnTo === 'hub') redirect('/booking');
  back(spaceId, week);
}

// Accept or decline an invitation, or leave a group booking already accepted.
export async function respondToInviteAction(formData: FormData) {
  const kind = String(formData.get('kind') ?? '');
  const bookingId = String(formData.get('bookingId') ?? '');
  const decision = String(formData.get('decision') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');
  if ((kind !== 'sauna' && kind !== 'space') || (decision !== 'accept' && decision !== 'decline')) redirect('/booking');

  const row = await db.orm.public.BookingParticipant.where({ kind, bookingId, tenantId: session.tenantId }).first();
  if (row) {
    await db.orm.public.BookingParticipant.where({ id: row.id }).update({
      status: decision === 'accept' ? 'accepted' : 'declined',
    });
  }

  revalidatePath('/booking');
  redirect('/booking');
}

// Cancels a standing weekly turn: this booking and every later week of the series.
export async function cancelSeriesAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const kind = String(formData.get('kind') ?? '');
  const bookingId = String(formData.get('bookingId') ?? '');

  type Row = { id: string; tenantId: string; startsAt: string; seriesId: string | null };
  let first: Row | null = null;
  let series: Row[] = [];
  if (kind === 'laundry') {
    first = await db.orm.public.LaundryBooking.where({ id: bookingId }).first();
    if (first?.seriesId) series = await db.orm.public.LaundryBooking.where({ seriesId: first.seriesId }).all();
  } else if (kind === 'sauna') {
    first = await db.orm.public.SaunaBooking.where({ id: bookingId }).first();
    if (first?.seriesId) series = await db.orm.public.SaunaBooking.where({ seriesId: first.seriesId }).all();
  } else if (kind === 'space') {
    first = await db.orm.public.SpaceBooking.where({ id: bookingId }).first();
    if (first?.seriesId) series = await db.orm.public.SpaceBooking.where({ seriesId: first.seriesId }).all();
  }
  if (first && first.tenantId === session.tenantId && first.seriesId) {
    const from = new Date(first.startsAt).getTime();
    for (const row of series.filter((r) => r.tenantId === session.tenantId && new Date(r.startsAt).getTime() >= from)) {
      if (kind === 'laundry') await db.orm.public.LaundryBooking.where({ id: row.id }).delete();
      else if (kind === 'sauna') {
        await removeParticipants('sauna', row.id);
        await db.orm.public.SaunaBooking.where({ id: row.id }).delete();
      } else {
        await removeParticipants('space', row.id);
        await db.orm.public.SpaceBooking.where({ id: row.id }).delete();
      }
    }
  }
  revalidatePath('/booking');
  redirect('/booking');
}
