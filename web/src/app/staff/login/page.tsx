import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../../auth.module.css';
import { staffLoginAction } from '../../../lib/staff-auth-actions';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Staff login - Kuopas',
};

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.staff;

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <div className={styles.card}>
        <div className={styles.topRow}>
          <div className={styles.logo}>
            <span className={styles.logoDot} />
            Kuopas
          </div>
        </div>

        <div className={styles.heading}>
          <h1>{t.loginHeading}</h1>
          <p>{t.loginLede}</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form action={staffLoginAction} className={styles.form}>
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
      </div>
    </div>
  );
}
