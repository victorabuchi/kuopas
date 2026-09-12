import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'kuopas_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const value = process.env['SESSION_SECRET'];
  if (!value) throw new Error('SESSION_SECRET is not set');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encode(tenantId: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ tenantId, expiresAt })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decode(cookieValue: string): { tenantId: string } | null {
  const [payload, signature] = cookieValue.split('.');
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

export async function createSession(tenantId: string): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const store = await cookies();
  store.set(COOKIE_NAME, encode(tenantId, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<{ tenantId: string } | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return decode(value);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
