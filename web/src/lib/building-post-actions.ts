'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getStaffSession } from './staff-session';
import { savePhotoUpload } from './uploads';
import { sendPushToBuilding } from './push';

const NOTICEBOARD_CATEGORIES = ['furniture', 'lost_found', 'borrow', 'giveaway', 'other'] as const;

async function tenantsBuildingId(tenantId: string): Promise<string> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) throw new Error('Tenant not found');
  const unit = await db.orm.public.Unit.where({ id: tenant.unitId }).first();
  if (!unit) throw new Error('Unit not found');
  const stairwell = await db.orm.public.Stairwell.where({ id: unit.stairwellId }).first();
  if (!stairwell) throw new Error('Stairwell not found');
  return stairwell.buildingId;
}

// Resident posts to the noticeboard: furniture, lost & found, "anyone have a drill."
export async function createNoticeboardPostAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const category = String(formData.get('category') ?? '');
  const photo = formData.get('photo') as File | null;

  if (!title || !content) throw new Error('Title and description are required');
  if (!NOTICEBOARD_CATEGORIES.includes(category as (typeof NOTICEBOARD_CATEGORIES)[number])) {
    throw new Error('Invalid category');
  }

  const buildingId = await tenantsBuildingId(session.tenantId);
  const photoUrl = await savePhotoUpload(photo, 'noticeboard');

  const post = await db.orm.public.BuildingPost.create({
    buildingId,
    type: 'noticeboard',
    noticeboardCategory: category as (typeof NOTICEBOARD_CATEGORIES)[number],
    authorTenantId: session.tenantId,
    title,
    content,
    photoUrl,
  });

  await sendPushToBuilding(buildingId, {
    title: 'New on the noticeboard',
    body: title,
    url: `/feed/${post.id}`,
  });

  revalidatePath('/feed');
}

// Staff posts a general announcement to a whole building. No-reply; residents
// can only react.
export async function createAnnouncementAction(formData: FormData) {
  const staffSession = await getStaffSession();
  if (!staffSession) throw new Error('Not signed in as staff');

  const buildingId = String(formData.get('buildingId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const photo = formData.get('photo') as File | null;

  if (!buildingId || !title || !content) throw new Error('Building, title, and content are required');

  const photoUrl = await savePhotoUpload(photo, 'announcements');

  const post = await db.orm.public.BuildingPost.create({
    buildingId,
    type: 'announcement',
    authorStaffId: staffSession.staffId,
    title,
    content,
    photoUrl,
  });

  await sendPushToBuilding(buildingId, {
    title: 'Kuopas announcement',
    body: title,
    url: `/feed/${post.id}`,
  });

  revalidatePath('/feed');
  revalidatePath('/staff');
}

export async function commentOnPostAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const postId = String(formData.get('postId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!postId || !content) throw new Error('Comment content is required');

  const post = await db.orm.public.BuildingPost.where({ id: postId }).first();
  if (!post) throw new Error('Post not found');
  if (post.type !== 'noticeboard') throw new Error('This post cannot be replied to');

  await db.orm.public.BuildingPostComment.create({ postId, authorId: session.tenantId, content });

  revalidatePath('/feed');
  revalidatePath(`/feed/${postId}`);
}

export async function reactToPostAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const postId = String(formData.get('postId') ?? '').trim();
  if (!postId) throw new Error('Missing post');

  const existing = await db.orm.public.BuildingPostReaction.where({
    postId,
    tenantId: session.tenantId,
  }).first();

  if (existing) {
    await db.orm.public.BuildingPostReaction.where({ id: existing.id }).delete();
  } else {
    await db.orm.public.BuildingPostReaction.create({ postId, tenantId: session.tenantId });
  }

  revalidatePath('/feed');
  revalidatePath(`/feed/${postId}`);
}
