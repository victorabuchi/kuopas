import { randomUUID } from 'node:crypto';
import { db } from '../prisma/db';

const DAY_MS = 24 * 60 * 60 * 1000;

// Units in the same vertical line share the last two digits of their code
// (B115, B215, B315), and pipes, risers and ventilation shafts run through
// that line, so a shared "stack" is the strongest sign of one root cause.
export function stackOf(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.slice(-2) || code;
}

export type Located = {
  id: string;
  category: string;
  createdAt: string;
  status: string;
  clusterId: string | null;
  tenantId: string;
  unitId: string;
  unitCode: string;
  floor: number;
  stairwellId: string;
  buildingId: string;
  buildingName: string;
  stairwellLabel: string;
};

export async function loadLocatedComplaints(sinceDays: number): Promise<Located[]> {
  const since = Date.now() - sinceDays * DAY_MS;
  const rows = await db.orm.public.Complaint.include('tenant', (t) =>
    t.include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b))),
  )
    .orderBy((c) => c.createdAt.desc())
    .limit(2000)
    .all();

  return rows
    .filter((c) => new Date(c.createdAt).getTime() >= since)
    .flatMap((c) => {
      const unit = c.tenant?.unit;
      const stairwell = unit?.stairwell;
      const building = stairwell?.building;
      if (!unit || !stairwell || !building) return [];
      return [
        {
          id: c.id,
          category: c.category,
          createdAt: c.createdAt,
          status: c.status,
          clusterId: c.clusterId,
          tenantId: c.tenantId,
          unitId: unit.id,
          unitCode: unit.code,
          floor: unit.floor,
          stairwellId: stairwell.id,
          buildingId: building.id,
          buildingName: building.name,
          stairwellLabel: stairwell.label,
        },
      ];
    });
}

function related(a: Located, b: Located): boolean {
  if (a.category !== b.category || a.buildingId !== b.buildingId) return false;
  if (a.unitId === b.unitId) return true;
  if (a.stairwellId !== b.stairwellId) return false;
  return a.floor === b.floor || stackOf(a.unitCode) === stackOf(b.unitCode);
}

// Called right after a complaint is filed. Open complaints of the same kind
// in the same unit, floor, or vertical stack within 30 days share a cluster,
// so staff see one recurring problem instead of several separate tickets.
export async function assignCluster(complaintId: string): Promise<void> {
  const recent = await loadLocatedComplaints(30);
  const me = recent.find((c) => c.id === complaintId);
  if (!me) return;

  const matches = recent.filter((c) => c.id !== me.id && c.status !== 'resolved' && related(me, c));
  if (matches.length === 0) return;

  const clusterId = matches.find((m) => m.clusterId)?.clusterId ?? randomUUID();
  for (const c of [me, ...matches]) {
    if (c.clusterId !== clusterId) await db.orm.public.Complaint.where({ id: c.id }).update({ clusterId });
  }
}

export type Hotspot = {
  key: string;
  kind: 'stack' | 'floor' | 'unit';
  category: string;
  building: string;
  where: string;
  units: string[];
  count: number;
  open: number;
  latest: string;
};

// Recurring physical problems over the last 90 days, grouped by where they
// happen, ranked by how often they come back.
export function findHotspots(complaints: Located[]): Hotspot[] {
  const buckets = new Map<string, { kind: Hotspot['kind']; items: Located[]; where: string }>();

  function add(key: string, kind: Hotspot['kind'], where: string, c: Located) {
    const b = buckets.get(key) ?? { kind, items: [], where };
    b.items.push(c);
    buckets.set(key, b);
  }

  for (const c of complaints) {
    add(`stack|${c.stairwellId}|${stackOf(c.unitCode)}|${c.category}`, 'stack', `${c.stairwellLabel}, stack ${stackOf(c.unitCode)}`, c);
    add(`floor|${c.stairwellId}|${c.floor}|${c.category}`, 'floor', `${c.stairwellLabel}, floor ${c.floor}`, c);
    add(`unit|${c.unitId}|${c.category}`, 'unit', `${c.stairwellLabel}${c.unitCode}`, c);
  }

  const minimum: Record<Hotspot['kind'], number> = { stack: 2, floor: 3, unit: 2 };
  const hotspots: Hotspot[] = [];
  for (const [key, b] of buckets) {
    const distinctUnits = new Set(b.items.map((i) => i.unitId));
    if (b.items.length < minimum[b.kind]) continue;
    // A stack or floor problem needs more than one apartment to mean anything.
    if ((b.kind === 'stack' || b.kind === 'floor') && distinctUnits.size < 2) continue;

    const first = b.items[0]!;
    hotspots.push({
      key,
      kind: b.kind,
      category: first.category,
      building: first.buildingName,
      where: b.where,
      units: [...new Set(b.items.map((i) => i.unitCode))].sort(),
      count: b.items.length,
      open: b.items.filter((i) => i.status !== 'resolved').length,
      latest: b.items.map((i) => i.createdAt).sort().at(-1)!,
    });
  }
  return hotspots.sort((a, b) => b.open - a.open || b.count - a.count);
}
