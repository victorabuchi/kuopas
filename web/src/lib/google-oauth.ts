import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const AUTH_URL = process.env['GOOGLE_AUTH_URL'] ?? 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = process.env['GOOGLE_TOKEN_URL'] ?? 'https://oauth2.googleapis.com/token';

// Deep link the Expo app registers (scheme "kuopas" in app.json).
export const MOBILE_REDIRECT = 'kuopas://auth';

export const STATE_COOKIE = 'kuopas_google_state';
export const SIGNUP_COOKIE = 'kuopas_google_signup';
const STATE_TTL_SECONDS = 10 * 60;
const SIGNUP_TTL_SECONDS = 15 * 60;

export type GoogleIntent = 'resident' | 'staff' | 'mobile';
export type GoogleProfile = { email: string; name: string };

export function googleConfigured(): boolean {
  return Boolean(process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']);
}

// Behind Render's proxy the request URL can carry the internal host, so prefer
// the forwarded headers to rebuild the public origin Google must redirect to.
export function getOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export function redirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env['GOOGLE_CLIENT_ID']!,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// Exchanges the authorization code for tokens and returns the verified Google
// profile. The id_token comes straight from Google's token endpoint over TLS,
// so its claims are checked here instead of re-verifying its signature.
export async function exchangeCodeForProfile(code: string, origin: string): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env['GOOGLE_CLIENT_ID']!,
      client_secret: process.env['GOOGLE_CLIENT_SECRET']!,
      redirect_uri: redirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  const payloadPart = idToken?.split('.')[1];
  if (!payloadPart) throw new Error('Missing id_token');

  const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
    iss?: string;
    aud?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };

  if (claims.aud !== process.env['GOOGLE_CLIENT_ID']) throw new Error('Wrong audience');
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') throw new Error('Wrong issuer');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) throw new Error('Expired token');
  if (!claims.email) throw new Error('No email');
  if (claims.email_verified !== true && claims.email_verified !== 'true') throw new Error('Email not verified');

  const email = claims.email.trim().toLowerCase();
  return { email, name: (claims.name ?? email.split('@')[0] ?? '').trim() };
}

function secret(): string {
  const value = process.env['SESSION_SECRET'];
  if (!value) throw new Error('SESSION_SECRET is not set');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encodeSigned(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeSigned<T>(value: string): T | null {
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function setStateCookie(state: string, intent: GoogleIntent): Promise<void> {
  const store = await cookies();
  store.set(STATE_COOKIE, JSON.stringify({ state, intent }), { ...cookieBase, maxAge: STATE_TTL_SECONDS });
}

export async function takeStateCookie(): Promise<{ state: string; intent: GoogleIntent } | null> {
  const store = await cookies();
  const raw = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: string; intent?: string };
    if (typeof parsed.state !== 'string') return null;
    const intent: GoogleIntent = parsed.intent === 'staff' || parsed.intent === 'mobile' ? parsed.intent : 'resident';
    return { state: parsed.state, intent };
  } catch {
    return null;
  }
}

export async function setSignupCookie(profile: GoogleProfile): Promise<void> {
  const store = await cookies();
  store.set(SIGNUP_COOKIE, encodeSigned({ ...profile, expiresAt: Date.now() + SIGNUP_TTL_SECONDS * 1000 }), {
    ...cookieBase,
    maxAge: SIGNUP_TTL_SECONDS,
  });
}

export async function readSignupCookie(): Promise<GoogleProfile | null> {
  const store = await cookies();
  const raw = store.get(SIGNUP_COOKIE)?.value;
  if (!raw) return null;
  const data = decodeSigned<GoogleProfile & { expiresAt?: number }>(raw);
  if (!data || typeof data.email !== 'string' || typeof data.expiresAt !== 'number' || data.expiresAt < Date.now()) {
    return null;
  }
  return { email: data.email, name: data.name };
}

export async function clearSignupCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SIGNUP_COOKIE);
}
