import { getMobileSession } from '../../../../../lib/mobile-auth';
import { sendEmailCode } from '../../../../../lib/verification';

// Mirrors requestEmailCodeAction in src/lib/verification-actions.ts. Failures
// return the same error keys the web page maps to messages.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const result = await sendEmailCode(session.tenantId, String(body?.email ?? '').trim());
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  return Response.json({ ok: true, devCode: result.devCode ?? null });
}
