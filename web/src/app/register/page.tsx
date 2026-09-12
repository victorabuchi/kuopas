import Link from 'next/link';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../auth.module.css';
import { registerAction } from '../../lib/auth-actions';
import { db } from '../../prisma/db';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Register - Kuopas',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const buildings = await db.orm.public.Building.include('stairwells', (stairwells) =>
    stairwells.include('units', (units) => units.orderBy((u) => u.code.asc())),
  ).all();

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Kuopas
        </div>

        <div className={styles.heading}>
          <h1>Create your account</h1>
          <p>You&apos;ll be added to your building, stairwell, and floor chats automatically.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.suomiFi}>
          Register with Suomi.fi
          <span className={styles.suomiFiTag}>Coming soon</span>
        </div>

        <div className={styles.divider}>or register with email</div>

        <form action={registerAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <span className={styles.hint}>At least 8 characters.</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="unitId">Your unit</label>
            <select id="unitId" name="unitId" defaultValue="" required>
              <option value="" disabled>
                Select a unit
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
            Create account
          </button>
        </form>

        <p className={styles.footerNote}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
