import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'kuopas_bank';

function sign(payload: string): string {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return createHmac('sha256', secret).update(`bank:${payload}`).digest('base64url');
}

export async function issueState(tenantId: string): Promise<string> {
  const state = randomBytes(16).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ state, tenantId, exp: Date.now() + 15 * 60 * 1000 })).toString('base64url');
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 900,
  });
  return state;
}

// Returns the tenant the state was issued to, and consumes the cookie.
export async function consumeState(state: string): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { state: string; tenantId: string; exp: number };
    return data.state === state && data.exp > Date.now() ? data.tenantId : null;
  } catch {
    return null;
  }
}
