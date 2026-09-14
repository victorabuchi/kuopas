import { db } from '../prisma/db';
import { getSession } from './session';
import { getStaffSession } from './staff-session';

// Resolves who is allowed to act on the staff side: a genuine staff login,
// or a tenant whose role is admin (who acts through their linked staff
// record, so admin-authored content looks identical to regular staff
// content everywhere it's displayed).
export async function requireStaffAccess(): Promise<{ staffId: string; isAdmin: boolean }> {
  const staffSession = await getStaffSession();
  if (staffSession) return { staffId: staffSession.staffId, isAdmin: false };

  const tenantSession = await getSession();
  if (tenantSession) {
    const tenant = await db.orm.public.Tenant.where({ id: tenantSession.tenantId }).first();
    if (tenant?.role === 'admin' && tenant.staffId) {
      return { staffId: tenant.staffId, isAdmin: true };
    }
  }

  throw new Error('Not authorized');
}

// Same, but for page-level guards that redirect instead of throwing.
export async function getStaffAccess(): Promise<{ staffId: string; isAdmin: boolean } | null> {
  try {
    return await requireStaffAccess();
  } catch {
    return null;
  }
}

export async function isAdminTenant(tenantId: string): Promise<boolean> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  return tenant?.role === 'admin';
}
