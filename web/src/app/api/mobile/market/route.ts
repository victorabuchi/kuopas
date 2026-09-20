import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { isVerified } from '../../../../lib/verification';

const firstName = (name: string | undefined | null) => (name ?? '').split(' ')[0] ?? '';

// Mirrors the Browse / Mine / Requests tabs of MarketplacePage in
// src/app/(app)/marketplace/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const tenantId = session.tenantId;

  const verified = await isVerified(tenantId);
  if (!verified) return Response.json({ verified, browse: [], mine: [], requests: [] });

  const me = await db.orm.public.Tenant.where({ id: tenantId }).first();

  const open = await db.orm.public.Listing.where({ status: 'open' })
    .include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b)))
    .include('seller', (s) => s)
    .include('requests', (r) => r)
    .orderBy((l) => l.createdAt.desc())
    .limit(100)
    .all();

  const browse = open
    .filter((l) => l.sellerId !== tenantId)
    .map((l) => ({
      id: l.id,
      kind: l.kind,
      title: l.title,
      description: l.description,
      priceCents: l.priceCents,
      availableFrom: l.availableFrom,
      availableTo: l.availableTo,
      wanted: l.wanted,
      place: `${l.unit?.stairwell?.building?.name ?? ''} ${l.unit?.stairwell?.label ?? ''}${l.unit?.code ?? ''}`.trim(),
      floor: l.unit?.floor ?? null,
      sellerFirstName: firstName(l.seller?.name),
      requested: l.requests.some((r) => r.requesterId === tenantId),
      ownUnit: me?.unitId === l.unitId,
    }));

  const mineRows = await db.orm.public.Listing.where({ sellerId: tenantId })
    .include('requests', (r) => r.include('requester', (x) => x))
    .include('subleases', (s) => s)
    .orderBy((l) => l.createdAt.desc())
    .all();
  const mine = mineRows.map((l) => ({
    id: l.id,
    kind: l.kind,
    title: l.title,
    status: l.status,
    subleaseFrom: l.subleases[0]?.startDate ?? null,
    subleaseTo: l.subleases[0]?.endDate ?? null,
    requests: l.requests
      .filter((r) => r.status === 'pending')
      .map((r) => ({ id: r.id, message: r.message, requesterFirstName: firstName(r.requester?.name) })),
  }));

  const requestRows = await db.orm.public.ListingRequest.where({ requesterId: tenantId })
    .include('listing', (l) => l)
    .orderBy((r) => r.createdAt.desc())
    .all();
  const requests = requestRows.map((r) => ({
    id: r.id,
    status: r.status,
    message: r.message,
    listingTitle: r.listing?.title ?? '',
  }));

  return Response.json({ verified, browse, mine, requests });
}
