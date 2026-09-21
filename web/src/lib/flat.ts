import { db } from '../prisma/db';
import { addDays, getWeekStart } from './booking-grid';

export const CLAUSES = [
  { key: 'quietHours', options: ['22-07', '23-07', '00-08', 'flex'] },
  { key: 'guests', options: ['ask', 'notice', 'free'] },
  { key: 'overnight', options: ['none', 'one', 'two', 'ask'] },
  { key: 'dishes', options: ['same_day', 'within_24h', 'rota'] },
  { key: 'kitchen', options: ['own', 'weekly_rota', 'checklist'] },
  { key: 'bathroom', options: ['weekly_rota', 'checklist', 'own'] },
  { key: 'supplies', options: ['split', 'own', 'rotate'] },
  { key: 'food', options: ['own', 'staples', 'all'] },
  { key: 'smoking', options: ['none', 'balcony'] },
  { key: 'music', options: ['headphones', 'moderate', 'free'] },
] as const;

export type ClauseValues = Record<string, string>;

export function parseClauses(text: string): ClauseValues {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? (value as ClauseValues) : {};
  } catch {
    return {};
  }
}

export const CLEANING_TEMPLATE = [
  { area: 'kitchen', key: 'counters' },
  { area: 'kitchen', key: 'dishes' },
  { area: 'kitchen', key: 'trash' },
  { area: 'kitchen', key: 'floor' },
  { area: 'kitchen', key: 'fridge' },
  { area: 'bathroom', key: 'toilet' },
  { area: 'bathroom', key: 'shower' },
  { area: 'bathroom', key: 'floor' },
  { area: 'bathroom', key: 'trash' },
  { area: 'hall', key: 'shoes' },
  { area: 'hall', key: 'floor' },
] as const;
export const CLEANING_AREAS = ['kitchen', 'bathroom', 'hall', 'other'] as const;

export function weekKey(date: Date): string {
  return getWeekStart(date).toISOString();
}

// Share of cleaning items ticked off over the last `weeks` full weeks
// (including the current one), 0-100. Null when the flat has no checklist.
export async function checklistCompletion(unitId: string, weeks: number, now: Date): Promise<number | null> {
  const items = await db.orm.public.CleaningItem.where({ unitId, active: true }).all();
  if (items.length === 0) return null;
  const starts = Array.from({ length: weeks }, (_, i) => weekKey(addDays(now, -7 * i)));
  const logs = await db.orm.public.CleaningLog.where((l) => l.itemId.in(items.map((i) => i.id))).all();
  const done = logs.filter((l) => starts.includes(new Date(l.weekStart).toISOString())).length;
  return Math.round((done / (items.length * weeks)) * 100);
}

export async function currentAgreement(unitId: string) {
  const all = await db.orm.public.RoommateAgreement.where({ unitId }).include('signatures', (s) => s).all();
  const sorted = all.sort((a, b) => b.version - a.version);
  return {
    active: sorted.find((a) => a.status === 'active') ?? null,
    draft: sorted.find((a) => a.status === 'draft') ?? null,
    nextVersion: (sorted[0]?.version ?? 0) + 1,
  };
}

export type FlatRow = {
  unitId: string;
  label: string;
  residents: number;
  agreement: 'none' | 'draft' | 'active';
  agreementMissing: boolean;
  cleaning: number | null;
  overdue: number;
  complaints: number;
  transfers: number;
  risk: number;
  flags: ('noAgreement' | 'partialAgreement' | 'noChecklist' | 'lowChecklist' | 'overdueChores' | 'complaints' | 'transfer')[];
};

