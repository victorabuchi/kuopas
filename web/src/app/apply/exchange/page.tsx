import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from '../../(app)/features.module.css';
import TopBar from '../../(app)/TopBar';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { EXCHANGE_PREFERENCES } from '../../../lib/exchange';
import { cancelExchangeAction, submitExchangeAction } from '../../../lib/exchange-actions';

export const metadata: Metadata = {
  title: 'Exchange housing - Kuopas',
};

export default async function ExchangePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const q = await searchParams;
  const t = getLiving(await getLocale()).apply;

  const app = await db.orm.public.ExchangeApplication.where({ tenantId: session.tenantId }).first();
  const editable = !app || ['submitted', 'verified', 'waitlisted', 'cancelled', 'rejected'].includes(app.status);
  const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');
  const errors: Record<string, string> = { dates: t.dateError, letter: t.letterMissing };

  return (
    <div className={styles.page}>
      <TopBar title={t.exchangeTitle} />
      <div className={styles.content}>
        <p className={styles.lede}>{t.exchangeLede}</p>
        {q.saved === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{t.exchangeSaved}</div>}
        {q.error && <div className={`${styles.notice} ${styles.noticeErr}`}>{errors[q.error] ?? q.error}</div>}

        {app && (
          <div className={styles.card}>
            <div className={styles.item} style={{ padding: 0, border: 'none' }}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>{app.homeUniversity}</span>
                <span className={styles.itemMeta}>
                  {day(app.arrival)} - {day(app.departure)}
                </span>
              </div>
              <span className={`${styles.badge} ${app.status === 'verified' ? styles.badgeOk : app.status === 'rejected' ? styles.badgeBad : styles.badgeWarn}`}>
                {t.exchangeStatus[app.status as keyof typeof t.exchangeStatus] ?? app.status}
              </span>
            </div>
            {app.staffNote && <span className={styles.itemMeta}>{app.staffNote}</span>}
          </div>
        )}

        {editable && (
          <form action={submitExchangeAction} className={`${styles.card} ${styles.form}`}>
            <div className={styles.field}>
              <label htmlFor="homeUniversity">{t.homeUniversity}</label>
              <input id="homeUniversity" name="homeUniversity" required maxLength={120} defaultValue={app?.homeUniversity ?? ''} />
            </div>
            <div className={styles.field}>
              <label htmlFor="homeCountry">{t.homeCountry}</label>
              <input id="homeCountry" name="homeCountry" maxLength={80} defaultValue={app?.homeCountry ?? ''} />
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label htmlFor="arrival">{t.arrival}</label>
                <input id="arrival" name="arrival" type="date" required defaultValue={day(app?.arrival)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="departure">{t.departure}</label>
                <input id="departure" name="departure" type="date" required defaultValue={day(app?.departure)} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="prefer">{t.prefer}</label>
              <select id="prefer" name="prefer" defaultValue={app?.prefer ?? 'any'}>
                {EXCHANGE_PREFERENCES.map((p) => (
                  <option key={p} value={p}>
                    {t.preferOptions[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="message">{t.exchangeMessage}</label>
              <input id="message" name="message" maxLength={400} defaultValue={app?.message ?? ''} />
            </div>
            <div className={styles.field}>
              <label htmlFor="letter">{t.letter}</label>
              <input id="letter" name="letter" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required={!app?.docPath} />
              <span className={styles.itemMeta}>{t.letterHint}</span>
            </div>
            <button type="submit" className={styles.btn}>
              {app && !['cancelled', 'rejected'].includes(app.status) ? t.updateExchange : t.submitExchange}
            </button>
          </form>
        )}

        {app && ['submitted', 'verified', 'waitlisted'].includes(app.status) && (
          <form action={cancelExchangeAction}>
            <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
              {t.cancelExchange}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
