import type { Metadata } from 'next';
import styles from '../admin.module.css';
import { db } from '../../../prisma/db';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { escalateCaseAction, flagResidentAction, updateCaseAction } from '../../../lib/wellbeing-actions';

export const metadata: Metadata = {
  title: 'Wellbeing - Kuopas admin',
};

export default async function AdminWellbeingPage() {
  const locale = await getLocale();
  const t = getLiving(locale).wellbeing;
  const integrationOn = Boolean(process.env['WELLBEING_WEBHOOK_URL']);

  const cases = await db.orm.public.WellbeingCase.include('tenant', (tn) => tn.include('unit', (u) => u))
    .include('events', (e) => e.orderBy((x) => x.createdAt.asc()))
    .orderBy((c) => c.createdAt.desc())
    .limit(200)
    .all();
  const tenants = await db.orm.public.Tenant.orderBy((x) => x.name.asc()).all();

  const open = cases.filter((c) => c.status !== 'closed');
  const closed = cases.filter((c) => c.status === 'closed');
  const dateFmt = (iso: string) => new Date(iso).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-GB');

  function CaseCard({ c }: { c: (typeof cases)[number] }) {
    return (
      <div className={styles.card}>
        <div className={styles.row} style={{ border: 'none', padding: 0, alignItems: 'flex-start' }}>
          <div className={styles.rowText}>
            <span className={styles.rowCategory} style={{ textTransform: 'none' }}>
              {(t.categories as Record<string, string>)[c.category]} · {(t.severities as Record<string, string>)[c.severity]}
            </span>
            <span className={styles.rowMeta}>
              {t.resident}: {c.tenant?.name} ({c.tenant?.email}) · {c.tenant?.unit?.code} · {(t.origin as Record<string, string>)[c.origin]}
            </span>
            <span className={styles.rowMeta}>
              {c.consentToShare ? t.consentYes : t.consentNo} · {(t.status as Record<string, string>)[c.status]}
              {c.escalatedTo ? ` · ${c.escalatedTo}` : ''}
            </span>
          </div>
        </div>
        <p style={{ margin: '10px 0', whiteSpace: 'pre-wrap' }}>{c.description}</p>

        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{t.timeline}</summary>
          {c.events.map((e) => (
            <div key={e.id} className={styles.rowMeta} style={{ padding: '4px 0' }}>
              {dateFmt(e.createdAt)} · {e.actor} · {(t.actions as Record<string, string>)[e.action] ?? e.action}
              {e.detail ? `: ${e.detail}` : ''}
            </div>
          ))}
        </details>

        {c.status !== 'closed' && (
          <>
            <form action={updateCaseAction} className={styles.inlineForm} style={{ marginTop: 10 }}>
              <input type="hidden" name="caseId" value={c.id} />
              {c.status === 'open' && (
                <button type="submit" name="intent" value="acknowledge" className={styles.inlineSubmit}>
                  {t.acknowledge}
                </button>
              )}
              <button type="submit" name="intent" value="close" className={styles.inlineSubmit}>
                {t.closeCase}
              </button>
            </form>
            <form action={updateCaseAction} className={styles.inlineForm} style={{ marginTop: 8 }}>
              <input type="hidden" name="caseId" value={c.id} />
              <input type="hidden" name="intent" value="note" />
              <input name="note" placeholder={t.note} style={{ flex: 1, border: '1px solid #e7e7e7', borderRadius: 8, padding: '6px 10px' }} />
              <button type="submit" className={styles.inlineSubmit}>
                {t.addNote}
              </button>
            </form>
            <form action={escalateCaseAction} className={styles.form} style={{ marginTop: 12 }}>
              <input type="hidden" name="caseId" value={c.id} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>{t.escalate}</span>
              <div className={styles.field}>
                <label htmlFor={`svc-${c.id}`}>{t.service}</label>
                <input id={`svc-${c.id}`} name="service" placeholder={t.servicePlaceholder} />
              </div>
              {!c.consentToShare && (
                <div className={styles.field}>
                  <label htmlFor={`why-${c.id}`}>{t.reason}</label>
                  <input id={`why-${c.id}`} name="reason" required />
                </div>
              )}
              <button type="submit" className={styles.submit}>
                {t.escalateButton}
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.adminTitle}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '16px' }}>{t.adminLede}</p>
      <div className={styles.card} style={{ padding: 14 }}>
        {integrationOn ? t.integrationOn : t.integrationOff}
      </div>

      <h2>{t.open}</h2>
      {open.length === 0 && <div className={styles.empty}>{t.noCases}</div>}
      {open.map((c) => (
        <CaseCard key={c.id} c={c} />
      ))}

      <div className={styles.card}>
        <h2>{t.flagHeading}</h2>
        <p style={{ color: '#767676', margin: '0 0 12px' }}>{t.flagLede}</p>
        <form action={flagResidentAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="tenantId">{t.resident}</label>
            <select id="tenantId" name="tenantId" required defaultValue="">
              <option value="" disabled>
                {t.chooseResident}
              </option>
              {tenants.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.email})
                </option>
              ))}
            </select>
          </div>
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
          <div className={styles.field}>
            <label htmlFor="description">{t.description}</label>
            <textarea id="description" name="description" required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.flag}
          </button>
        </form>
      </div>

      {closed.length > 0 && <h2>{t.closedCases}</h2>}
      {closed.map((c) => (
        <CaseCard key={c.id} c={c} />
      ))}
    </>
  );
}
