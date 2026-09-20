import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';
import { getBookingContext, isAmenityAvailable } from '../../../../../../lib/booking';

// Mirrors claimParkingSpotAction in src/lib/parking-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ spotId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { spotId } = await params;

  const alreadyHeld = await db.orm.public.ParkingSpot.where({ tenantId: session.tenantId }).first();
  if (alreadyHeld) return new Response('You already have a parking spot. Release it first.', { status: 400 });

  const spot = await db.orm.public.ParkingSpot.where({ id: spotId }).first();
  if (!spot) return new Response('Spot not found.', { status: 404 });

  const ctx = await getBookingContext(session.tenantId);
  if (!ctx || spot.buildingId !== ctx.buildingId || !(await isAmenityAvailable('parking', ctx))) {
    return new Response('Parking is not available for your apartment.', { status: 403 });
  }
  if (spot.tenantId) return new Response('That spot was just taken by someone else.', { status: 409 });

  await db.orm.public.ParkingSpot.where({ id: spotId }).update({ tenantId: session.tenantId });
  return new Response(null, { status: 204 });
}
