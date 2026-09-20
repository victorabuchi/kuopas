import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { isVerified } from '../../../../../lib/verification';

// Mirrors connectAction in src/lib/matching-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const tenantId = session.tenantId;
  if (!(await isVerified(tenantId))) return new Response('Verify your identity first', { status: 403 });

  const body = await request.json().catch(() => null);
  const toId = String(body?.toId ?? '').trim();
  if (!toId || toId === tenantId) return new Response(null, { status: 204 });

  const target = await db.orm.public.MatchProfile.where({ tenantId: toId, active: true }).first();
  if (!target || !(await isVerified(toId))) return new Response('This person is not available', { status: 400 });

  const reverse = await db.orm.public.MatchConnection.where({ fromId: toId, toId: tenantId }).first();
  if (reverse) {
    if (reverse.status === 'pending') {
      await db.orm.public.MatchConnection.where({ id: reverse.id }).update({ status: 'accepted' });
    }
  } else {
    const existing = await db.orm.public.MatchConnection.where({ fromId: tenantId, toId }).first();
    if (!existing) await db.orm.public.MatchConnection.create({ fromId: tenantId, toId });
  }
  return new Response(null, { status: 204 });
}
