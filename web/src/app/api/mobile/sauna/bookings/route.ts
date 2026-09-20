import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { getWeekStart, MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE, SLOT_LENGTH_HOURS } from '../../../../../lib/sauna';
import { getBookingContext, inviteParticipants, isAmenityAvailable, resolveParticipants } from '../../../../../lib/booking';
import { getLiving } from '../../../../../lib/living';
import { requestLocale } from '../../../../../lib/mobile-http';

// Mirrors bookSaunaAction in src/lib/sauna-actions.ts, including the group
// invite; errors come back as plain text.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const slotId = String(body?.slotId ?? '');
  const startsAt = new Date(String(body?.startsAt ?? ''));
  const ids: string[] = Array.isArray(body?.participants) ? body.participants.map(String) : [];
  const wholeApartment = body?.inviteApartment === true;

  if (Number.isNaN(startsAt.getTime())) return new Response('Invalid time slot.', { status: 400 });

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) return new Response("That turn's already in the past.", { status: 400 });

  const maxAdvance = new Date(now);
  maxAdvance.setDate(maxAdvance.getDate() + MAX_DAYS_IN_ADVANCE);
  if (startsAt.getTime() > maxAdvance.getTime()) {
    return new Response(`You can only book up to ${MAX_DAYS_IN_ADVANCE} days ahead.`, { status: 400 });
  }

  const slot = await db.orm.public.SaunaSlot.where({ id: slotId }).first();
  if (!slot) return new Response('Sauna not found.', { status: 404 });

  const ctx = await getBookingContext(session.tenantId);
  const bk = getLiving(requestLocale(request)).booking;
  if (!ctx || slot.buildingId !== ctx.buildingId || !(await isAmenityAvailable('sauna', ctx))) {
    return new Response(bk.errors.notAvailable, { status: 403 });
  }

  const existing = await db.orm.public.SaunaBooking.where({ slotId, startsAt: startsAt.toISOString() }).first();
  if (existing) return new Response('That turn was just booked by someone else.', { status: 409 });

  const weekStart = getWeekStart(startsAt);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const tenantBookings = await db.orm.public.SaunaBooking.where({ tenantId: session.tenantId }).all();
  const countThisWeek = tenantBookings.filter((b) => {
    const t = new Date(b.startsAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  }).length;
  if (countThisWeek * SLOT_LENGTH_HOURS + SLOT_LENGTH_HOURS > MAX_HOURS_PER_WEEK) {
    return new Response(`You've already booked your ${MAX_HOURS_PER_WEEK} hours for this week.`, { status: 400 });
  }

  const people = await resolveParticipants(ctx, { ids, wholeApartment }, slot.capacity);
  if (!people.ok) {
    return new Response(
      people.reason === 'capacity' ? bk.errors.capacity.replace('{n}', String(slot.capacity)) : bk.errors.outsider,
      { status: 400 },
    );
  }

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + SLOT_LENGTH_HOURS);

  const booking = await db.orm.public.SaunaBooking.create({
    slotId,
    tenantId: session.tenantId,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });
  await inviteParticipants({
    kind: 'sauna',
    bookingId: booking.id,
    organiserName: ctx.tenantName,
    ids: people.ids,
    title: slot.label,
    when: `${startsAt.toLocaleDateString()} ${String(startsAt.getHours()).padStart(2, '0')}:00`,
    pushTitle: bk.pushInvite,
  });

  return Response.json({ id: booking.id }, { status: 201 });
}
