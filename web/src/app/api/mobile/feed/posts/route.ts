import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { serializePost } from '../../../../../lib/mobile-serializers';
import { sendPushToBuilding } from '../../../../../lib/push';

const NOTICEBOARD_CATEGORIES = ['furniture', 'lost_found', 'borrow', 'giveaway', 'other'] as const;

// Mirrors createNoticeboardPostAction in src/lib/building-post-actions.ts.
// Photo upload isn't wired up yet (the mobile client doesn't send one).
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });
  if (tenant.blockedFromNoticeboard) {
    return new Response('You are blocked from posting to the noticeboard', { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const category = String(body?.category ?? '');

  if (!title || !content) return new Response('Title and description are required', { status: 400 });
  if (!NOTICEBOARD_CATEGORIES.includes(category as (typeof NOTICEBOARD_CATEGORIES)[number])) {
    return new Response('Invalid category', { status: 400 });
  }

  const unit = await db.orm.public.Unit.where({ id: tenant.unitId }).first();
  if (!unit) return new Response('Unit not found', { status: 404 });
  const stairwell = await db.orm.public.Stairwell.where({ id: unit.stairwellId }).first();
  if (!stairwell) return new Response('Stairwell not found', { status: 404 });

  const created = await db.orm.public.BuildingPost.create({
    buildingId: stairwell.buildingId,
    type: 'noticeboard',
    noticeboardCategory: category as (typeof NOTICEBOARD_CATEGORIES)[number],
    authorTenantId: session.tenantId,
    title,
    content,
  });

  await sendPushToBuilding(stairwell.buildingId, {
    title: 'New on the noticeboard',
    body: title,
    url: `/feed/${created.id}`,
  });

  const post = await db.orm.public.BuildingPost.where({ id: created.id })
    .include('authorTenant', (a) => a)
    .include('authorStaff', (a) => a)
    .include('comments', (c) => c.include('author', (a) => a))
    .include('reactions', (r) => r)
    .first();

  return Response.json(
    serializePost({
      ...post!,
      comments: post!.comments.map((c) => ({ ...c, author: c.author! })),
    }),
    { status: 201 },
  );
}
