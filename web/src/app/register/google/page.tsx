import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../../auth.module.css';
import { completeGoogleRegisterAction } from '../../../lib/auth-actions';
import { readSignupCookie } from '../../../lib/google-oauth';
import { db } from '../../../prisma/db';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Finish signing up - Kuopas',
};

export default async function GoogleRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const signup = await readSignupCookie();
  if (!signup) redirect('/register');

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
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '14px' }}>{t.googleLede}</p>

        {error && <div className={styles.error}>{error}</div>}

        <form action={completeGoogleRegisterAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">{t.fullName}</label>
            <input id="name" name="name" type="text" autoComplete="name" defaultValue={signup.name} required />
          </div>
          <div className={styles.field}>
            <label>{t.email}</label>
            <div style={{ fontSize: '14px', padding: '6px 0' }}>{signup.email}</div>
          </div>
          <div className={styles.field}>
            <label htmlFor="unitId">{t.unit}</label>
            <select id="unitId" name="unitId" defaultValue="" required>
              <option value="" disabled>
                {t.selectUnit}
              </option>
              <option value="applicant">{t.applicantOption}</option>
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
    </div>
  );
}
