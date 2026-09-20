import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors deleteChoreAction in src/lib/household-actions.ts.
export async function DELETE(request: Request, { params }: { params: Promise<{ choreId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { choreId } = await params;
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  const chore = await db.orm.public.Chore.where({ id: choreId }).first();
  if (!tenant || !chore || chore.unitId !== tenant.unitId) return new Response('Not allowed', { status: 403 });

  await db.orm.public.Chore.where({ id: chore.id }).delete();
  return new Response(null, { status: 204 });
}
