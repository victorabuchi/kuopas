import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { getPrivateDocumentUrl } from '../../../../lib/uploads';
import { freeTemporaryUnits } from '../../../../lib/exchange';
import { allocateAllExchangeAction, allocateExchangeAction, reviewExchangeAction } from '../../../../lib/exchange-actions';

export const metadata: Metadata = {
  title: 'Exchange - Kuopas staff',
};

const TABS = {
  queue: ['submitted', 'verified', 'waitlisted'],
  allocated: ['allocated'],
  closed: ['rejected', 'cancelled'],
} as const;
type Tab = keyof typeof TABS;

export default async function StaffExchangePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; a?: string; w?: string }>;
}) {
  const q = await searchParams;
  const tab: Tab = q.tab === 'allocated' || q.tab === 'closed' ? q.tab : 'queue';
  const locale = await getLocale();
  const t = getLiving(locale).intake.exchange;
  const day = (iso: string) => iso.slice(0, 10);

  const all = await db.orm.public.ExchangeApplication.include('tenant', (x) => x).include('allocatedUnit', (u) => u).all();
  const counts: Record<string, number> = {};
  for (const a of all) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const rows = all
    .filter((a) => (TABS[tab] as readonly string[]).includes(a.status))
    .sort((a, b) => new Date(a.arrival).getTime() - new Date(b.arrival).getTime());

  const temporaryUnits = await db.orm.public.Unit.where({ temporary: true }).all();
  const details = await Promise.all(
    rows.map(async (a) => ({
      a,
      link: a.docPath ? await getPrivateDocumentUrl(a.docPath) : null,
      free: tab === 'queue' ? await freeTemporaryUnits(a) : [],
    })),
  );

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: 6, marginBottom: 24 }}>{t.lede}</p>

      {q.a !== undefined && <div className={styles.card}>{t.bulkResult.replace('{a}', q.a).replace('{w}', q.w ?? '0')}</div>}
      {q.error && <div className={styles.card} style={{ color: '#b3261e' }}>{q.error === 'rent' ? t.needRent : t.noSuggestion}</div>}

      <div className={styles.card}>
        <div className={styles.rowText}>
          <span className={styles.rowCategory}>
            {t.quota}: {temporaryUnits.length}
          </span>
          <span className={styles.rowMeta}>
            {(Object.keys(t.counts) as (keyof typeof t.counts)[]).map((k) => `${t.counts[k]} ${counts[k] ?? 0}`).join(' · ')}
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <h2>{t.bulkHeading}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>{t.bulkLede}</p>
        <form action={allocateAllExchangeAction} className={styles.inlineForm}>
          <input name="rent" placeholder={t.rent} required style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '6px 10px', fontSize: 13, width: 130 }} />
          <input name="deposit" placeholder={t.deposit} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '6px 10px', fontSize: 13, width: 130 }} />
          <button type="submit" className={styles.inlineSubmit}>
            {t.bulkButton}
          </button>
        </form>
      </div>

      <div className={styles.tabs}>
        {(Object.keys(TABS) as Tab[]).map((key) => (
          <Link key={key} href={`/staff/exchange?tab=${key}`} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}>
            {t.tabs[key]}
          </Link>
        ))}
      </div>

      {details.length === 0 && <div className={styles.empty}>{t.none}</div>}
      {details.map(({ a, link, free }) => (
        <div key={a.id} className={styles.card}>
          <div className={styles.rowText}>
            <span className={styles.rowCategory}>
              {a.tenant?.name} &middot; {t.counts[a.status as keyof typeof t.counts] ?? a.status}
            </span>
            <span className={styles.rowMeta}>
              {t.university}: {a.homeUniversity}
              {a.homeCountry ? `, ${a.homeCountry}` : ''} &middot; {a.tenant?.email}
            </span>
            <span className={styles.rowMeta}>
              {t.arrives} {day(a.arrival)} &middot; {t.leaves} {day(a.departure)} &middot; {t.wants}: {t.wantsOptions[a.prefer as keyof typeof t.wantsOptions] ?? a.prefer}
            </span>
            {a.message && <span className={styles.rowMeta}>{a.message}</span>}
            <span className={styles.rowMeta}>
              {t.letter}:{' '}
              {link ? (
                <a href={link} target="_blank" rel="noreferrer">
                  {t.letter}
                </a>
              ) : (
                t.noLetter
              )}
            </span>
            {a.allocatedUnit && <span className={styles.rowMeta}>{a.allocatedUnit.code}</span>}
          </div>

          {tab === 'queue' && (
            <>
              <form action={reviewExchangeAction} className={styles.form} style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={a.id} />
                <input name="note" placeholder={t.statusNote} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '8px 10px', fontSize: 13 }} />
                <div className={styles.inlineForm}>
                  {a.status !== 'verified' && (
                    <button type="submit" name="decision" value="verify" className={styles.inlineSubmit}>
                      {t.verify}
                    </button>
                  )}
                  {a.status !== 'waitlisted' && (
                    <button type="submit" name="decision" value="waitlist" className={styles.inlineSubmit}>
                      {t.waitlist}
                    </button>
                  )}
                  <button type="submit" name="decision" value="reject" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                    {t.reject}
                  </button>
                </div>
              </form>

              <form action={allocateExchangeAction} className={styles.inlineForm} style={{ marginTop: 10, flexWrap: 'wrap' }}>
                <input type="hidden" name="id" value={a.id} />
                <select name="unitId" required defaultValue={free[0]?.id ?? ''}>
                  <option value="" disabled>
                    {free.length === 0 ? t.noSuggestion : t.chooseUnit}
                  </option>
                  {free.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.stairwell?.building?.name} {u.stairwell?.label}
                      {u.code} ({u.kind}, {u.roomCount})
                    </option>
                  ))}
                </select>
                <input name="rent" placeholder={t.rent} required style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '6px 10px', fontSize: 13, width: 130 }} />
                <input name="deposit" placeholder={t.deposit} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '6px 10px', fontSize: 13, width: 110 }} />
                <button type="submit" className={styles.inlineSubmit} disabled={free.length === 0}>
                  {t.allocate}
                </button>
              </form>
            </>
          )}
        </div>
      ))}
    </>
  );
}
