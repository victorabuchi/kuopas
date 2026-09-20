import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { getTenantWithBuilding, requestLocale } from '../../../../lib/mobile-http';
import { getBookingContext, isAmenityAvailable } from '../../../../lib/booking';
import { getLiving } from '../../../../lib/living';

// Mirrors src/app/(app)/parking/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const found = await getTenantWithBuilding(session.tenantId);
  if (!found) return new Response('Tenant not found', { status: 404 });
  const { building } = found;

  const bctx = await getBookingContext(session.tenantId);
  if (!bctx || !(await isAmenityAvailable('parking', bctx))) {
    return new Response(getLiving(requestLocale(request)).booking.errors.notAvailable, { status: 403 });
  }

  const spots = await db.orm.public.ParkingSpot.where({ buildingId: building.id })
    .include('tenant', (t) => t)
    .orderBy((s) => s.label.asc())
    .all();

  return Response.json({
    buildingName: building.name,
    spots: spots.map((s) => ({
      id: s.id,
      label: s.label,
      mine: s.tenantId === session.tenantId,
      takenBy: s.tenantId && s.tenantId !== session.tenantId ? s.tenant!.name : null,
    })),
  });
}
