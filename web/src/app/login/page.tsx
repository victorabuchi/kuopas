import Link from 'next/link';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../auth.module.css';
import { loginAction } from '../../lib/auth-actions';
import { getLocale } from '../../lib/i18n';
import { getDictionary } from '../../lib/dictionary';
import LanguageSwitcher from '../(app)/LanguageSwitcher';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Log in - Kuopas',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.login;

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <div className={styles.card}>
        <div className={styles.topRow}>
          <div className={styles.logo}>
            <span className={styles.logoDot} />
            Kuopas
          </div>
          <LanguageSwitcher locale={locale} />
        </div>

        <div className={styles.heading}>
          <h1>{t.heading}</h1>
          <p>{t.lede}</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.suomiFi}>
          {t.suomiFi}
          <span className={styles.suomiFiTag}>{t.comingSoon}</span>
        </div>

        <div className={styles.divider}>{t.or}</div>

        <form action={loginAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">{t.password}</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.submit}
          </button>
        </form>

        <p className={styles.footerNote}>
          {t.newTenant} <Link href="/register">{t.register}</Link>
        </p>
      </div>
    </div>
  );
}
