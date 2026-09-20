import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { decideDealAction, removeListingAction } from '../../../../lib/market-actions';

export const metadata: Metadata = {
  title: 'Market - Kuopas staff',
};

export default async function StaffMarketPage() {
  const locale = await getLocale();
  const t = getLiving(locale).staff.market;
  const day = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

  const pending = await db.orm.public.Listing.where({ status: 'pending_approval' })
    .include('seller', (s) => s.include('unit', (u) => u))
    .include('unit', (u) => u)
    .orderBy((l) => l.createdAt.asc())
    .all();
  const requestIds = pending.map((l) => l.acceptedRequestId).filter((id): id is string => Boolean(id));
  const requests = requestIds.length ? await db.orm.public.ListingRequest.where((r) => r.id.in(requestIds)).include('requester', (x) => x.include('unit', (u) => u)).all() : [];
  const requestById = new Map(requests.map((r) => [r.id, r]));

  const open = await db.orm.public.Listing.where({ status: 'open' }).include('seller', (s) => s).orderBy((l) => l.createdAt.desc()).limit(100).all();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.lede}</p>

      {pending.length === 0 && <div className={styles.empty}>{t.empty}</div>}
      {pending.map((l) => {
        const r = l.acceptedRequestId ? requestById.get(l.acceptedRequestId) : undefined;
        return (
          <div key={l.id} className={styles.card}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>
                {l.kind === 'sublet' ? t.sublet : t.swap}: {l.title}
              </span>
              <span className={styles.rowMeta}>
                {t.seller}: {l.seller?.name} ({l.seller?.email}) · {l.unit?.code}
              </span>
              <span className={styles.rowMeta}>
                {t.requester}: {r?.requester?.name} ({r?.requester?.email}) · {r?.requester?.unit?.code}
              </span>
              {l.kind === 'sublet' && (
                <span className={styles.rowMeta}>
                  {t.dates}: {day(l.availableFrom)} - {day(l.availableTo)}
                </span>
              )}
            </div>
            <form action={decideDealAction} className={styles.inlineForm} style={{ marginTop: 10 }}>
              <input type="hidden" name="listingId" value={l.id} />
              <button type="submit" name="approve" value="1" className={styles.inlineSubmit}>
                {t.approve}
              </button>
              <button type="submit" name="approve" value="0" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                {t.reject}
              </button>
            </form>
          </div>
        );
      })}

      <div className={styles.card}>
        <h2>{t.listings}</h2>
        {open.length === 0 && <div className={styles.empty}>{t.noListings}</div>}
        <div className={styles.list}>
          {open.map((l) => (
            <div key={l.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>{l.title}</span>
                <span className={styles.rowMeta}>
                  {l.kind === 'sublet' ? t.sublet : t.swap} · {l.seller?.name}
                </span>
              </div>
              <form action={removeListingAction}>
                <input type="hidden" name="listingId" value={l.id} />
                <button type="submit" className={styles.inlineSubmit}>
                  {t.remove}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
