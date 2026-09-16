import { compare } from 'bcryptjs';
import { db } from '../../../../prisma/db';
import { createMobileToken } from '../../../../lib/mobile-auth';

// Mirrors loginAction in src/lib/auth-actions.ts, minus the cookie/redirect:
// returns a bearer token instead of setting kuopas_session.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? '');

  const genericError = 'Incorrect email or password.';
  if (!email || !password) return new Response(genericError, { status: 401 });

  const tenant = await db.orm.public.Tenant.where({ email }).first();
  if (!tenant?.passwordHash) return new Response(genericError, { status: 401 });

  const valid = await compare(password, tenant.passwordHash);
  if (!valid) return new Response(genericError, { status: 401 });

  const token = createMobileToken(tenant.id);
  return Response.json({ token });
}
