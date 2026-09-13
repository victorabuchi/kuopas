import { cookies } from 'next/headers';

export type Locale = 'en' | 'fi';
const COOKIE_NAME = 'kuopas_locale';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === 'fi' ? 'fi' : 'en';
}

export async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
}
