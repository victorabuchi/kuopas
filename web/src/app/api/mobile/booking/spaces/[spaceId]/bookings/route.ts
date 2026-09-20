import { db } from '../../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../../lib/mobile-auth';
import { addDays, getWeekStart } from '../../../../../../../lib/booking-grid';
import {
  getBookingContext,
  inviteParticipants,
  isAmenityAvailable,
  isSpaceKind,
  overlaps,
  resolveParticipants,
} from '../../../../../../../lib/booking';
import { getLiving } from '../../../../../../../lib/living';
import { requestLocale } from '../../../../../../../lib/mobile-http';

function fill(text: string, n: number) {
  return text.replace('{n}', String(n));
}

// Mirrors bookSpaceAction in src/lib/booking-actions.ts; errors come back as plain text.
export async function POST(request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx) return new Response('Tenant not found', { status: 404 });

  const { spaceId } = await params;
  const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? ''));
  const hours = Number.parseInt(String(body?.hours ?? '1'), 10);
  const note = String(body?.note ?? '').trim().slice(0, 200) || null;
  const ids: string[] = Array.isArray(body?.participants) ? body.participants.map(String) : [];
  const wholeApartment = body?.inviteApartment === true;

  const living = getLiving(requestLocale(request)).booking;
  const e = living.errors;
  const fail = (message: string, status = 400) => new Response(message, { status });

  const space = await db.orm.public.BookableSpace.where({ id: spaceId }).first();
  if (!space || space.buildingId !== ctx.buildingId || !isSpaceKind(space.kind)) return fail(e.notFound, 404);
  if (!(await isAmenityAvailable(space.kind, ctx))) return fail(e.notAvailable, 403);

  if (Number.isNaN(startsAt.getTime()) || startsAt.getMinutes() !== 0 || !Number.isInteger(hours) || hours < 1) {
    return fail(e.invalidTime);
  }
  if (hours > space.maxHoursPerBooking) return fail(e.tooLong);

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) return fail(e.past);
  if (startsAt.getTime() > addDays(now, space.advanceDays).getTime()) return fail(fill(e.tooFar, space.advanceDays));

  const startHour = startsAt.getHours();
  if (startHour < space.openHour || startHour + hours > space.closeHour) return fail(e.closed);

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + hours);

  const existing = await db.orm.public.SpaceBooking.where({ spaceId }).all();
  if (existing.some((b) => overlaps(startsAt.getTime(), endsAt.getTime(), new Date(b.startsAt).getTime(), new Date(b.endsAt).getTime()))) {
    return fail(e.taken, 409);
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
  if (bookedHours + hours > space.maxHoursPerWeek) return fail(fill(e.weekly, space.maxHoursPerWeek));

  const people = await resolveParticipants(ctx, { ids, wholeApartment }, space.capacity);
  if (!people.ok) return fail(people.reason === 'capacity' ? fill(e.capacity, space.capacity) : e.outsider);

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
    ids: people.ids,
    title: space.name,
    when: `${startsAt.toLocaleDateString()} ${String(startHour).padStart(2, '0')}:00`,
    pushTitle: living.pushInvite,
  });

  return Response.json({ id: created.id }, { status: 201 });
}
