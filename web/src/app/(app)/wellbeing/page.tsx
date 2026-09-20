import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { closeOwnCaseAction, submitWellbeingCaseAction } from '../../../lib/wellbeing-actions';
import TopBar from '../TopBar';

export const metadata: Metadata = {
  title: 'Wellbeing - Kuopas',
};

export default async function WellbeingPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const q = await searchParams;
  const locale = await getLocale();
  const t = getLiving(locale).wellbeing;

  const cases = await db.orm.public.WellbeingCase.where({ tenantId: session.tenantId })
    .orderBy((c) => c.createdAt.desc())
    .all();

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <div className={`${styles.notice} ${styles.noticeErr}`}>
          <strong>{t.emergency}</strong>
        </div>
        <p className={styles.lede}>{t.lede}</p>
        {q.sent === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{t.sent}</div>}

        <form action={submitWellbeingCaseAction} className={`${styles.card} ${styles.form}`}>
          <h2 className={styles.cardTitle}>{t.formHeading}</h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="category">{t.category}</label>
              <select id="category" name="category" defaultValue="mental_health">
                {Object.entries(t.categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="severity">{t.severity}</label>
              <select id="severity" name="severity" defaultValue="concern">
                {Object.entries(t.severities).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="description">{t.description}</label>
            <textarea id="description" name="description" required placeholder={t.descriptionPlaceholder} maxLength={4000} />
          </div>
          <label className={styles.check} style={{ alignItems: 'flex-start' }}>
            <input type="checkbox" name="consent" style={{ marginTop: 4 }} />
            <span>
              {t.consent}
              <br />
              <span className={styles.itemMeta}>{t.consentNote}</span>
            </span>
          </label>
          <button type="submit" className={styles.btn}>
            {t.submit}
          </button>
        </form>

        <div className={styles.sectionHeading}>{t.yourRequests}</div>
        {cases.length === 0 && <div className={styles.empty}>{t.none}</div>}
        {cases.map((c) => (
          <div key={c.id} className={styles.card}>
            <div className={styles.item} style={{ padding: 0, border: 'none' }}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>{(t.categories as Record<string, string>)[c.category]}</span>
                <span className={styles.itemMeta}>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <span className={`${styles.badge} ${c.status === 'closed' ? '' : c.status === 'escalated' ? styles.badgeOk : styles.badgeWarn}`}>
                {(t.status as Record<string, string>)[c.status]}
              </span>
            </div>
            {c.escalatedTo && (
              <span className={styles.itemMeta}>
                {t.sharedWith}: {c.escalatedTo}
              </span>
            )}
            {c.status !== 'closed' && (
              <form action={closeOwnCaseAction}>
                <input type="hidden" name="caseId" value={c.id} />
                <button type="submit" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                  {t.close}
                </button>
              </form>
            )}
          </div>
        ))}

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t.callTitle}</h3>
          <a href="tel:+358207109740" className={styles.btn} style={{ alignSelf: 'flex-start' }}>
            +358 (0)20 710 9740
          </a>
        </div>
      </div>
    </div>
  );
}
