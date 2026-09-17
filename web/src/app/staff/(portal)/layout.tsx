import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from '../staff.module.css';
import { getStaffAccess } from '../../../lib/portal-access';
import { staffLogoutAction } from '../../../lib/staff-auth-actions';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import RoleSwitcher from '../../RoleSwitcher';
import Sidebar from './Sidebar';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const access = await getStaffAccess();
  if (!access) redirect('/staff/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className={`${styles.shell} ${mulish.variable}`}>
      <Sidebar dict={dict.staff} />
      <div className={styles.mainCol}>
        <div className={styles.topBar}>
          <Image src="/Kuopas-logo.png" alt="Kuopas" width={92} height={38} className={styles.logo} priority />
          <div style={{ flex: 1 }} />
          {access.isAdmin && (
            <RoleSwitcher
              label={dict.staff.dashboardTitle}
              items={[
                { path: '/home', label: dict.staff.residentApp },
                { path: '/staff', label: dict.staff.dashboardTitle },
                { path: '/admin', label: dict.staff.manageRoles },
              ]}
            />
          )}
          {access.isAdmin ? (
            <span className={styles.logOut}>{dict.staff.adminBadge}</span>
          ) : (
            <form action={staffLogoutAction}>
              <button type="submit" className={styles.logOut}>
                {dict.staff.logOut}
              </button>
            </form>
          )}
        </div>
        <div className={styles.accent} />
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
