import { createHash, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';

// A stand-in for Suomi.fi used only when SUOMIFI_MODE=mock outside production,
// so the whole login and signing flow can be tried without a DVV agreement.
type MockCode = { pid: string; given: string; family: string; nonce: string; challenge: string; clientId: string; redirect: string; exp: number };
type Globals = { __mockKeys?: { privateKey: ReturnType<typeof generateKeyPairSync>['privateKey']; jwk: JsonWebKey & { kid: string } }; __mockCodes?: Map<string, MockCode> };
const g = globalThis as unknown as Globals;

function keys() {
  if (!g.__mockKeys) {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    g.__mockKeys = { privateKey, jwk: { ...(publicKey.export({ format: 'jwk' }) as JsonWebKey), kid: 'mock-1', alg: 'RS256', use: 'sig' } };
  }
  return g.__mockKeys;
}
const codes = () => (g.__mockCodes ??= new Map());

export const MOCK_PEOPLE = [
  { id: 'FI-TEST-0001', given: 'Testi', family: 'Opiskelija' },
  { id: 'FI-TEST-0002', given: 'Toinen', family: 'Testaaja' },
  { id: 'FI-TEST-0003', given: 'Kolmas', family: 'Kokeilija' },
  { id: 'FI-TEST-0004', given: 'Neljas', family: 'Koehenkilo' },
];

export function mockJwks() {
  return { keys: [keys().jwk] };
}

export function mockDiscovery(origin: string) {
  const issuer = `${origin}/api/dev/mock-suomifi`;
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    jwks_uri: `${issuer}/jwks`,
  };
}

export function mockIssueCode(person: (typeof MOCK_PEOPLE)[number], p: { nonce: string; challenge: string; clientId: string; redirect: string }): string {
  const code = randomBytes(16).toString('base64url');
  codes().set(code, { pid: person.id, given: person.given, family: person.family, ...p, exp: Date.now() + 60_000 });
  return code;
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

export function mockExchange(origin: string, code: string, verifier: string): { id_token: string } | null {
  const entry = codes().get(code);
  codes().delete(code);
  if (!entry || entry.exp < Date.now()) return null;
  if (createHash('sha256').update(verifier).digest('base64url') !== entry.challenge) return null;
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'RS256', kid: 'mock-1', typ: 'JWT' });
  const body = b64({
    iss: mockDiscovery(origin).issuer,
    aud: entry.clientId,
    sub: `sub-${entry.pid}`,
    personal_identity_code: entry.pid,
    given_name: entry.given,
    family_name: entry.family,
    nonce: entry.nonce,
    iat: now,
    auth_time: now,
    exp: now + 300,
  });
  const signature = createSign('RSA-SHA256').update(`${head}.${body}`).sign(keys().privateKey).toString('base64url');
  return { id_token: `${head}.${body}.${signature}` };
}
