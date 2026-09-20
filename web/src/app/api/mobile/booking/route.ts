import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { getBookingContext, isSpaceKind, loadAmenities } from '../../../../lib/booking';

type Item = {
  key: string;
  at: number;
  kind: 'laundry' | 'sauna' | 'space';
  title: string;
  startsAt: string;
  role: 'you' | 'organiser' | 'with';
  organiserName: string | null;
  withCount: number;
  spaceId: string | null;
  bookingId: string;
  action: 'leave' | 'cancel' | null;
};

// Mirrors BookingHubPage in src/app/(app)/booking/page.tsx. Labels are left to
// the client so the copy stays in the app's own dictionary.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx) return new Response('Tenant not found', { status: 404 });

  const now = Date.now();
  const amenities = await loadAmenities(ctx.buildingId, ctx.unitId);
  const available = amenities.filter((a) => a.available);
  const spaces = (
    await db.orm.public.BookableSpace.where({ buildingId: ctx.buildingId }).orderBy((s) => s.name.asc()).all()
  ).filter((s) => isSpaceKind(s.kind) && available.some((a) => a.kind === s.kind));

  const cards: { key: string; kind: string; spaceId: string | null; name: string | null; description: string | null; count: number }[] = [];
  for (const a of available) {
    if (a.kind === 'laundry' || a.kind === 'sauna' || a.kind === 'parking') {
      cards.push({ key: a.kind, kind: a.kind, spaceId: null, name: null, description: null, count: a.count });
    }
  }
  for (const s of spaces) {
    cards.push({ key: s.id, kind: s.kind, spaceId: s.id, name: s.name, description: s.description, count: 1 });
  }

  const participations = await db.orm.public.BookingParticipant.where({ tenantId: ctx.tenantId }).all();
  const active = participations.filter((p) => p.status !== 'declined');
  const saunaIds = active.filter((p) => p.kind === 'sauna').map((p) => p.bookingId);
  const spaceIds = active.filter((p) => p.kind === 'space').map((p) => p.bookingId);
  const joinedSauna = saunaIds.length
    ? await db.orm.public.SaunaBooking.where((b) => b.id.in(saunaIds)).include('slot', (s) => s).include('tenant', (x) => x).all()
    : [];
  const joinedSpace = spaceIds.length
    ? await db.orm.public.SpaceBooking.where((b) => b.id.in(spaceIds)).include('space', (s) => s).include('tenant', (x) => x).all()
    : [];
  const statusOf = (kind: string, id: string) => active.find((p) => p.kind === kind && p.bookingId === id)?.status;

  const invites: { key: string; kind: 'sauna' | 'space'; bookingId: string; title: string; startsAt: string; by: string; at: number }[] = [];
  const items: Item[] = [];

  for (const b of joinedSauna) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const at = new Date(b.startsAt).getTime();
    if (statusOf('sauna', b.id) === 'invited') {
      invites.push({ key: `sauna-${b.id}`, kind: 'sauna', bookingId: b.id, title: b.slot!.label, startsAt: b.startsAt, by: b.tenant!.name, at });
    } else {
      items.push({ key: `sauna-j-${b.id}`, at, kind: 'sauna', title: b.slot!.label, startsAt: b.startsAt, role: 'organiser', organiserName: b.tenant!.name, withCount: 0, spaceId: null, bookingId: b.id, action: 'leave' });
    }
  }
  for (const b of joinedSpace) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const at = new Date(b.startsAt).getTime();
    if (statusOf('space', b.id) === 'invited') {
      invites.push({ key: `space-${b.id}`, kind: 'space', bookingId: b.id, title: b.space!.name, startsAt: b.startsAt, by: b.tenant!.name, at });
    } else {
      items.push({ key: `space-j-${b.id}`, at, kind: 'space', title: b.space!.name, startsAt: b.startsAt, role: 'organiser', organiserName: b.tenant!.name, withCount: 0, spaceId: b.spaceId, bookingId: b.id, action: 'leave' });
    }
  }

  const groupRows = await db.orm.public.BookingParticipant.all();
  const groupSize = (kind: string, id: string) => groupRows.filter((p) => p.kind === kind && p.bookingId === id && p.status !== 'declined').length;

  const myLaundry = await db.orm.public.LaundryBooking.where({ tenantId: ctx.tenantId }).include('machine', (m) => m).all();
  for (const b of myLaundry) {
    if (new Date(b.endsAt).getTime() < now) continue;
    items.push({ key: `laundry-${b.id}`, at: new Date(b.startsAt).getTime(), kind: 'laundry', title: b.machine!.label, startsAt: b.startsAt, role: 'you', organiserName: null, withCount: 0, spaceId: null, bookingId: b.id, action: null });
  }
  const mySauna = await db.orm.public.SaunaBooking.where({ tenantId: ctx.tenantId }).include('slot', (s) => s).all();
  for (const b of mySauna) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const n = groupSize('sauna', b.id);
    items.push({ key: `sauna-${b.id}`, at: new Date(b.startsAt).getTime(), kind: 'sauna', title: b.slot!.label, startsAt: b.startsAt, role: n > 0 ? 'with' : 'you', organiserName: null, withCount: n, spaceId: null, bookingId: b.id, action: null });
  }
  const mySpaces = await db.orm.public.SpaceBooking.where({ tenantId: ctx.tenantId }).include('space', (s) => s).all();
  for (const b of mySpaces) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const n = groupSize('space', b.id);
    items.push({ key: `space-${b.id}`, at: new Date(b.startsAt).getTime(), kind: 'space', title: b.space!.name, startsAt: b.startsAt, role: n > 0 ? 'with' : 'you', organiserName: null, withCount: n, spaceId: b.spaceId, bookingId: b.id, action: 'cancel' });
  }

  const spot = await db.orm.public.ParkingSpot.where({ tenantId: ctx.tenantId }).first();
  items.sort((a, b) => a.at - b.at);

  return Response.json({
    invites: invites.sort((a, b) => a.at - b.at),
    cards,
    items,
    parking: spot ? { label: spot.label } : null,
  });
}
