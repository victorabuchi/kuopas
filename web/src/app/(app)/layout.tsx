import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from './app-shell.module.css';
import Sidebar from './Sidebar';
import PushSubscribe from './PushSubscribe';
import { getSession } from '../../lib/session';
import { db } from '../../prisma/db';
import { getLocale } from '../../lib/i18n';
import { getDictionary } from '../../lib/dictionary';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className={`${styles.shell} ${mulish.variable}`}>
      <PushSubscribe />
      <Sidebar nav={dict.nav} back={dict.common.back} settings={dict.settings} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
