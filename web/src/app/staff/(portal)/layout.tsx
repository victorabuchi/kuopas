import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from '../staff.module.css';
import { getStaffAccess } from '../../../lib/portal-access';
import { staffLogoutAction } from '../../../lib/staff-auth-actions';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const access = await getStaffAccess();
  if (!access) redirect('/staff/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className={`${styles.shell} ${mulish.variable}`}>
      <div className={styles.topBar}>
        <div className={styles.logo}>Kuopas staff</div>
        <nav className={styles.nav}>
          <Link href="/staff">{dict.staff.dashboardTitle}</Link>
          <Link href="/staff/complaints">{dict.staff.complaintsInbox}</Link>
          <Link href="/staff/reports">{dict.staff.reportsInbox}</Link>
          <Link href="/staff/saved-replies">{dict.staff.savedReplies}</Link>
          {access.isAdmin && <Link href="/home">{dict.staff.residentApp}</Link>}
        </nav>
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
      <div className={styles.main}>{children}</div>
    </div>
  );
}
