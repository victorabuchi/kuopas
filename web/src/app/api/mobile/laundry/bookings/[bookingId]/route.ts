import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors cancelBookingAction in src/lib/laundry-actions.ts.
export async function DELETE(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { bookingId } = await params;

  const booking = await db.orm.public.LaundryBooking.where({ id: bookingId }).first();
  if (!booking || booking.tenantId !== session.tenantId) return new Response('Booking not found.', { status: 404 });

  await db.orm.public.LaundryBooking.where({ id: bookingId }).delete();
  return new Response(null, { status: 204 });
}
