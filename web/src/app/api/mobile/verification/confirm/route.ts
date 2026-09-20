import { getMobileSession } from '../../../../../lib/mobile-auth';
import { confirmEmailCode } from '../../../../../lib/verification';

// Mirrors confirmEmailCodeAction in src/lib/verification-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const ok = await confirmEmailCode(session.tenantId, String(body?.code ?? '').trim());
  if (!ok) return Response.json({ error: 'code' }, { status: 400 });

  return new Response(null, { status: 204 });
}
