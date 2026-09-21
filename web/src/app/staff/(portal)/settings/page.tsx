import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import LanguageSwitcher from '../../../(app)/LanguageSwitcher';
import { db } from '../../../../prisma/db';
import { getStaffAccess } from '../../../../lib/portal-access';
import { getLocale } from '../../../../lib/i18n';
import { staffLogoutAction } from '../../../../lib/staff-auth-actions';
import { logoutAction } from '../../../../lib/auth-actions';

export const metadata: Metadata = {
  title: 'Settings - Kuopas staff',
};

export default async function StaffSettingsPage() {
  const locale = await getLocale();
  const access = await getStaffAccess();
  const staff = access ? await db.orm.public.Staff.where({ id: access.staffId }).first() : null;
  const fi = locale === 'fi';
  const t = {
    title: fi ? 'Asetukset' : 'Settings',
    account: fi ? 'Tili' : 'Account',
    name: fi ? 'Nimi' : 'Name',
    email: fi ? 'Sähköposti' : 'Email',
    role: fi ? 'Rooli' : 'Role',
    roleValue: access?.isAdmin ? (fi ? 'Pääkäyttäjä' : 'Admin') : fi ? 'Henkilökunta' : 'Staff',
    language: fi ? 'Kieli' : 'Language',
    signOut: fi ? 'Kirjaudu ulos' : 'Sign out',
  };
  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderTop: '1px solid #e7e7e7', fontSize: 14 }}>
      <span style={{ color: '#767676' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>

      <div className={styles.card}>
        <h2>{t.account}</h2>
        {row(t.name, staff?.name ?? '')}
        {row(t.email, staff?.email ?? '')}
        {row(t.role, t.roleValue)}
      </div>

      <div className={styles.card}>
        <h2>{t.language}</h2>
        <LanguageSwitcher locale={locale} />
      </div>

      <div className={styles.card}>
        {/* Admins are signed in through their resident account, so they sign out of that. */}
        <form action={access?.isAdmin ? logoutAction : staffLogoutAction}>
          <button type="submit" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
            {t.signOut}
          </button>
        </form>
      </div>
    </>
  );
}
