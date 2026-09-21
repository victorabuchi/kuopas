import { getMobileSession } from '../../../../lib/mobile-auth';
import { createContentReport } from '../../../../lib/content-reports';

// Reports a direct or community message: { kind: 'direct' | 'community', messageId, reason? }.
// Group chat messages and noticeboard posts already have their own report routes.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const body = await request.json().catch(() => null);
  const reason = String(body?.reason ?? '').trim().slice(0, 300) || null;
  const ok = await createContentReport(session.tenantId, String(body?.kind ?? ''), String(body?.messageId ?? ''), reason);
  if (!ok) return new Response('Message not found', { status: 404 });
  return Response.json({ reported: true }, { status: 201 });
}
