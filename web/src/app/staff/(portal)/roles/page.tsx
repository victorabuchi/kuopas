import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getStaffAccess } from '../../../../lib/portal-access';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import {
  grantAdminAction,
  revokeAdminAction,
  createSupportAccountAction,
  removeSupportAccountAction,
} from '../../../../lib/role-actions';

export const metadata: Metadata = {
  title: 'Roles - Kuopas staff',
};

export default async function RolesPage() {
  const access = await getStaffAccess();
  if (!access?.isAdmin) redirect('/staff');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.staff;

  const tenants = await db.orm.public.Tenant.orderBy((tn) => tn.name.asc()).all();
  const staffAccounts = await db.orm.public.Staff.orderBy((s) => s.name.asc()).all();
  const linkedStaffIds = new Set(tenants.filter((tn) => tn.staffId).map((tn) => tn.staffId));

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.manageRolesHeading}</h1>
      <p style={{ color: '#767676', marginTop: '-8px' }}>{t.manageRolesLede}</p>

      <div className={styles.card}>
        <h2>{t.residentsHeading}</h2>
        <div className={styles.list}>
          {tenants.map((tenant) => (
            <div key={tenant.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>{tenant.name}</span>
                <span className={styles.rowMeta}>{tenant.email}</span>
              </div>
              {tenant.role === 'admin' ? (
                <form action={revokeAdminAction}>
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <button type="submit" className={styles.inlineSubmit}>
                    {t.removeAdmin}
                  </button>
                </form>
              ) : (
                <form action={grantAdminAction}>
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <button type="submit" className={styles.inlineSubmit}>
                    {t.makeAdmin}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2>{t.newSupportAccount}</h2>
        <form action={createSupportAccountAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">{t.supportName}</label>
            <input id="name" name="name" type="text" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">{t.supportEmail}</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">{t.supportPassword}</label>
            <input id="password" name="password" type="password" minLength={8} required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.createAccount}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2>{t.customerSupportHeading}</h2>
        <div className={styles.list}>
          {staffAccounts.filter((s) => !linkedStaffIds.has(s.id)).length === 0 && (
            <div className={styles.empty}>{t.noSupportAccountsYet}</div>
          )}
          {staffAccounts
            .filter((s) => !linkedStaffIds.has(s.id))
            .map((staff) => (
              <div key={staff.id} className={styles.row}>
                <div className={styles.rowText}>
                  <span className={styles.rowCategory}>{staff.name}</span>
                  <span className={styles.rowMeta}>{staff.email}</span>
                </div>
                <form action={removeSupportAccountAction}>
                  <input type="hidden" name="staffId" value={staff.id} />
                  <button type="submit" className={styles.inlineSubmit}>
                    {t.removeAccount}
                  </button>
                </form>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
