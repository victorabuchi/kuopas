import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';
import { isVerified } from '../../../../../../lib/verification';

// POST { accept } answers a request on your listing (respondRequestAction);
// DELETE withdraws your own request (withdrawRequestAction).
export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  if (!(await isVerified(session.tenantId))) return new Response('Verify your identity first', { status: 403 });

  const { requestId } = await params;
  const body = await request.json().catch(() => null);

  const row = await db.orm.public.ListingRequest.where({ id: requestId }).first();
  if (!row) return new Response(null, { status: 204 });
  const listing = await db.orm.public.Listing.where({ id: row.listingId }).first();
  if (!listing || listing.sellerId !== session.tenantId || listing.status !== 'open') {
    return new Response(null, { status: 204 });
  }

  if (body?.accept === true) {
    await db.orm.public.ListingRequest.where({ id: row.id }).update({ status: 'accepted' });
    await db.orm.public.Listing.where({ id: listing.id }).update({ status: 'pending_approval', acceptedRequestId: row.id });
  } else {
    await db.orm.public.ListingRequest.where({ id: row.id }).update({ status: 'declined' });
  }
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { requestId } = await params;
  const row = await db.orm.public.ListingRequest.where({ id: requestId }).first();
  if (!row || row.requesterId !== session.tenantId || row.status !== 'pending') {
    return new Response(null, { status: 204 });
  }
  await db.orm.public.ListingRequest.where({ id: row.id }).update({ status: 'withdrawn' });
  return new Response(null, { status: 204 });
}
