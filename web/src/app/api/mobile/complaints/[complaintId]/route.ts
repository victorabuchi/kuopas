import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { serializeComplaint } from '../../../../../lib/mobile-serializers';

// Mirrors src/app/(app)/complaints/[complaintId]/page.tsx.
export async function GET(request: Request, { params }: { params: Promise<{ complaintId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { complaintId } = await params;

  const complaint = await db.orm.public.Complaint.where({ id: complaintId }).first();
  if (!complaint) return new Response('Complaint not found', { status: 404 });
  if (complaint.tenantId !== session.tenantId) return new Response('Not your complaint', { status: 403 });

  const messages = await db.orm.public.ComplaintMessage.where({ complaintId })
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  return Response.json({
    complaint: serializeComplaint(complaint),
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      sentAt: m.sentAt,
      isOwn: m.senderTenantId === session.tenantId,
    })),
  });
}
