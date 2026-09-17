import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from './admin.module.css';
import RoleSwitcher from '../RoleSwitcher';
import { getSession } from '../../lib/session';
import { db } from '../../prisma/db';
import { getLocale } from '../../lib/i18n';
import { getDictionary } from '../../lib/dictionary';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant || tenant.role !== 'admin') redirect('/home');

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className={`${styles.shell} ${mulish.variable}`}>
      <div className={styles.topBar}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={92} height={38} className={styles.logo} priority />
        <span className={styles.title}>{dict.staff.adminBadge}</span>
        <div style={{ flex: 1 }} />
        <RoleSwitcher
          label={dict.staff.adminBadge}
          items={[
            { path: '/home', label: dict.staff.residentApp },
            { path: '/staff', label: dict.staff.dashboardTitle },
            { path: '/admin', label: dict.staff.manageRoles },
          ]}
        />
      </div>
      <div className={styles.accent} />
      <div className={styles.main}>{children}</div>
    </div>
  );
}
