import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './profile.module.css';
import { getSession } from '../../../lib/session';
import { logoutAction } from '../../../lib/auth-actions';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

export const metadata: Metadata = {
  title: 'Profile - Kuopas',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .first();
  if (!tenant) redirect('/login');

  const unit = tenant.unit!;
  const stairwell = unit.stairwell!;
  const building = stairwell.building!;

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className={styles.page}>
      <TopBar title={dict.profile.title} />

      <div className={styles.content}>
        <div className={styles.avatar}>{initials(tenant.name)}</div>
        <h2 className={styles.name}>{tenant.name}</h2>
        <p className={styles.email}>{tenant.email}</p>

        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{dict.profile.building}</span>
            <span className={styles.rowValue}>{building.name}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{dict.profile.stairwell}</span>
            <span className={styles.rowValue}>{stairwell.label}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{dict.profile.unit}</span>
            <span className={styles.rowValue}>{unit.code}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{dict.profile.floor}</span>
            <span className={styles.rowValue}>{unit.floor}</span>
          </div>
        </div>

        <form action={logoutAction}>
          <button type="submit" className={styles.logout}>
            {dict.profile.logOut}
          </button>
        </form>
      </div>
    </div>
  );
}
