import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';

// Mirrors dismissMoveInGuideAction in src/lib/move-in-guide-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  await db.orm.public.Tenant.where({ id: session.tenantId }).update({ hasSeenMoveInGuide: true });
  return new Response(null, { status: 204 });
}
