import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;

// Mirrors the query in src/app/(app)/communities/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const communities = await db.orm.public.Community.include('members', (m) => m)
    .orderBy((c) => c.createdAt.desc())
    .limit(200)
    .all();

  return Response.json(
    communities.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      memberCount: c.members.length,
      isMember: c.members.some((m) => m.tenantId === session.tenantId),
    })),
  );
}

// Mirrors createCommunityAction in src/lib/community-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const description = String(body?.description ?? '').trim();
  if (name.length < 3 || name.length > NAME_MAX) return new Response('Name must be 3 to 50 characters', { status: 400 });
  if (description.length > DESCRIPTION_MAX) return new Response('Description is too long', { status: 400 });

  const community = await db.orm.public.Community.create({ name, description, createdById: session.tenantId });
  await db.orm.public.CommunityMember.create({ communityId: community.id, tenantId: session.tenantId });

  return Response.json({ id: community.id }, { status: 201 });
}
