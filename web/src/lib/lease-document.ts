import { createHash } from 'node:crypto';
import { db } from '../prisma/db';

// The commercial terms that a signature covers. The fingerprint is computed
// from the raw values, not from translated text, so it is the same in every
// language and changes if any term changes.
export async function loadLeaseForSigning(leaseId: string) {
  const lease = await db.orm.public.Lease.where({ id: leaseId })
    .include('charges', (c) => c.orderBy((x) => x.periodStart.asc()))
    .include('tenant', (t) => t)
    .include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b)))
    .include('signatures', (s) => s)
    .first();
  return lease;
}

type LeaseForHash = NonNullable<Awaited<ReturnType<typeof loadLeaseForSigning>>>;

export function leaseFingerprint(lease: LeaseForHash): string {
  const canonical = {
    id: lease.id,
    tenantId: lease.tenantId,
    unitId: lease.unitId,
    kind: lease.kind,
    startDate: new Date(lease.startDate).toISOString(),
    endDate: new Date(lease.endDate).toISOString(),
    monthlyRentCents: lease.monthlyRentCents,
    depositCents: lease.depositCents,
    upfrontMonths: lease.upfrontMonths,
    charges: (lease.charges ?? []).map((c) => [new Date(c.periodStart).toISOString(), new Date(c.periodEnd).toISOString(), c.amountCents, new Date(c.dueDate).toISOString()]),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
