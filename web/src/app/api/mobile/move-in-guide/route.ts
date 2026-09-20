import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

async function completedKeys(tenantId: string): Promise<string[]> {
  const completed = await db.orm.public.MoveInChecklistItem.where({ tenantId }).all();
  return completed.map((c) => c.itemKey);
}

// Mirrors the checklist query in src/app/(app)/MoveInGuideOverlay.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  return Response.json({ completed: await completedKeys(session.tenantId) });
}

// Mirrors toggleChecklistItemAction in src/lib/move-in-guide-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const itemKey = String(body?.itemKey ?? '').trim();
  if (!itemKey) return new Response('Missing item', { status: 400 });

  const existing = await db.orm.public.MoveInChecklistItem.where({ tenantId: session.tenantId, itemKey }).first();
  if (existing) {
    await db.orm.public.MoveInChecklistItem.where({ id: existing.id }).delete();
  } else {
    await db.orm.public.MoveInChecklistItem.create({ tenantId: session.tenantId, itemKey });
  }

  return Response.json({ completed: await completedKeys(session.tenantId) });
}
