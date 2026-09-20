import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';

// Mirrors respondToInviteAction in src/lib/booking-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const kind = String(body?.kind ?? '');
  const bookingId = String(body?.bookingId ?? '');
  const decision = String(body?.decision ?? '');
  if ((kind !== 'sauna' && kind !== 'space') || (decision !== 'accept' && decision !== 'decline')) {
    return new Response('Invalid request', { status: 400 });
  }

  const row = await db.orm.public.BookingParticipant.where({ kind, bookingId, tenantId: session.tenantId }).first();
  if (row) {
    await db.orm.public.BookingParticipant.where({ id: row.id }).update({
      status: decision === 'accept' ? 'accepted' : 'declined',
    });
  }
  return new Response(null, { status: 204 });
}
