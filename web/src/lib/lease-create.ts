import { db } from '../prisma/db';
import { buildCharges, type LeaseKind } from './lease';

// Creates a lease and its month-by-month charge schedule. Shared by the staff
// lease form and by exchange-student allocation.
export async function createLeaseWithCharges(input: {
  tenantId: string;
  unitId: string;
  kind: LeaseKind;
  start: Date;
  end: Date;
  monthlyRentCents: number;
  depositCents: number;
  upfrontMonths?: number;
  status?: string;
}) {
  const lease = await db.orm.public.Lease.create({
    tenantId: input.tenantId,
    unitId: input.unitId,
    kind: input.kind,
    startDate: input.start.toISOString(),
    endDate: input.end.toISOString(),
    monthlyRentCents: input.monthlyRentCents,
    depositCents: input.depositCents,
    upfrontMonths: input.upfrontMonths ?? 0,
    status: input.status ?? 'active',
  });
  for (const charge of buildCharges(input.start, input.end, input.monthlyRentCents)) {
    await db.orm.public.LeaseCharge.create({
      leaseId: lease.id,
      periodStart: charge.periodStart.toISOString(),
      periodEnd: charge.periodEnd.toISOString(),
      amountCents: charge.amountCents,
      prorated: charge.prorated,
      dueDate: charge.dueDate.toISOString(),
    });
  }
  return lease;
}
