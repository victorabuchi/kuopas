import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { readFields } from '../../../../lib/mobile-http';
import { serializeComplaint } from '../../../../lib/mobile-serializers';
import { assignCluster } from '../../../../lib/maintenance';
import { saveMediaUpload, savePhotoUpload } from '../../../../lib/uploads';

const CATEGORIES = ['plumbing', 'electrical', 'heating', 'appliance', 'pest', 'noise', 'structural', 'other'] as const;

// Mirrors ComplaintsTab's query in src/app/(app)/messages/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const complaints = await db.orm.public.Complaint.where({ tenantId: session.tenantId })
    .orderBy((c) => c.createdAt.desc())
    .limit(50)
    .all();

  return Response.json(complaints.map(serializeComplaint));
}

// Mirrors submitComplaintAction in src/lib/complaint-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { fields, photo, files } = await readFields(request);
  const category = fields['category'] ?? '';
  const description = (fields['description'] ?? '').trim();

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return new Response('Invalid category', { status: 400 });
  }
  if (!description) return new Response('Description is required', { status: 400 });

  let photoUrl: string | null;
  let videoUrl: string | null = null;
  try {
    photoUrl = await savePhotoUpload(photo, 'complaints');
    const video = await saveMediaUpload(files['video'] ?? null, 'complaints');
    if (video && video.kind !== 'video') return new Response('Use the photo field for pictures', { status: 400 });
    videoUrl = video?.url ?? null;
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Photo upload failed.', { status: 400 });
  }

  const complaint = await db.orm.public.Complaint.create({
    tenantId: session.tenantId,
    category: category as (typeof CATEGORIES)[number],
    description,
    photoUrl,
    videoUrl,
  });
  await assignCluster(complaint.id);

  return Response.json(serializeComplaint(complaint), { status: 201 });
}
