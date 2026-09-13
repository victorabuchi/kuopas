import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from './app-shell.module.css';
import Sidebar from './Sidebar';
import { getSession } from '../../lib/session';
import { db } from '../../prisma/db';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');

  return (
    <div className={`${styles.shell} ${mulish.variable}`}>
      <Sidebar tenantName={tenant.name} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
