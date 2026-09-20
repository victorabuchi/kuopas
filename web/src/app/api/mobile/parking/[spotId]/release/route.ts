import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors releaseParkingSpotAction in src/lib/parking-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ spotId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { spotId } = await params;

  const spot = await db.orm.public.ParkingSpot.where({ id: spotId }).first();
  if (!spot || spot.tenantId !== session.tenantId) return new Response('Spot not found.', { status: 404 });

  await db.orm.public.ParkingSpot.where({ id: spotId }).update({ tenantId: null });
  return new Response(null, { status: 204 });
}
