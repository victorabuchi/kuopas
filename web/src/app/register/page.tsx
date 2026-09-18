import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../auth.module.css';
import { registerAction } from '../../lib/auth-actions';
import { db } from '../../prisma/db';
import { getLocale } from '../../lib/i18n';
import { getDictionary } from '../../lib/dictionary';
import LanguageSwitcher from '../(app)/LanguageSwitcher';
import PasswordField from '../PasswordField';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Register - Kuopas',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { error, email: prefillEmail } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.register;

  const buildings = await db.orm.public.Building.include('stairwells', (stairwells) =>
    stairwells.include('units', (units) => units.orderBy((u) => u.code.asc())),
  ).all();

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <Link href="/" className={styles.logoLink}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={160} height={66} className={styles.logoImg} priority />
        <h1>{t.heading}</h1>
      </Link>

      <div className={styles.card}>
        <p style={{ margin: 0, textAlign: 'center', color: 'var(--fg-muted)', fontSize: '14px' }}>{t.lede}</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.suomiFi}>
          {t.suomiFi}
          <span className={styles.suomiFiTag}>{t.comingSoon}</span>
        </div>

        <div className={styles.divider}>{t.or}</div>

        <form action={registerAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">{t.fullName}</label>
            <input id="name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={prefillEmail} required />
          </div>
          <PasswordField label={t.password} id="password" name="password" autoComplete="new-password" minLength={8} hint={t.passwordHint} />
          <div className={styles.field}>
            <label htmlFor="unitId">{t.unit}</label>
            <select id="unitId" name="unitId" defaultValue="" required>
              <option value="" disabled>
                {t.selectUnit}
              </option>
              {buildings.map((building) =>
                building.stairwells.map((stairwell) =>
                  stairwell.units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {building.name}, {stairwell.label}
                      {unit.code} (floor {unit.floor})
                    </option>
                  )),
                ),
              )}
            </select>
          </div>
          <button type="submit" className={styles.submit}>
            {t.submit}
          </button>
        </form>
      </div>

      <div className={styles.switchBox}>
        <p className={styles.footerNote}>
          {t.haveAccount} <Link href="/login">{t.logIn}</Link>
        </p>
      </div>

      <div className={styles.langRow}>
        <LanguageSwitcher locale={locale} />
      </div>

      <div className={styles.pageLinks}>
        <Link href="/terms">{dict.landing.footerTerms}</Link>
        <Link href="/privacy">{dict.landing.footerPrivacy}</Link>
        <Link href="/messages?tab=support">{dict.landing.footerContactUs}</Link>
      </div>
    </div>
  );
}
