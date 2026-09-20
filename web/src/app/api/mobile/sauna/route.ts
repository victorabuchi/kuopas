import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { getTenantWithBuilding, requestLocale } from '../../../../lib/mobile-http';
import { getBookingContext, isAmenityAvailable } from '../../../../lib/booking';
import { getLiving } from '../../../../lib/living';

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors src/app/(app)/sauna/page.tsx. See the laundry route for why the
// booking window is wider than the requested week.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const url = new URL(request.url);
  const slotParam = url.searchParams.get('slot');
  const weekParam = url.searchParams.get('week');

  const found = await getTenantWithBuilding(session.tenantId);
  if (!found) return new Response('Tenant not found', { status: 404 });
  const { building } = found;

  const bctx = await getBookingContext(session.tenantId);
  if (!bctx || !(await isAmenityAvailable('sauna', bctx))) {
    return new Response(getLiving(requestLocale(request)).booking.errors.notAvailable, { status: 403 });
  }

  const slots = await db.orm.public.SaunaSlot.where({ buildingId: building.id })
    .orderBy((s) => s.label.asc())
    .all();

  if (slots.length === 0) {
    return Response.json({ buildingName: building.name, slots: [], activeSlotId: null, bookings: [] });
  }

  const active = slots.find((s) => s.id === slotParam) ?? slots[0]!;

  const parsed = weekParam ? new Date(`${weekParam}T00:00:00Z`) : new Date();
  const anchor = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const from = anchor.getTime() - DAY_MS;
  const to = anchor.getTime() + 8 * DAY_MS;

  const bookings = await db.orm.public.SaunaBooking.where({ slotId: active.id }).all();

  return Response.json({
    buildingName: building.name,
    slots: slots.map((s) => ({ id: s.id, label: s.label, capacity: s.capacity })),
    activeSlotId: active.id,
    bookings: bookings
      .filter((b) => {
        const t = new Date(b.startsAt).getTime();
        return t >= from && t < to;
      })
      .map((b) => ({ id: b.id, startsAt: new Date(b.startsAt).toISOString(), mine: b.tenantId === session.tenantId })),
  });
}
