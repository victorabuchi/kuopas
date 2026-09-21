import { createHash } from 'node:crypto';

export const AREAS = [
  { key: 'room', items: ['walls', 'ceiling', 'floor', 'windows', 'door', 'furniture', 'electrics'] },
  { key: 'kitchen', items: ['counters', 'sink', 'stove', 'fridge', 'floor', 'walls'] },
  { key: 'bathroom', items: ['toilet', 'shower', 'sink', 'floor', 'ventilation'] },
  { key: 'hall', items: ['floor', 'walls', 'closet'] },
  { key: 'balcony', items: ['floor', 'railing', 'door'] },
] as const;

export const CONDITIONS = ['ok', 'minor', 'damaged', 'missing', 'na'] as const;
export type Condition = (typeof CONDITIONS)[number];
export const INSPECTION_KINDS = ['move_in', 'move_out'] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number];

export const TEMPLATE = AREAS.flatMap((a) => a.items.map((item) => ({ area: a.key as string, item: item as string })));

// Worse condition = higher number, used to spot damage that appeared between
// the move-in and move-out records.
const RANK: Record<string, number> = { unset: 0, na: 0, ok: 0, minor: 1, damaged: 2, missing: 3 };
export function conditionRank(condition: string): number {
  return RANK[condition] ?? 0;
}

export type FingerprintItem = { area: string; item: string; condition: string; note: string | null; photoUrl: string | null };

// A tamper-evident fingerprint of the submitted record. Any later change to a
// condition, note or photo would produce a different value.
export function fingerprint(inspectionId: string, tenantId: string, submittedAt: string, items: FingerprintItem[]): string {
  const canonical = [...items]
    .sort((a, b) => `${a.area}.${a.item}`.localeCompare(`${b.area}.${b.item}`))
    .map((i) => [i.area, i.item, i.condition, i.note ?? '', i.photoUrl ?? '']);
  return createHash('sha256').update(JSON.stringify({ inspectionId, tenantId, submittedAt, items: canonical })).digest('hex');
}
