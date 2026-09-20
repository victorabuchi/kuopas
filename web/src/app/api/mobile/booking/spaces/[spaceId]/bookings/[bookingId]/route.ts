import { db } from '../../../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../../../lib/mobile-auth';
import { removeParticipants } from '../../../../../../../../lib/booking';

// Mirrors cancelSpaceBookingAction in src/lib/booking-actions.ts.
export async function DELETE(request: Request, { params }: { params: Promise<{ spaceId: string; bookingId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { bookingId } = await params;
  const booking = await db.orm.public.SpaceBooking.where({ id: bookingId }).first();
  if (!booking || booking.tenantId !== session.tenantId) return new Response('Booking not found.', { status: 404 });

  await removeParticipants('space', bookingId);
  await db.orm.public.SpaceBooking.where({ id: bookingId }).delete();
  return new Response(null, { status: 204 });
}
