import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '../prisma/db';
import { deletePrivateDocument } from './uploads';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env['SESSION_SECRET'];
  if (!value) throw new Error('SESSION_SECRET is not set');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(`delete-account:${payload}`).digest('base64url');
}

// A signed, expiring link proves the person controls the account's email.
export function createDeletionToken(tenantId: string): string {
  const payload = Buffer.from(JSON.stringify({ tenantId, expiresAt: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readDeletionToken(token: string): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { tenantId, expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof tenantId !== 'string' || typeof expiresAt !== 'number' || Date.now() > expiresAt) return null;
    return tenantId;
  } catch {
    return null;
  }
}

export type DeletionCheck = { ok: true } | { ok: false; reason: 'not_found' | 'last_admin' | 'lease' };

// Rent records that are still running or unpaid must stay with Kuopas, so those
// accounts are closed by a manager instead of by self-service.
export async function canDeleteAccount(tenantId: string): Promise<DeletionCheck> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) return { ok: false, reason: 'not_found' };

  if (tenant.role === 'admin') {
    const admins = await db.orm.public.Tenant.where({ role: 'admin' }).all();
    if (admins.filter((a) => a.id !== tenantId).length === 0) return { ok: false, reason: 'last_admin' };
  }

  const leases = await db.orm.public.Lease.where({ tenantId }).include('charges', (c) => c).all();
  const now = Date.now();
  const running = leases.some((l) => ['active', 'pending_signature'].includes(l.status) && new Date(l.endDate).getTime() >= now);
  const unpaid = leases.some((l) => l.status !== 'cancelled' && (l.charges ?? []).some((c) => !c.paidAt));
  if (running || unpaid) return { ok: false, reason: 'lease' };
  return { ok: true };
}

// Deletes the account and everything that hangs off it (messages, posts,
// bookings, profiles, verification records). Uploaded private documents are
// removed from storage first.
export async function deleteTenantAccount(tenantId: string): Promise<DeletionCheck> {
  const check = await canDeleteAccount(tenantId);
  if (!check.ok) return check;

  const verifications = await db.orm.public.IdentityVerification.where({ tenantId }).all();
  for (const v of verifications) await deletePrivateDocument(v.docPath);
  const exchange = await db.orm.public.ExchangeApplication.where({ tenantId }).first();
  if (exchange) await deletePrivateDocument(exchange.docPath);

  await db.orm.public.Tenant.where({ id: tenantId }).delete();
  return { ok: true };
}
