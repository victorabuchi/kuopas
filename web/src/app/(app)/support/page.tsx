import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './support.module.css';
import { getSession } from '../../../lib/session';
import TopBar from '../TopBar';

export const metadata: Metadata = {
  title: 'Support - Kuopas',
};

export default async function SupportPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className={styles.page}>
      <TopBar title="Support" />

      <div className={styles.content}>
        <div className={styles.card}>
          <h2>Customer service</h2>
          <p className={styles.hours}>Monday to Friday, 12:00 to 15:00</p>
          <a className={styles.contactRow} href="tel:+358207109740">
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5c0 8.284 6.716 15 15 15h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.76-.97l-4.13-1.03a1 1 0 0 0-1.05.36l-1.13 1.5a12.05 12.05 0 0 1-5.5-5.5l1.5-1.13a1 1 0 0 0 .36-1.05L9.25 3.76A1 1 0 0 0 8.28 3H5a1 1 0 0 0-1 1Z" />
              </svg>
            </span>
            +358 (0)20 710 9740
          </a>
          <a className={styles.contactRow} href="mailto:customerservice@kuopas.fi">
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            customerservice@kuopas.fi
          </a>
          <div className={styles.contactRow}>
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
            </span>
            Torikatu 15, 70110 Kuopio
          </div>
        </div>

        <div className={styles.card}>
          <h2>Maintenance emergency</h2>
          <p className={styles.hours}>Available 24/7 for door openings, water leaks, and other urgent issues</p>
          <a className={styles.contactRow} href="tel:+358447640760">
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5c0 8.284 6.716 15 15 15h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.76-.97l-4.13-1.03a1 1 0 0 0-1.05.36l-1.13 1.5a12.05 12.05 0 0 1-5.5-5.5l1.5-1.13a1 1 0 0 0 .36-1.05L9.25 3.76A1 1 0 0 0 8.28 3H5a1 1 0 0 0-1 1Z" />
              </svg>
            </span>
            +358 (0)44 764 0760
          </a>
          <a className={styles.contactRow} href="mailto:huolto@kuopas.fi">
            <span className={styles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            huolto@kuopas.fi
          </a>
        </div>
      </div>
    </div>
  );
}
