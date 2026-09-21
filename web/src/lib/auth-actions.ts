'use server';

import { compare, hash } from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { createApplicant, createTenantWithGroups } from './groups';
import { createSession, destroySession } from './session';
import { clearSignupCookie, readSignupCookie } from './google-oauth';
import { autoVerifyIfUniversityEmail } from './verification';

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
  if (unitId === 'applicant') {
    const applicant = await createApplicant({ name, email, passwordHash });
    await autoVerifyIfUniversityEmail(applicant.id, email);
    await createSession(applicant.id);
    redirect('/apply');
  }
  const { tenant } = await createTenantWithGroups({ name, email, unitId, passwordHash });

  await createSession(tenant.id);
  redirect('/home');
}

export async function completeGoogleRegisterAction(formData: FormData) {
  const signup = await readSignupCookie();
  if (!signup) {
    redirect(`/register?error=${encodeURIComponent('Google sign-in expired. Please try again.')}`);
  }

  const name = String(formData.get('name') ?? '').trim() || signup.name;
  const unitId = String(formData.get('unitId') ?? '').trim();
  if (!name || !unitId) {
    redirect(`/register/google?error=${encodeURIComponent('Name and apartment are required.')}`);
  }

  const existing = await db.orm.public.Tenant.where({ email: signup.email }).first();
  if (existing) {
    await createSession(existing.id);
    await clearSignupCookie();
    redirect('/home');
  }

  if (unitId === 'applicant') {
    const applicant = await createApplicant({ name, email: signup.email });
    await autoVerifyIfUniversityEmail(applicant.id, signup.email);
    await createSession(applicant.id);
    await clearSignupCookie();
    redirect('/apply');
  }
  const { tenant } = await createTenantWithGroups({ name, email: signup.email, unitId });
  await autoVerifyIfUniversityEmail(tenant.id, signup.email);
  await createSession(tenant.id);
  await clearSignupCookie();
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
  redirect(tenant.unitId ? '/home' : '/apply');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
