import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';
import { isVerified } from '../../../../../../lib/verification';

// Mirrors respondConnectionAction in src/lib/matching-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  if (!(await isVerified(session.tenantId))) return new Response('Verify your identity first', { status: 403 });

  const { connectionId } = await params;
  const body = await request.json().catch(() => null);

  const connection = await db.orm.public.MatchConnection.where({ id: connectionId }).first();
  if (!connection || connection.toId !== session.tenantId || connection.status !== 'pending') {
    return new Response(null, { status: 204 });
  }

  await db.orm.public.MatchConnection.where({ id: connectionId }).update({
    status: body?.accept === true ? 'accepted' : 'declined',
  });
  return new Response(null, { status: 204 });
}
