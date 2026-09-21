import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

// People the signed-in resident has blocked.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const rows = await db.orm.public.UserBlock.where({ blockerId: session.tenantId }).include('blocked', (b) => b).all();
  return Response.json(rows.map((r) => ({ id: r.blockedId, name: r.blocked?.name ?? '', blockedAt: r.createdAt })));
}

// Mirrors blockUserAction in src/lib/safety-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const body = await request.json().catch(() => null);
  const blockedId = String(body?.blockedId ?? '');
  if (!blockedId || blockedId === session.tenantId) return new Response('Invalid person', { status: 400 });
  if (!(await db.orm.public.Tenant.where({ id: blockedId }).first())) return new Response('Person not found', { status: 404 });

  if (!(await db.orm.public.UserBlock.where({ blockerId: session.tenantId, blockedId }).first())) {
    await db.orm.public.UserBlock.create({ blockerId: session.tenantId, blockedId });
  }
  return Response.json({ blocked: true }, { status: 201 });
}
