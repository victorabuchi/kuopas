import { db } from '../prisma/db';
import { assignTenantToChatGroups } from './groups';

// Puts a tenant into an apartment. Chats of any old apartment, floor, stairwell
// and building are left and the new ones joined, and any active lease follows
// them. Works for applicants who have no apartment yet.
export async function moveTenantToUnit(tenantId: string, unitId: string) {
  const memberships = await db.orm.public.ChatGroupMember.where({ tenantId }).all();
  for (const m of memberships) await db.orm.public.ChatGroupMember.where({ id: m.id }).delete();
  await db.orm.public.Tenant.where({ id: tenantId }).update({ unitId });
  await assignTenantToChatGroups(tenantId);
  const leases = await db.orm.public.Lease.where({ tenantId, status: 'active' }).all();
  for (const lease of leases) await db.orm.public.Lease.where({ id: lease.id }).update({ unitId });
}
