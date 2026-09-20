import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { getPrivateDocumentUrl } from '../../../../lib/uploads';
import { reviewVerificationAction } from '../../../../lib/verification-actions';

export const metadata: Metadata = {
  title: 'Verifications - Kuopas staff',
};

export default async function StaffVerificationsPage() {
  const locale = await getLocale();
  const t = getLiving(locale).staff.verifications;
  const methods = getLiving(locale).verify.methods as Record<string, string>;

  const pending = await db.orm.public.IdentityVerification.where({ status: 'pending' })
    .include('tenant', (tn) => tn)
    .orderBy((r) => r.createdAt.asc())
    .all();

  const links = await Promise.all(pending.map((r) => (r.docPath ? getPrivateDocumentUrl(r.docPath) : Promise.resolve(null))));

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.lede}</p>

      {pending.length === 0 && <div className={styles.empty}>{t.empty}</div>}
      <div className={styles.list}>
        {pending.map((r, i) => (
          <div key={r.id} className={styles.card}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>{methods[r.method] ?? r.method}</span>
              <span className={styles.rowMeta}>
                {t.resident}: {r.tenant?.name} ({r.tenant?.email})
              </span>
              {r.institution && (
                <span className={styles.rowMeta}>
                  {t.institution}: {r.institution}
                </span>
              )}
              {r.detail && (
                <span className={styles.rowMeta}>
                  {t.detail}: {r.detail}
                </span>
              )}
              {links[i] && (
                <a href={links[i]!} target="_blank" rel="noopener noreferrer" style={{ color: '#046a38', fontWeight: 700 }}>
                  {t.view}
                </a>
              )}
            </div>
            <form action={reviewVerificationAction} className={styles.form}>
              <input type="hidden" name="id" value={r.id} />
              <div className={styles.field}>
                <label htmlFor={`note-${r.id}`}>{t.note}</label>
                <input id={`note-${r.id}`} name="note" />
              </div>
              <div className={styles.inlineForm}>
                <button type="submit" name="decision" value="approved" className={styles.inlineSubmit}>
                  {t.approve}
                </button>
                <button type="submit" name="decision" value="rejected" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                  {t.reject}
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
