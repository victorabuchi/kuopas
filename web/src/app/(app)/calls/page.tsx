import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './calls.module.css';
import { getSession } from '../../../lib/session';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

export const metadata: Metadata = {
  title: 'Calls - Kuopas',
};

export default async function CallsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.calls;

  const numbers = [
    { title: dict.support.customerService, hours: dict.support.hours, display: '+358 (0)20 710 9740', tel: '+358207109740' },
    { title: dict.support.maintenanceEmergency, hours: dict.support.maintenanceHours, display: '+358 (0)44 764 0760', tel: '+358447640760' },
  ];

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <p className={styles.lede}>{t.lede}</p>
        {numbers.map((n) => (
          <div key={n.tel} className={styles.card}>
            <div className={styles.cardText}>
              <h2>{n.title}</h2>
              <p className={styles.hours}>{n.hours}</p>
              <span className={styles.number}>{n.display}</span>
            </div>
            <a href={`tel:${n.tel}`} className={styles.callBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5c0 8.284 6.716 15 15 15h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.76-.97l-4.13-1.03a1 1 0 0 0-1.05.36l-1.13 1.5a12.05 12.05 0 0 1-5.5-5.5l1.5-1.13a1 1 0 0 0 .36-1.05L9.25 3.76A1 1 0 0 0 8.28 3H5a1 1 0 0 0-1 1Z" />
              </svg>
              {t.call}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
