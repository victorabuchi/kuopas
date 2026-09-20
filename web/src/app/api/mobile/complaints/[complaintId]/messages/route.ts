import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors sendComplaintMessageAction (actingAs "tenant") in src/lib/complaint-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ complaintId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { complaintId } = await params;
  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? '').trim();
  if (!content) return new Response('Message content is required', { status: 400 });

  const complaint = await db.orm.public.Complaint.where({ id: complaintId }).first();
  if (!complaint) return new Response('Complaint not found', { status: 404 });
  if (complaint.tenantId !== session.tenantId) return new Response('Not your complaint', { status: 403 });

  const message = await db.orm.public.ComplaintMessage.create({
    complaintId,
    senderTenantId: session.tenantId,
    senderStaffId: null,
    content,
  });

  return Response.json(
    { id: message.id, content: message.content, sentAt: message.sentAt, isOwn: true },
    { status: 201 },
  );
}
