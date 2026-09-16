import { createHmac, timingSafeEqual } from 'node:crypto';

// Bearer-token counterpart to session.ts's cookie, for the mobile app (which
// has no same-origin cookie jar). Same HMAC-signed payload shape and expiry;
// the token itself is handed to the client once at login/register and sent
// back as `Authorization: Bearer <token>` on every request.
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const value = process.env['SESSION_SECRET'];
  if (!value) throw new Error('SESSION_SECRET is not set');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createMobileToken(tenantId: string): string {
  const expiresAt = Date.now() + TOKEN_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ tenantId, expiresAt })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifyMobileToken(token: string): { tenantId: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { tenantId, expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof tenantId !== 'string' || typeof expiresAt !== 'number') return null;
    if (Date.now() > expiresAt) return null;
    return { tenantId };
  } catch {
    return null;
  }
}

export function getMobileSession(request: Request): { tenantId: string } | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  if (!token) return null;
  return verifyMobileToken(token);
}
