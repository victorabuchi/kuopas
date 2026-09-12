'use server';

import { compare, hash } from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { createTenantWithGroups } from './groups';
import { createSession, destroySession } from './session';

const BCRYPT_ROUNDS = 12;

export async function registerAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  const unitId = String(formData.get('unitId') ?? '').trim();

  if (!name || !email || !unitId) {
    redirect(`/register?error=${encodeURIComponent('Name, email, and unit are all required.')}`);
  }
  if (password.length < 8) {
    redirect(`/register?error=${encodeURIComponent('Password must be at least 8 characters.')}`);
  }

  const existing = await db.orm.public.Tenant.where({ email }).first();
  if (existing) {
    redirect(`/register?error=${encodeURIComponent('An account with that email already exists.')}`);
  }

  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const { tenant } = await createTenantWithGroups({ name, email, unitId, passwordHash });

  await createSession(tenant.id);
  redirect('/home');
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  const genericError = `/login?error=${encodeURIComponent('Incorrect email or password.')}`;

  if (!email || !password) redirect(genericError);

  const tenant = await db.orm.public.Tenant.where({ email }).first();
  if (!tenant?.passwordHash) redirect(genericError);

  const valid = await compare(password, tenant.passwordHash);
  if (!valid) redirect(genericError);

  await createSession(tenant.id);
  redirect('/home');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
