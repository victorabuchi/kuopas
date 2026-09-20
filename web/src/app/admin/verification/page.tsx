import type { Metadata } from 'next';
import styles from '../admin.module.css';
import { db } from '../../../prisma/db';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { addVerifiedDomainAction, removeVerifiedDomainAction } from '../../../lib/verification-actions';

export const metadata: Metadata = {
  title: 'Verified domains - Kuopas',
};

export default async function AdminVerificationPage() {
  const locale = await getLocale();
  const t = getLiving(locale).admin.domains;
  const domains = await db.orm.public.VerifiedDomain.orderBy((d) => d.domain.asc()).all();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.lede}</p>

      <div className={styles.card}>
        <h2>{t.list}</h2>
        {domains.length === 0 && <div className={styles.empty}>{t.empty}</div>}
        <div className={styles.list}>
          {domains.map((d) => (
            <div key={d.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory} style={{ textTransform: 'none' }}>
                  {d.domain}
                </span>
                <span className={styles.rowMeta}>{d.institution}</span>
              </div>
              <form action={removeVerifiedDomainAction}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className={styles.inlineSubmit}>
                  {t.remove}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2>{t.add}</h2>
        <form action={addVerifiedDomainAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="domain">{t.domain}</label>
            <input id="domain" name="domain" placeholder="uef.fi" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="institution">{t.institution}</label>
            <input id="institution" name="institution" required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.add}
          </button>
        </form>
      </div>
    </>
  );
}
