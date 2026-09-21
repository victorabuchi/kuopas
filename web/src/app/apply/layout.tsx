import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from '../(app)/app-shell.module.css';
import ApplySidebar from './ApplySidebar';
import { getSession } from '../../lib/session';
import { db } from '../../prisma/db';
import { getLocale } from '../../lib/i18n';
import { getLiving } from '../../lib/living';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default async function ApplyLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');
  // Once a home is allocated the person is a resident and uses the resident app.
  if (tenant.unitId) redirect('/home');

  const locale = await getLocale();
  return (
    <div className={`${styles.shell} ${mulish.variable}`}>
      <ApplySidebar labels={getLiving(locale).apply.nav} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
