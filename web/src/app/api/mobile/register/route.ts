import { hash } from 'bcryptjs';
import { db } from '../../../../prisma/db';
import { createTenantWithGroups } from '../../../../lib/groups';
import { createMobileToken } from '../../../../lib/mobile-auth';

const BCRYPT_ROUNDS = 12;

// Mirrors registerAction in src/lib/auth-actions.ts, minus the
// cookie/redirect: returns a bearer token instead of setting kuopas_session.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? '');
  const unitId = String(body?.unitId ?? '').trim();

  if (!name || !email || !unitId) {
    return new Response('Name, email, and unit are all required.', { status: 400 });
  }
  if (password.length < 8) {
    return new Response('Password must be at least 8 characters.', { status: 400 });
  }

  const existing = await db.orm.public.Tenant.where({ email }).first();
  if (existing) {
    return new Response('An account with that email already exists.', { status: 409 });
  }

  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const { tenant } = await createTenantWithGroups({ name, email, unitId, passwordHash });

  const token = createMobileToken(tenant.id);
  return Response.json({ token });
}
