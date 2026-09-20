import { getMobileSession } from '../../../../../lib/mobile-auth';
import { getBookingContext, loadResidents } from '../../../../../lib/booking';

// Mirrors loadResidents in src/lib/booking.ts (people a group booking can invite).
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx) return new Response('Tenant not found', { status: 404 });

  return Response.json(await loadResidents(ctx));
}
