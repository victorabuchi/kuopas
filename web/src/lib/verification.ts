import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { db } from '../prisma/db';
import { emailConfigured, sendEmail } from './email';

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function codeHash(tenantId: string, email: string, code: string): string {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return createHmac('sha256', secret).update(`${tenantId}:${email}:${code}`).digest('base64url');
}

// A Verified domain matches itself and any subdomain, so uef.fi also covers
// student.uef.fi.
export async function institutionForEmail(email: string): Promise<string | null> {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return null;
  const domains = await db.orm.public.VerifiedDomain.all();
  const hit = domains.find((d) => domain === d.domain || domain.endsWith(`.${d.domain}`));
  return hit ? hit.institution : null;
}

export async function isVerified(tenantId: string): Promise<boolean> {
  const approved = await db.orm.public.IdentityVerification.where({ tenantId, status: 'approved' }).first();
  return Boolean(approved);
}

export async function approveVerification(
  tenantId: string,
  method: string,
  institution: string | null,
  detail: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  await db.orm.public.IdentityVerification.create({
    tenantId,
    method,
    status: 'approved',
    institution,
    detail,
    decidedAt: now,
  });
}

// For sign-ins where the provider already proved the email (Google).
export async function autoVerifyIfUniversityEmail(tenantId: string, email: string): Promise<void> {
  if (await isVerified(tenantId)) return;
  const institution = await institutionForEmail(email);
  if (institution) await approveVerification(tenantId, 'university_email', institution, email);
}

export type SendCodeResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: 'not_university' | 'cooldown' | 'email_unavailable' };

export async function sendEmailCode(tenantId: string, email: string): Promise<SendCodeResult> {
  const normalized = email.trim().toLowerCase();
  if (!(await institutionForEmail(normalized))) return { ok: false, error: 'not_university' };

  const latest = await db.orm.public.EmailVerificationCode.where({ tenantId })
    .orderBy((c) => c.createdAt.desc())
    .first();
  if (latest && Date.now() - new Date(latest.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: 'cooldown' };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const sent = await sendEmail(
    normalized,
    'Your Kuopas verification code',
    `Your Kuopas verification code is ${code}. It expires in 15 minutes.`,
  );
  if (!sent && (emailConfigured() || process.env.NODE_ENV === 'production')) {
    return { ok: false, error: 'email_unavailable' };
  }

  await db.orm.public.EmailVerificationCode.where({ tenantId }).delete();
  await db.orm.public.EmailVerificationCode.create({
    tenantId,
    email: normalized,
    codeHash: codeHash(tenantId, normalized, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });

  // Local development has no mail provider, so hand the code back to the page.
  return sent ? { ok: true } : { ok: true, devCode: code };
}

export async function confirmEmailCode(tenantId: string, code: string): Promise<boolean> {
  const record = await db.orm.public.EmailVerificationCode.where({ tenantId })
    .orderBy((c) => c.createdAt.desc())
    .first();
  if (!record || new Date(record.expiresAt).getTime() < Date.now() || record.attempts >= MAX_ATTEMPTS) return false;

  await db.orm.public.EmailVerificationCode.where({ id: record.id }).update({ attempts: record.attempts + 1 });

  const expected = Buffer.from(record.codeHash);
  const given = Buffer.from(codeHash(tenantId, record.email, code.trim()));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

  const institution = await institutionForEmail(record.email);
  await approveVerification(tenantId, 'university_email', institution, record.email);
  await db.orm.public.EmailVerificationCode.where({ tenantId }).delete();
  return true;
}