// Everything staff need to spot a shared flat heading for a transfer request.
export async function loadFlatOverview(now: Date): Promise<FlatRow[]> {
  const tenants = (await db.orm.public.Tenant.all()).filter((t) => t.unitId);
  const byUnit = new Map<string, typeof tenants>();
  for (const t of tenants) byUnit.set(t.unitId!, [...(byUnit.get(t.unitId!) ?? []), t]);

  const candidateIds = [...byUnit.keys()];
  if (candidateIds.length === 0) return [];
  const units = await db.orm.public.Unit.where((u) => u.id.in(candidateIds))
    .include('stairwell', (s) => s.include('building', (b) => b))
    .all();
  const flats = units.filter((u) => (byUnit.get(u.id)?.length ?? 0) >= 2 || u.kind === 'solu');
  if (flats.length === 0) return [];
  const flatIds = flats.map((u) => u.id);

  const agreements = await db.orm.public.RoommateAgreement.where((a) => a.unitId.in(flatIds)).include('signatures', (s) => s).all();
  const items = await db.orm.public.CleaningItem.where((i) => i.unitId.in(flatIds)).all();
  const activeItems = items.filter((i) => i.active);
  const logs = activeItems.length ? await db.orm.public.CleaningLog.where((l) => l.itemId.in(activeItems.map((i) => i.id))).all() : [];
  const chores = await db.orm.public.Chore.where((c) => c.unitId.in(flatIds)).all();
  const tasks = chores.length ? await db.orm.public.ChoreTask.where((t) => t.choreId.in(chores.map((c) => c.id))).all() : [];
  const transfers = (await db.orm.public.TransferRequest.all()).filter((r) => ['open', 'mediation'].includes(r.status));
  const since = now.getTime() - 30 * 86_400_000;
  const flatTenantIds = tenants.filter((t) => flatIds.includes(t.unitId!)).map((t) => t.id);
  const complaints = flatTenantIds.length ? await db.orm.public.Complaint.where((c) => c.tenantId.in(flatTenantIds)).all() : [];
  const twoWeeks = [weekKey(now), weekKey(addDays(now, -7))];

  const rows = flats.map((u): FlatRow => {
    const residents = byUnit.get(u.id) ?? [];
    const residentIds = new Set(residents.map((r) => r.id));
    const own = agreements.filter((a) => a.unitId === u.id).sort((a, b) => b.version - a.version);
    const shown = own.find((a) => a.status === 'active') ?? own.find((a) => a.status === 'draft');
    const signed = new Set((shown?.signatures ?? []).map((s) => s.tenantId));
    const agreementMissing = Boolean(shown) && residents.some((r) => !signed.has(r.id));

    const unitItems = activeItems.filter((i) => i.unitId === u.id);
    const cleaning = unitItems.length
      ? Math.round((logs.filter((l) => unitItems.some((i) => i.id === l.itemId) && twoWeeks.includes(new Date(l.weekStart).toISOString())).length / (unitItems.length * 2)) * 100)
      : null;
    const unitChoreIds = new Set(chores.filter((c) => c.unitId === u.id).map((c) => c.id));
    const overdue = tasks.filter((t) => unitChoreIds.has(t.choreId) && !t.doneAt && new Date(t.dueDate).getTime() < now.getTime()).length;
    const complaintCount = complaints.filter(
      (c) => residentIds.has(c.tenantId) && new Date(c.createdAt).getTime() >= since && ['noise', 'pest', 'other'].includes(c.category),
    ).length;
    const transferCount = transfers.filter((r) => r.fromUnitId === u.id).length;

    const flags: FlatRow['flags'] = [];
    let risk = 0;
    if (residents.length >= 2) {
      if (!shown) { flags.push('noAgreement'); risk += 1; }
      else if (shown.status === 'draft' || agreementMissing) { flags.push('partialAgreement'); risk += 1; }
      if (cleaning === null) { flags.push('noChecklist'); risk += 1; }
      else if (cleaning < 50) { flags.push('lowChecklist'); risk += 2; }
    }
    if (overdue >= 2) { flags.push('overdueChores'); risk += 1; }
    if (complaintCount >= 1) { flags.push('complaints'); risk += complaintCount >= 2 ? 2 : 1; }
    if (transferCount > 0) { flags.push('transfer'); risk += 3; }

    return {
      unitId: u.id,
      label: `${u.stairwell?.building?.name ?? ''} ${u.stairwell?.label ?? ''}${u.code}`.trim(),
      residents: residents.length,
      agreement: shown ? (shown.status === 'active' ? 'active' : 'draft') : 'none',
      agreementMissing,
      cleaning,
      overdue,
      complaints: complaintCount,
      transfers: transferCount,
      risk,
      flags,
    };
  });
  return rows.sort((a, b) => b.risk - a.risk || a.label.localeCompare(b.label));
}
