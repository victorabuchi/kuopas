import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';
import { isVerified } from '../../../../../../lib/verification';

// POST sends a request for the listing (requestListingAction in src/lib/market-actions.ts).
export async function POST(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  if (!(await isVerified(session.tenantId))) return new Response('Verify your identity first', { status: 403 });
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });

  const { listingId } = await params;
  const body = await request.json().catch(() => null);
  const message = String(body?.message ?? '').trim();
  if (!message) return new Response('Write a short message', { status: 400 });

  const listing = await db.orm.public.Listing.where({ id: listingId }).first();
  if (!listing || listing.status !== 'open' || listing.sellerId === tenant.id) {
    return new Response('This listing is not available', { status: 400 });
  }
  if (listing.unitId === tenant.unitId) return new Response('You already live in this apartment', { status: 400 });

  const existing = await db.orm.public.ListingRequest.where({ listingId, requesterId: tenant.id }).first();
  if (!existing) await db.orm.public.ListingRequest.create({ listingId, requesterId: tenant.id, message });

  return new Response(null, { status: 204 });
}

// DELETE closes your own listing (closeListingAction).
export async function DELETE(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { listingId } = await params;
  const listing = await db.orm.public.Listing.where({ id: listingId }).first();
  if (!listing || listing.sellerId !== session.tenantId || listing.status === 'completed') {
    return new Response(null, { status: 204 });
  }
  await db.orm.public.Listing.where({ id: listing.id }).update({ status: 'closed' });
  return new Response(null, { status: 204 });
}
