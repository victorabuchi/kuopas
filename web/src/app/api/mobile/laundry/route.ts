import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { getTenantWithBuilding, requestLocale } from '../../../../lib/mobile-http';
import { getBookingContext, isAmenityAvailable } from '../../../../lib/booking';
import { getLiving } from '../../../../lib/living';

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors src/app/(app)/laundry/page.tsx. The client draws the week grid in
// the device's time zone, so this returns every booking within a day of the
// requested week on either side rather than filtering to the exact week.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const url = new URL(request.url);
  const machineParam = url.searchParams.get('machine');
  const weekParam = url.searchParams.get('week');

  const found = await getTenantWithBuilding(session.tenantId);
  if (!found) return new Response('Tenant not found', { status: 404 });
  const { building } = found;

  const bctx = await getBookingContext(session.tenantId);
  if (!bctx || !(await isAmenityAvailable('laundry', bctx))) {
    return new Response(getLiving(requestLocale(request)).booking.errors.notAvailable, { status: 403 });
  }

  const machines = await db.orm.public.LaundryMachine.where({ buildingId: building.id })
    .orderBy((m) => m.label.asc())
    .all();

  if (machines.length === 0) {
    return Response.json({ buildingName: building.name, machines: [], activeMachineId: null, bookings: [] });
  }

  const active = machines.find((m) => m.id === machineParam) ?? machines[0]!;

  const parsed = weekParam ? new Date(`${weekParam}T00:00:00Z`) : new Date();
  const anchor = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const from = anchor.getTime() - DAY_MS;
  const to = anchor.getTime() + 8 * DAY_MS;

  const bookings = await db.orm.public.LaundryBooking.where({ machineId: active.id }).all();

  return Response.json({
    buildingName: building.name,
    machines: machines.map((m) => ({ id: m.id, label: m.label })),
    activeMachineId: active.id,
    bookings: bookings
      .filter((b) => {
        const t = new Date(b.startsAt).getTime();
        return t >= from && t < to;
      })
      .map((b) => ({ id: b.id, startsAt: new Date(b.startsAt).toISOString(), mine: b.tenantId === session.tenantId })),
  });
}
