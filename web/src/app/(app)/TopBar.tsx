import Image from 'next/image';
import styles from './top-bar.module.css';
import LanguageSwitcher from './LanguageSwitcher';
import RoleSwitcher from '../RoleSwitcher';
import { getLocale } from '../../lib/i18n';
import { getDictionary } from '../../lib/dictionary';
import { getSession } from '../../lib/session';
import { db } from '../../prisma/db';

export default async function TopBar({ title }: { title: string }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const session = await getSession();
  const tenant = session ? await db.orm.public.Tenant.where({ id: session.tenantId }).first() : null;
  const isAdmin = tenant?.role === 'admin';

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={92} height={38} className={styles.logo} priority />
        <span className={styles.title}>{title}</span>
        <div className={styles.spacer} />
        {isAdmin && (
          <RoleSwitcher
            label={dict.staff.residentApp}
            items={[
              { path: '/home', label: dict.staff.residentApp },
              { path: '/staff', label: dict.staff.dashboardTitle },
            ]}
          />
        )}
        <LanguageSwitcher locale={locale} />
      </div>
      <div className={styles.accent} />
    </div>
  );
}
