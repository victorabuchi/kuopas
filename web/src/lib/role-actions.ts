'use server';

import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { requireStaffAccess } from './portal-access';

const BCRYPT_ROUNDS = 12;

// Only an existing admin can grant or revoke admin, and only an existing
// admin can create or remove customer support accounts. requireStaffAccess()
// throws for a non-admin staff session, but doesn't by itself guarantee
// isAdmin, so every action here checks that explicitly too.
async function requireAdmin() {
  const access = await requireStaffAccess();
  if (!access.isAdmin) throw new Error('Only an admin can do this');
  return access;
}

// Promotes a tenant to admin: creates a linked Staff record for them (so
// their staff-side actions attribute correctly) and flips their role.
export async function grantAdminAction(formData: FormData) {
  await requireAdmin();

  const tenantId = String(formData.get('tenantId') ?? '').trim();
  if (!tenantId) throw new Error('Missing tenant');

  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) throw new Error('Tenant not found');

  let staffId = tenant.staffId;
  if (!staffId) {
    const passwordHash = await hash(crypto.randomUUID(), BCRYPT_ROUNDS);
    const staff = await db.orm.public.Staff.create({ name: tenant.name, email: tenant.email, passwordHash });
    staffId = staff.id;
  }

  await db.orm.public.Tenant.where({ id: tenantId }).update({ role: 'admin', staffId });

  revalidatePath('/admin');
}

export async function revokeAdminAction(formData: FormData) {
  await requireAdmin();

  const tenantId = String(formData.get('tenantId') ?? '').trim();
  if (!tenantId) throw new Error('Missing tenant');

  await db.orm.public.Tenant.where({ id: tenantId }).update({ role: 'resident' });

  revalidatePath('/admin');
}

// Creates a standalone customer support (Staff) account, not linked to any
// tenant.
export async function createSupportAccountAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!name || !email || !password) throw new Error('Name, email, and password are all required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');

  const existing = await db.orm.public.Staff.where({ email }).first();
  if (existing) throw new Error('An account with that email already exists');

  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  await db.orm.public.Staff.create({ name, email, passwordHash });

  revalidatePath('/admin');
}

export async function removeSupportAccountAction(formData: FormData) {
  await requireAdmin();

  const staffId = String(formData.get('staffId') ?? '').trim();
  if (!staffId) throw new Error('Missing account');

  const linkedTenant = await db.orm.public.Tenant.where({ staffId }).first();
  if (linkedTenant) throw new Error('This account belongs to an admin; remove their admin role instead');

  await db.orm.public.Staff.where({ id: staffId }).delete();

  revalidatePath('/admin');
}
