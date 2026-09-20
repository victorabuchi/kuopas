import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { getWeekStart, MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE } from '../../../../../lib/laundry';
import { getBookingContext, isAmenityAvailable } from '../../../../../lib/booking';

// Mirrors bookSlotAction in src/lib/laundry-actions.ts; errors come back as plain text.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const machineId = String(body?.machineId ?? '');
  const startsAt = new Date(String(body?.startsAt ?? ''));

  if (Number.isNaN(startsAt.getTime())) return new Response('Invalid time slot.', { status: 400 });

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) return new Response("That slot's already in the past.", { status: 400 });

  const maxAdvance = new Date(now);
  maxAdvance.setDate(maxAdvance.getDate() + MAX_DAYS_IN_ADVANCE);
  if (startsAt.getTime() > maxAdvance.getTime()) {
    return new Response(`You can only book up to ${MAX_DAYS_IN_ADVANCE} days ahead.`, { status: 400 });
  }

  const machine = await db.orm.public.LaundryMachine.where({ id: machineId }).first();
  if (!machine) return new Response('Machine not found.', { status: 404 });

  const ctx = await getBookingContext(session.tenantId);
  if (!ctx || machine.buildingId !== ctx.buildingId || !(await isAmenityAvailable('laundry', ctx))) {
    return new Response('Laundry is not available for your apartment.', { status: 403 });
  }

  const existing = await db.orm.public.LaundryBooking.where({ machineId, startsAt: startsAt.toISOString() }).first();
  if (existing) return new Response('That slot was just booked by someone else.', { status: 409 });

  const weekStart = getWeekStart(startsAt);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const tenantBookings = await db.orm.public.LaundryBooking.where({ tenantId: session.tenantId }).all();
  const hoursThisWeek = tenantBookings.filter((b) => {
    const t = new Date(b.startsAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  }).length;
  if (hoursThisWeek >= MAX_HOURS_PER_WEEK) {
    return new Response(`You've already booked your ${MAX_HOURS_PER_WEEK} hours for this week.`, { status: 400 });
  }

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + 1);

  const booking = await db.orm.public.LaundryBooking.create({
    machineId,
    tenantId: session.tenantId,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });

  return Response.json({ id: booking.id }, { status: 201 });
}
