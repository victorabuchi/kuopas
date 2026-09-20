import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import {
  addGuarantorInstitutionAction,
  removeGuarantorInstitutionAction,
  reviewGuarantorAction,
} from '../../../../lib/guarantor-actions';

export const metadata: Metadata = {
  title: 'Guarantors - Kuopas staff',
};

export default async function StaffGuarantorsPage() {
  const locale = await getLocale();
  const t = getLiving(locale).staff.guarantors;

  const requests = await db.orm.public.GuarantorRequest.where({ status: 'pending' })
    .include('tenant', (tn) => tn)
    .include('institution', (i) => i)
    .orderBy((r) => r.createdAt.asc())
    .all();
  const institutions = await db.orm.public.GuarantorInstitution.all();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.lede}</p>

      <div className={styles.card}>
        <h2>{t.requests}</h2>
        {requests.length === 0 && <div className={styles.empty}>{t.empty}</div>}
        <div className={styles.list}>
          {requests.map((r) => (
            <div key={r.id} className={styles.row} style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>
                  {r.tenant?.name} ({r.tenant?.email})
                </span>
                {r.kind === 'institution' ? (
                  <span className={styles.rowMeta}>
                    {t.institutionKind}: {r.institution?.name}
                  </span>
                ) : (
                  <span className={styles.rowMeta}>
                    {t.personal}: {r.guarantorName} {r.guarantorEmail ?? ''} {r.guarantorPhone ?? ''}
                  </span>
                )}
              </div>
              <form action={reviewGuarantorAction} className={styles.form} style={{ width: '100%' }}>
                <input type="hidden" name="id" value={r.id} />
                <div className={styles.field}>
                  <label htmlFor={`gn-${r.id}`}>{t.note}</label>
                  <input id={`gn-${r.id}`} name="note" />
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
      </div>

      <div className={styles.card}>
        <h2>{t.institutions}</h2>
        {institutions.length === 0 && <div className={styles.empty}>{t.none}</div>}
        <div className={styles.list}>
          {institutions.map((i) => (
            <div key={i.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>{i.name}</span>
                <span className={styles.rowMeta}>{i.description}</span>
              </div>
              <form action={removeGuarantorInstitutionAction}>
                <input type="hidden" name="id" value={i.id} />
                <button type="submit" className={styles.inlineSubmit}>
                  {t.remove}
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={addGuarantorInstitutionAction} className={styles.form} style={{ marginTop: 16 }}>
          <div className={styles.field}>
            <label htmlFor="gi-name">{t.name}</label>
            <input id="gi-name" name="name" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="gi-desc">{t.description}</label>
            <textarea id="gi-desc" name="description" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="gi-url">{t.url}</label>
            <input id="gi-url" name="url" />
          </div>
          <button type="submit" className={styles.submit}>
            {t.add}
          </button>
        </form>
      </div>
    </>
  );
}
