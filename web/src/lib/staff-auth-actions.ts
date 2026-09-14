'use server';

import { compare } from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { createStaffSession, destroyStaffSession } from './staff-session';

export async function staffLoginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  const genericError = `/staff/login?error=${encodeURIComponent('Incorrect email or password.')}`;

  if (!email || !password) redirect(genericError);

  const staff = await db.orm.public.Staff.where({ email }).first();
  if (!staff) redirect(genericError);

  const valid = await compare(password, staff.passwordHash);
  if (!valid) redirect(genericError);

  await createStaffSession(staff.id);
  redirect('/staff');
}

export async function staffLogoutAction() {
  await destroyStaffSession();
  redirect('/staff/login');
}
