import { db } from '../../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../../lib/mobile-auth';

// Mirrors setSharePaidAction in src/lib/household-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { shareId } = await params;
  const body = await request.json().catch(() => null);

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  const share = await db.orm.public.BillShare.where({ id: shareId }).first();
  if (!tenant || !share) return new Response('Share not found', { status: 404 });

  const bill = await db.orm.public.SharedBill.where({ id: share.billId }).first();
  if (!bill || bill.unitId !== tenant.unitId) return new Response('Not allowed', { status: 403 });
  if (share.tenantId !== tenant.id && bill.paidById !== tenant.id) return new Response('Not allowed', { status: 403 });

  await db.orm.public.BillShare.where({ id: share.id }).update({
    paidAt: body?.paid === true ? new Date().toISOString() : null,
  });
  return new Response(null, { status: 204 });
}
