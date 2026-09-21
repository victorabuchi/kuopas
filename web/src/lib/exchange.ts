import { db } from '../prisma/db';

export const EXCHANGE_PREFERENCES = ['any', 'solu', 'studio'] as const;

const DAY_MS = 86_400_000;
export function overlapsRange(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

type ExchangeRow = { id: string; arrival: string; departure: string; prefer: string };

// Temporary furnished apartments that still have a free room for the whole
// stay. Occupancy counts leases that overlap the stay, exchange students
// already allocated to it, and current residents who have no lease on record.
export async function freeTemporaryUnits(app: ExchangeRow, reserved: Map<string, number> = new Map()) {
  const from = new Date(app.arrival).getTime();
  const to = new Date(app.departure).getTime() + DAY_MS;

  const units = await db.orm.public.Unit.where({ temporary: true })
    .include('stairwell', (s) => s.include('building', (b) => b))
    .include('tenants', (t) => t)
    .all();
  if (units.length === 0) return [];
  const unitIds = units.map((u) => u.id);
  const leases = await db.orm.public.Lease.where((l) => l.unitId.in(unitIds)).all();
  const allocated = await db.orm.public.ExchangeApplication.where({ status: 'allocated' }).all();

  const result: typeof units = [];
  for (const unit of units) {
    if (app.prefer === 'studio' && unit.kind !== 'studio') continue;
    if (app.prefer === 'solu' && unit.kind !== 'solu') continue;

    const activeLeases = leases.filter((l) => l.unitId === unit.id && (l.status === 'active' || l.status === 'pending_signature'));
    const overlappingLeases = activeLeases.filter((l) => overlapsRange(from, to, new Date(l.startDate).getTime(), new Date(l.endDate).getTime() + DAY_MS));
    const leasedTenantIds = new Set(activeLeases.map((l) => l.tenantId));
    const unleasedResidents = (unit.tenants ?? []).filter((t) => !leasedTenantIds.has(t.id));
    const pendingAllocations = allocated.filter(
      (a) => a.allocatedUnitId === unit.id && a.id !== app.id && !a.leaseId && overlapsRange(from, to, new Date(a.arrival).getTime(), new Date(a.departure).getTime() + DAY_MS),
    );
    const occupied = overlappingLeases.length + unleasedResidents.length + pendingAllocations.length + (reserved.get(unit.id) ?? 0);
    if (occupied < unit.roomCount) result.push(unit);
  }
  return result.sort((a, b) => a.code.localeCompare(b.code));
}
