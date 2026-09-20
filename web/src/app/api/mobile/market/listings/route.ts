import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { isVerified } from '../../../../../lib/verification';

function euroToCents(value: string): number | null {
  if (!value.trim()) return null;
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

// Mirrors createListingAction in src/lib/market-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  if (!(await isVerified(session.tenantId))) return new Response('Verify your identity first', { status: 403 });
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });

  const body = await request.json().catch(() => null);
  const kind = String(body?.kind ?? '');
  if (kind !== 'sublet' && kind !== 'swap') return new Response('Choose sublet or swap', { status: 400 });

  const title = String(body?.title ?? '').trim();
  const description = String(body?.description ?? '').trim();
  if (!title || !description) return new Response('A title and a description are required', { status: 400 });

  const from = String(body?.availableFrom ?? '').trim();
  const to = String(body?.availableTo ?? '').trim();
  if (kind === 'sublet' && (!from || !to || new Date(to) < new Date(from))) {
    return new Response('Sublets need valid start and end dates', { status: 400 });
  }

  const listing = await db.orm.public.Listing.create({
    kind,
    sellerId: tenant.id,
    unitId: tenant.unitId,
    title,
    description,
    priceCents: kind === 'sublet' ? euroToCents(String(body?.price ?? '')) : null,
    availableFrom: from ? new Date(from).toISOString() : null,
    availableTo: to ? new Date(to).toISOString() : null,
    wanted: kind === 'swap' ? String(body?.wanted ?? '').trim() || null : null,
  });

  return Response.json({ id: listing.id }, { status: 201 });
}
