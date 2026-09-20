import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors deleteBillAction in src/lib/household-actions.ts.
export async function DELETE(request: Request, { params }: { params: Promise<{ billId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { billId } = await params;
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  const bill = await db.orm.public.SharedBill.where({ id: billId }).first();
  if (!tenant || !bill || bill.unitId !== tenant.unitId || bill.paidById !== tenant.id) {
    return new Response('Not allowed', { status: 403 });
  }

  await db.orm.public.SharedBill.where({ id: bill.id }).delete();
  return new Response(null, { status: 204 });
}
