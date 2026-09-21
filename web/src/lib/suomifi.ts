import { createHash, createHmac, createPublicKey, createVerify, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

// Suomi.fi e-Identification (Suomi.fi-tunnistus) over OpenID Connect.
//
// Live mode needs an agreement with the Digital and Population Data Services
// Agency (DVV) and these environment variables:
//   SUOMIFI_ISSUER         base URL of the OIDC provider (its discovery document is read from it)
//   SUOMIFI_CLIENT_ID / SUOMIFI_CLIENT_SECRET
//   SUOMIFI_SCOPE          default "openid personal_identity_code"
//   SUOMIFI_PID_CLAIM      claim that carries the person identifier, default "personal_identity_code"
//   SUOMIFI_TOKEN_AUTH     "basic" (default) or "post" for client authentication at the token endpoint
// For local development SUOMIFI_MODE=mock uses a built-in fake identity
// provider. It is refused in production.

export type SuomiFiMode = 'live' | 'mock' | 'off';

export function suomiFiMode(): SuomiFiMode {
  if (process.env['SUOMIFI_ISSUER'] && process.env['SUOMIFI_CLIENT_ID'] && process.env['SUOMIFI_CLIENT_SECRET']) return 'live';
  if (process.env['SUOMIFI_MODE'] === 'mock' && process.env.NODE_ENV !== 'production') return 'mock';
  return 'off';
}

type Discovery = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string };

export function getOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export function redirectUri(origin: string): string {
  return `${origin}/api/auth/suomifi/callback`;
}

function clientId(): string {
  return suomiFiMode() === 'mock' ? 'kuopas-mock' : process.env['SUOMIFI_CLIENT_ID']!;
}
function clientSecret(): string {
  return suomiFiMode() === 'mock' ? 'mock-secret' : process.env['SUOMIFI_CLIENT_SECRET']!;
}

const discoveryCache = new Map<string, { at: number; value: Discovery }>();

async function discover(origin: string): Promise<Discovery> {
  const issuer = suomiFiMode() === 'mock' ? `${origin}/api/dev/mock-suomifi` : process.env['SUOMIFI_ISSUER']!.replace(/\/$/, '');
  const cached = discoveryCache.get(issuer);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.value;
  const res = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`Suomi.fi discovery failed (${res.status})`);
  const value = (await res.json()) as Discovery;
  discoveryCache.set(issuer, { at: Date.now(), value });
  return value;
}

function secret(): string {
  const value = process.env['SESSION_SECRET'];
  if (!value) throw new Error('SESSION_SECRET is not set');
  return value;
}
const sign = (payload: string) => createHmac('sha256', secret()).update(`suomifi:${payload}`).digest('base64url');

// The person identifier is never stored, only a keyed hash of it.
export function hashPersonId(pid: string): string {
  return createHmac('sha256', secret()).update(`suomifi-person:${pid}`).digest('hex');
}

export type Intent = 'verify' | 'sign';
type Pending = { state: string; nonce: string; verifier: string; intent: Intent; leaseId: string | null; tenantId: string; returnTo: string; exp: number };

const COOKIE = 'kuopas_suomifi';

export async function beginLogin(origin: string, input: { intent: Intent; leaseId: string | null; tenantId: string; returnTo: string }): Promise<string> {
  const d = await discover(origin);
  const state = randomBytes(16).toString('base64url');
  const nonce = randomBytes(16).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const pending: Pending = { state, nonce, verifier, ...input, exp: Date.now() + 10 * 60 * 1000 };
  const payload = Buffer.from(JSON.stringify(pending)).toString('base64url');
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    redirect_uri: redirectUri(origin),
    scope: process.env['SUOMIFI_SCOPE'] ?? 'openid personal_identity_code',
    state,
    nonce,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  });
  // A signature must come from a login made just now, not from an old session.
  if (input.intent === 'sign') {
    params.set('prompt', 'login');
    params.set('max_age', '0');
  }
  return `${d.authorization_endpoint}?${params.toString()}`;
}

async function readPending(): Promise<Pending | null> {
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
    const pending = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Pending;
    return pending.exp > Date.now() ? pending : null;
  } catch {
    return null;
  }
}

async function verifySignature(idToken: string, jwksUri: string): Promise<void> {
  const [h, p, s] = idToken.split('.');
  if (!h || !p || !s) throw new Error('Malformed id_token');
  const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')) as { alg?: string; kid?: string };
  if (header.alg !== 'RS256') throw new Error('Unsupported signing algorithm');
  const res = await fetch(jwksUri);
  if (!res.ok) throw new Error('Could not load signing keys');
  const { keys } = (await res.json()) as { keys: (import('node:crypto').JsonWebKey & { kid?: string })[] };
  const jwk = keys.find((k) => !header.kid || k.kid === header.kid);
  if (!jwk) throw new Error('Unknown signing key');
  const ok = createVerify('RSA-SHA256').update(`${h}.${p}`).verify(createPublicKey({ key: jwk as import('node:crypto').JsonWebKey, format: 'jwk' }), Buffer.from(s, 'base64url'));
  if (!ok) throw new Error('Bad token signature');
}

export type SuomiFiResult = { intent: Intent; leaseId: string | null; tenantId: string; returnTo: string; personHash: string; name: string | null };

export async function finishLogin(origin: string, code: string, state: string): Promise<SuomiFiResult> {
  const pending = await readPending();
  if (!pending || pending.state !== state) throw new Error('Login expired or invalid');
  const d = await discover(origin);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(origin),
    code_verifier: pending.verifier,
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if ((process.env['SUOMIFI_TOKEN_AUTH'] ?? 'basic') === 'post' && suomiFiMode() !== 'mock') {
    body.set('client_id', clientId());
    body.set('client_secret', clientSecret());
  } else {
    headers['Authorization'] = `Basic ${Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')}`;
  }
  const res = await fetch(d.token_endpoint, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new Error('Missing id_token');

  await verifySignature(idToken, d.jwks_uri);
  const claims = JSON.parse(Buffer.from(idToken.split('.')[1]!, 'base64url').toString('utf8')) as Record<string, unknown> & {
    iss?: string;
    aud?: string | string[];
    exp?: number;
    nonce?: string;
    auth_time?: number;
  };
  const audOk = Array.isArray(claims.aud) ? claims.aud.includes(clientId()) : claims.aud === clientId();
  if (claims.iss !== d.issuer || !audOk) throw new Error('Wrong issuer or audience');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) throw new Error('Expired token');
  if (claims.nonce !== pending.nonce) throw new Error('Nonce mismatch');
  if (pending.intent === 'sign' && typeof claims.auth_time === 'number' && Date.now() - claims.auth_time * 1000 > 5 * 60 * 1000) {
    throw new Error('Authentication is too old to sign');
  }

  const claimName = process.env['SUOMIFI_PID_CLAIM'] ?? 'personal_identity_code';
  const pid = String(claims[claimName] ?? claims['sub'] ?? '');
  if (!pid) throw new Error('No person identifier in the login');

  const given = typeof claims['given_name'] === 'string' ? claims['given_name'] : '';
  const family = typeof claims['family_name'] === 'string' ? claims['family_name'] : '';
  return {
    intent: pending.intent,
    leaseId: pending.leaseId,
    tenantId: pending.tenantId,
    returnTo: pending.returnTo,
    personHash: hashPersonId(pid),
    name: `${given} ${family}`.trim() || null,
  };
}
