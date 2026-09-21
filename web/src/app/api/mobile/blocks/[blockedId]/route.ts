import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ blockedId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const { blockedId } = await params;
  const row = await db.orm.public.UserBlock.where({ blockerId: session.tenantId, blockedId }).first();
  if (row) await db.orm.public.UserBlock.where({ id: row.id }).delete();
  return Response.json({ blocked: false });
}
