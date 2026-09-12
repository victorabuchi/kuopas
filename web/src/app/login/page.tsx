import Link from 'next/link';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../auth.module.css';
import { loginAction } from '../../lib/auth-actions';

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

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Kuopas
        </div>

        <div className={styles.heading}>
          <h1>Log in</h1>
          <p>Access your building, stairwell, and floor chats.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.suomiFi}>
          Log in with Suomi.fi
          <span className={styles.suomiFiTag}>Coming soon</span>
        </div>

        <div className={styles.divider}>or continue with email</div>

        <form action={loginAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button type="submit" className={styles.submit}>
            Log in
          </button>
        </form>

        <p className={styles.footerNote}>
          New tenant? <Link href="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
