'use server';

import { revalidatePath } from 'next/cache';
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
  removeParticipants,
  resolveParticipants,
} from './booking';

function back(spaceId: string, week: string, error?: string): never {
  const params = new URLSearchParams({ week });
  if (error) params.set('error', error);
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

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + hours);

  const existing = await db.orm.public.SpaceBooking.where({ spaceId }).all();
  if (existing.some((b) => overlaps(startsAt.getTime(), endsAt.getTime(), new Date(b.startsAt).getTime(), new Date(b.endsAt).getTime()))) {
    back(spaceId, week, e.taken);
  }

  const weekStart = getWeekStart(startsAt);
  const weekEnd = addDays(weekStart, 7);
  const bookedHours = existing
    .filter((b) => b.tenantId === ctx.tenantId)
    .filter((b) => {
      const t = new Date(b.startsAt).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    })
    .reduce((sum, b) => sum + (new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 3_600_000, 0);
  if (bookedHours + hours > space.maxHoursPerWeek) back(spaceId, week, fill(e.weekly, space.maxHoursPerWeek));

  const people = await resolveParticipants(ctx, readParticipantInput(formData), space.capacity);
  if (!people.ok) back(spaceId, week, people.reason === 'capacity' ? fill(e.capacity, space.capacity) : e.outsider);

  const created = await db.orm.public.SpaceBooking.create({
    spaceId,
    tenantId: ctx.tenantId,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    note,
  });
  await inviteParticipants({
    kind: 'space',
    bookingId: created.id,
    organiserName: ctx.tenantName,
    ids: people.ok ? people.ids : [],
    title: space.name,
    when: `${startsAt.toLocaleDateString()} ${String(startHour).padStart(2, '0')}:00`,
    pushTitle: getLiving(await getLocale()).booking.pushInvite,
  });

  revalidatePath('/booking');
  back(spaceId, week);
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
