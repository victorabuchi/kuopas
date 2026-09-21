import { db } from '../prisma/db';
import { sendPushToTenant } from './push';

// Bookable things. The first three predate the booking hub and keep their own
// inventory tables; the rest are generic "spaces" that staff define per building.
export const INVENTORY_KINDS = ['laundry', 'sauna', 'parking'] as const;
export const SPACE_KINDS = ['common_room', 'gym', 'study_room', 'grill'] as const;
export const AMENITY_KINDS = [...INVENTORY_KINDS, ...SPACE_KINDS] as const;
export type AmenityKind = (typeof AMENITY_KINDS)[number];
export type SpaceKind = (typeof SPACE_KINDS)[number];

export function isAmenityKind(value: string): value is AmenityKind {
  return (AMENITY_KINDS as readonly string[]).includes(value);
}
export function isSpaceKind(value: string): value is SpaceKind {
  return (SPACE_KINDS as readonly string[]).includes(value);
}

export type BookingContext = {
  tenantId: string;
  tenantName: string;
  unitId: string;
  unitCode: string;
  buildingId: string;
  buildingName: string;
};

export async function getBookingContext(tenantId: string): Promise<BookingContext | null> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId })
    .include('unit', (unit) => unit.include('stairwell', (s) => s.include('building', (b) => b)))
    .first();
  const building = tenant?.unit?.stairwell?.building;
  if (!tenant || !tenant.unit || !building) return null;
  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    unitId: tenant.unit.id,
    unitCode: tenant.unit.code,
    buildingId: building.id,
    buildingName: building.name,
  };
}

export type AmenityStatus = {
  kind: AmenityKind;
  count: number;
  // True when the resident's apartment can use it: staff have not switched it
  // off for the unit or building, and there is something in the building to book.
  available: boolean;
  // 'unit' | 'building' when staff set it explicitly, 'auto' otherwise.
  source: 'unit' | 'building' | 'auto';
};

export async function loadAmenities(buildingId: string, unitId: string): Promise<AmenityStatus[]> {
  const [buildingRows, unitRows, machines, saunas, spots, spaces] = await Promise.all([
    db.orm.public.BuildingAmenity.where({ buildingId }).all(),
    db.orm.public.UnitAmenity.where({ unitId }).all(),
    db.orm.public.LaundryMachine.where({ buildingId }).all(),
    db.orm.public.SaunaSlot.where({ buildingId }).all(),
    db.orm.public.ParkingSpot.where({ buildingId }).all(),
    db.orm.public.BookableSpace.where({ buildingId }).all(),
  ]);

  const counts: Record<AmenityKind, number> = {
    laundry: machines.length,
    sauna: saunas.length,
    parking: spots.length,
    common_room: 0,
    gym: 0,
    study_room: 0,
    grill: 0,
  };
  for (const space of spaces) if (isSpaceKind(space.kind)) counts[space.kind] += 1;

  return AMENITY_KINDS.map((kind) => {
    const unitRow = unitRows.find((r) => r.kind === kind);
    const buildingRow = buildingRows.find((r) => r.kind === kind);
    const override = unitRow ?? buildingRow;
    return {
      kind,
      count: counts[kind],
      available: (override ? override.enabled : true) && counts[kind] > 0,
      source: unitRow ? 'unit' : buildingRow ? 'building' : 'auto',
    };
  });
}

export async function isAmenityAvailable(kind: AmenityKind, ctx: BookingContext): Promise<boolean> {
  const all = await loadAmenities(ctx.buildingId, ctx.unitId);
  return all.find((a) => a.kind === kind)?.available ?? false;
}

export type Resident = { id: string; name: string; unitCode: string };

// Everyone who lives in the building, split into the booker's own apartment
// and the rest, so a group can be picked without typing anyone's email.
export async function loadResidents(ctx: BookingContext): Promise<{ roommates: Resident[]; others: Resident[] }> {
  const stairwells = await db.orm.public.Stairwell.where({ buildingId: ctx.buildingId }).all();
  const stairwellIds = stairwells.map((s) => s.id);
  if (stairwellIds.length === 0) return { roommates: [], others: [] };
  const units = await db.orm.public.Unit.where((u) => u.stairwellId.in(stairwellIds)).all();
  const unitById = new Map(units.map((u) => [u.id, u]));
  const tenants = await db.orm.public.Tenant.where((t) => t.unitId.in(units.map((u) => u.id))).all();

  const roommates: Resident[] = [];
  const others: Resident[] = [];
  for (const t of tenants) {
    if (t.id === ctx.tenantId) continue;
    const entry = { id: t.id, name: t.name, unitCode: unitById.get(t.unitId!)?.code ?? '' };
    if (t.unitId === ctx.unitId) roommates.push(entry);
    else others.push(entry);
  }
  const byName = (a: Resident, b: Resident) => a.name.localeCompare(b.name);
  return { roommates: roommates.sort(byName), others: others.sort(byName) };
}

export type ParticipantInput = { ids: string[]; wholeApartment: boolean };

export function readParticipantInput(formData: FormData): ParticipantInput {
  const ids = formData.getAll('participants').map((v) => String(v)).filter(Boolean);
  return { ids, wholeApartment: formData.get('inviteApartment') === '1' };
}

// Validates the people a booker wants to bring: they must live in the same
// building, and the group (booker included) must fit the capacity.
export async function resolveParticipants(
  ctx: BookingContext,
  input: ParticipantInput,
  capacity: number,
): Promise<{ ok: true; ids: string[] } | { ok: false; reason: 'capacity' | 'outsider' }> {
  const residents = await loadResidents(ctx);
  const allowed = new Set([...residents.roommates, ...residents.others].map((r) => r.id));
  const wanted = new Set(input.ids);
  if (input.wholeApartment) for (const r of residents.roommates) wanted.add(r.id);
  wanted.delete(ctx.tenantId);
  for (const id of wanted) if (!allowed.has(id)) return { ok: false, reason: 'outsider' };
  if (wanted.size + 1 > capacity) return { ok: false, reason: 'capacity' };
  return { ok: true, ids: [...wanted] };
}

export async function inviteParticipants(args: {
  kind: 'sauna' | 'space';
  bookingId: string;
  organiserName: string;
  ids: string[];
  title: string;
  when: string;
  pushTitle: string;
  notify?: boolean;
}) {
  for (const tenantId of args.ids) {
    await db.orm.public.BookingParticipant.create({ kind: args.kind, bookingId: args.bookingId, tenantId, status: 'invited' });
    if (args.notify === false) continue;
    await sendPushToTenant(tenantId, {
      title: args.pushTitle,
      body: `${args.organiserName}: ${args.title}, ${args.when}`,
      url: '/booking',
    }).catch(() => undefined);
  }
}

export async function removeParticipants(kind: 'sauna' | 'space', bookingId: string) {
  const rows = await db.orm.public.BookingParticipant.where({ kind, bookingId }).all();
  for (const row of rows) await db.orm.public.BookingParticipant.where({ id: row.id }).delete();
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export const MAX_REPEAT_WEEKS = 12;

export function readRepeatWeeks(formData: FormData): number {
  const n = Number.parseInt(String(formData.get('repeatWeeks') ?? '1'), 10);
  return Number.isFinite(n) ? Math.max(1, Math.min(MAX_REPEAT_WEEKS, n)) : 1;
}

// The same local time on the following weeks, so a 18:00 turn stays at 18:00
// across a daylight saving change.
export function weeklyStarts(first: Date, weeks: number): Date[] {
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(first);
    d.setDate(d.getDate() + 7 * i);
    return d;
  });
}
