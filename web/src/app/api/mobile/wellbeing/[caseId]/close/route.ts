import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors closeOwnCaseAction in src/lib/wellbeing-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { caseId } = await params;
  const found = await db.orm.public.WellbeingCase.where({ id: caseId }).first();
  if (!found || found.tenantId !== session.tenantId || found.status === 'closed') {
    return new Response(null, { status: 204 });
  }

  await db.orm.public.WellbeingCase.where({ id: found.id }).update({ status: 'closed' });
  await db.orm.public.WellbeingEvent.create({ caseId: found.id, actor: 'Resident', action: 'closed', detail: null });
  return new Response(null, { status: 204 });
}
