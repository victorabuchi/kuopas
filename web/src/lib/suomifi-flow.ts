import { db } from '../prisma/db';
import { approveVerification } from './verification';
import { leaseFingerprint, loadLeaseForSigning } from './lease-document';

export type FlowOutcome = 'ok' | 'taken' | 'mismatch' | 'no_lease' | 'already';

// Links a Suomi.fi identity to a tenant and counts it as a verified identity.
export async function linkIdentity(tenantId: string, personHash: string): Promise<'ok' | 'taken' | 'mismatch'> {
  const owner = await db.orm.public.Tenant.where({ suomiFiPersonId: personHash }).first();
  if (owner && owner.id !== tenantId) return 'taken';
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) return 'mismatch';
  if (tenant.suomiFiPersonId && tenant.suomiFiPersonId !== personHash) return 'mismatch';
  if (!tenant.suomiFiPersonId) await db.orm.public.Tenant.where({ id: tenantId }).update({ suomiFiPersonId: personHash });
  await approveVerification(tenantId, 'suomifi', null, 'Suomi.fi e-Identification');
  return 'ok';
}

// Records the resident's signature on a lease. The same person who verified
// with Suomi.fi must be the one who signs.
export async function signLease(tenantId: string, leaseId: string, personHash: string): Promise<FlowOutcome> {
  const lease = await loadLeaseForSigning(leaseId);
  if (!lease || lease.tenantId !== tenantId || !['pending_signature', 'active'].includes(lease.status)) return 'no_lease';
  if ((lease.signatures ?? []).some((s) => s.tenantId === tenantId)) return 'already';

  const linked = await linkIdentity(tenantId, personHash);
  if (linked !== 'ok') return linked;

  await db.orm.public.LeaseSignature.create({
    leaseId,
    tenantId,
    method: 'suomifi',
    personHash,
    documentHash: leaseFingerprint(lease),
  });
  if (lease.status === 'pending_signature' && lease.staffSignedAt) {
    await db.orm.public.Lease.where({ id: leaseId }).update({ status: 'active' });
  }
  return 'ok';
}
