import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { serializePost } from '../../../../lib/mobile-serializers';

// Mirrors the query in src/app/(app)/feed/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') === 'noticeboard' ? 'noticeboard' : 'announcement';

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });
  const unit = await db.orm.public.Unit.where({ id: tenant.unitId }).first();
  if (!unit) return new Response('Unit not found', { status: 404 });
  const stairwell = await db.orm.public.Stairwell.where({ id: unit.stairwellId }).first();
  if (!stairwell) return new Response('Stairwell not found', { status: 404 });

  const posts = await db.orm.public.BuildingPost.where({ buildingId: stairwell.buildingId, type })
    .include('authorTenant', (a) => a)
    .include('authorStaff', (a) => a)
    .include('comments', (c) => c.include('author', (a) => a).orderBy((cm) => cm.createdAt.asc()))
    .include('reactions', (r) => r)
    .orderBy((p) => p.createdAt.desc())
    .limit(50)
    .all();

  return Response.json(
    posts.map((post) =>
      serializePost({
        ...post,
        comments: post.comments.map((c) => ({ ...c, author: c.author! })),
      }),
    ),
  );
}
