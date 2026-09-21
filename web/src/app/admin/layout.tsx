import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from './admin.module.css';
import RoleSwitcher from '../RoleSwitcher';
import Sidebar from './Sidebar';
import { getSession } from '../../lib/session';
import { db } from '../../prisma/db';
import { getLocale } from '../../lib/i18n';
import { getDictionary } from '../../lib/dictionary';
import { getLiving } from '../../lib/living';

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
      <Sidebar labels={{ roles: dict.staff.manageRoles, domains: getLiving(locale).staff.nav.domains, wellbeing: getLiving(locale).staff.nav.wellbeing, settings: getLiving(locale).staff.nav.settings }} />
      <div className={styles.mainCol}>
        <div className={styles.headWrap}>
          <div className={styles.topBar}>
            <Image src="/Kuopas-logo.png" alt="Kuopas" width={92} height={38} className={styles.logo} priority />
            <span className={styles.title}>{dict.staff.adminBadge}</span>
            <div style={{ flex: 1 }} />
            <RoleSwitcher
              label={dict.staff.switcherAdmin}
              items={[
                { path: '/home', label: dict.staff.switcherStudent },
                { path: '/staff', label: dict.staff.switcherStaff },
                { path: '/admin', label: dict.staff.switcherAdmin },
              ]}
            />
          </div>
          <div className={styles.accent} />
        </div>
        <div className={styles.scroll}>
          <div className={styles.main}>{children}</div>
        </div>
      </div>
    </div>
  );
}
