import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { isVerified } from '../../../lib/verification';
import {
  confirmEmailCodeAction,
  requestEmailCodeAction,
  submitDocumentVerificationAction,
} from '../../../lib/verification-actions';
import { getLiving } from '../../../lib/living';
import { getLocale } from '../../../lib/i18n';
import { suomiFiMode } from '../../../lib/suomifi';

type V = ReturnType<typeof getLiving>['verify'];

export type VerifySearch = {
  err?: string;
  sent?: string;
  done?: string;
  docsent?: string;
  devcode?: string;
};

export default async function VerifyTab({ tenantId, v, q }: { tenantId: string; v: V; q: VerifySearch }) {
  const records = await db.orm.public.IdentityVerification.where({ tenantId })
    .orderBy((r) => r.createdAt.desc())
    .all();
  const verified = await isVerified(tenantId);
  const approved = records.find((r) => r.status === 'approved');
  const pending = records.find((r) => r.status === 'pending');
  const s = getLiving(await getLocale()).signing;
  const suomiOn = suomiFiMode() !== 'off';
  const methodLabel = (m: string) => (s.methods as Record<string, string>)[m] ?? (v.methods as Record<string, string>)[m] ?? m;

  const errors: Record<string, string> = {
    code: v.codeWrong,
    not_university: v.notUniversity,
    cooldown: v.cooldown,
    email_unavailable: v.emailUnavailable,
    file: v.docMissing,
    ...s.errors,
  };

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{v.title}</h2>
        <p className={styles.lede}>{v.lede}</p>
        <div className={styles.kv}>
          <span className={styles.kvLabel}>{v.tab}</span>
          <span className={`${styles.badge} ${verified ? styles.badgeOk : pending ? styles.badgeWarn : ''}`}>
            {verified ? v.statusVerified : pending ? v.statusPending : v.statusNone}
          </span>
        </div>
        {approved && (
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{v.verifiedVia}</span>
            <span className={styles.kvValue}>
              {methodLabel(approved.method)}
              {approved.institution ? ` · ${approved.institution}` : ''}
            </span>
          </div>
        )}
        {q.done === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{v.justVerified}</div>}
        {q.docsent === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{v.docSubmitted}</div>}
        {q.err && errors[q.err] && <div className={`${styles.notice} ${styles.noticeErr}`}>{errors[q.err]}</div>}
      </div>

      {!verified && suomiOn && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{s.suomiHeading}</h3>
          <p className={styles.lede}>{s.suomiLede}</p>
          <div>
            <a href="/api/auth/suomifi/start?intent=verify" className={styles.btn}>
              {s.suomiButton}
            </a>
          </div>
        </div>
      )}

      {!verified && (
        <>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{v.emailHeading}</h3>
            <p className={styles.lede}>{v.emailLede}</p>
            {q.sent === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{v.codeSent}</div>}
            {q.devcode && (
              <div className={`${styles.notice} ${styles.noticeWarn}`}>
                {v.devCodeNote} <strong>{q.devcode}</strong>
              </div>
            )}
            <form action={requestEmailCodeAction} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="email">{v.emailLabel}</label>
                <input id="email" name="email" type="email" required />
              </div>
              <button type="submit" className={styles.btn}>
                {v.sendCode}
              </button>
            </form>
            <form action={confirmEmailCodeAction} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="code">{v.codeLabel}</label>
                <input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
              </div>
              <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                {v.confirm}
              </button>
            </form>
          </div>

          {!pending && (
            <form action={submitDocumentVerificationAction} className={`${styles.card} ${styles.form}`}>
              <h3 className={styles.cardTitle}>{v.docHeading}</h3>
              <p className={styles.lede}>{v.docLede}</p>
              <div className={styles.field}>
                <label htmlFor="method">{v.docType}</label>
                <select id="method" name="method" defaultValue="enrollment_document">
                  <option value="enrollment_document">{v.methods.enrollment_document}</option>
                  <option value="government_id">{v.methods.government_id}</option>
                </select>
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="institution">{v.institution}</label>
                  <input id="institution" name="institution" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="studentNumber">{v.studentNumber}</label>
                  <input id="studentNumber" name="studentNumber" />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="file">{v.file}</label>
                <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
              </div>
              <button type="submit" className={styles.btn}>
                {v.submitDoc}
              </button>
            </form>
          )}
        </>
      )}

      {records.length > 0 && (
        <>
          <div className={styles.sectionHeading}>{v.history}</div>
          {records.map((r) => (
            <div key={r.id} className={styles.item}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>{methodLabel(r.method)}</span>
                <span className={styles.itemMeta}>{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <span className={`${styles.badge} ${r.status === 'approved' ? styles.badgeOk : r.status === 'rejected' ? styles.badgeBad : styles.badgeWarn}`}>
                {r.status === 'approved' ? v.approved : r.status === 'rejected' ? v.rejected : v.pending}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  );
}
