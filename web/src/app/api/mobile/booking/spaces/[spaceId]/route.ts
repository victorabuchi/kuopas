import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';
import { getBookingContext, isAmenityAvailable, isSpaceKind } from '../../../../../../lib/booking';
import { getLiving } from '../../../../../../lib/living';
import { requestLocale } from '../../../../../../lib/mobile-http';

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors src/app/(app)/booking/space/[spaceId]/page.tsx. As with laundry, the
// client draws the grid in its own time zone, so bookings within a day of the
// requested week are returned.
export async function GET(request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx) return new Response('Tenant not found', { status: 404 });

  const { spaceId } = await params;
  const space = await db.orm.public.BookableSpace.where({ id: spaceId }).first();
  if (!space || space.buildingId !== ctx.buildingId || !isSpaceKind(space.kind)) {
    return new Response('Space not found', { status: 404 });
  }
  if (!(await isAmenityAvailable(space.kind, ctx))) {
    return new Response(getLiving(requestLocale(request)).booking.errors.notAvailable, { status: 403 });
  }

  const weekParam = new URL(request.url).searchParams.get('week');
  const parsed = weekParam ? new Date(`${weekParam}T00:00:00Z`) : new Date();
  const anchor = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const from = anchor.getTime() - DAY_MS;
  const to = anchor.getTime() + 8 * DAY_MS;

  const bookings = await db.orm.public.SpaceBooking.where({ spaceId }).all();

  return Response.json({
    space: {
      id: space.id,
      kind: space.kind,
      name: space.name,
      description: space.description ?? '',
      capacity: space.capacity,
      openHour: space.openHour,
      closeHour: space.closeHour,
      maxHoursPerBooking: space.maxHoursPerBooking,
      maxHoursPerWeek: space.maxHoursPerWeek,
      advanceDays: space.advanceDays,
    },
    bookings: bookings
      .filter((b) => {
        const t = new Date(b.startsAt).getTime();
        return t >= from && t < to;
      })
      .map((b) => ({
        id: b.id,
        startsAt: new Date(b.startsAt).toISOString(),
        endsAt: new Date(b.endsAt).toISOString(),
        mine: b.tenantId === ctx.tenantId,
      })),
  });
}
