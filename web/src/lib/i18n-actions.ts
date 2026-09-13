'use server';

import { redirect } from 'next/navigation';
import { setLocaleCookie, type Locale } from './i18n';

export async function setLocaleAction(formData: FormData) {
  const raw = String(formData.get('locale') ?? 'en');
  const locale: Locale = raw === 'fi' ? 'fi' : 'en';
  await setLocaleCookie(locale);
  const redirectTo = String(formData.get('redirectTo') ?? '/');
  redirect(redirectTo);
}
