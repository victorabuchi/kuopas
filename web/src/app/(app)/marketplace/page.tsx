import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { isVerified } from '../../../lib/verification';
import {
  closeListingAction,
  createListingAction,
  requestListingAction,
  respondRequestAction,
  withdrawRequestAction,
} from '../../../lib/market-actions';
import TopBar from '../TopBar';

export const metadata: Metadata = {
  title: 'Market - Kuopas',
};

const TABS = ['browse', 'mine', 'new', 'requests'] as const;
type Tab = (typeof TABS)[number];

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ tab?: string; kind?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const q = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(q.tab ?? '') ? (q.tab as Tab) : 'browse';
  const locale = await getLocale();
  const t = getLiving(locale).market;
  const verified = await isVerified(session.tenantId);
  const tabLabels: Record<Tab, string> = { browse: t.tabBrowse, mine: t.tabMine, new: t.tabNew, requests: t.tabRequests };

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      {verified && (
        <div className={styles.tabs}>
          {TABS.map((key) => (
            <Link key={key} href={`/marketplace?tab=${key}`} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}>
              {tabLabels[key]}
            </Link>
          ))}
        </div>
      )}
      <div className={styles.content}>
        {!verified && (
          <div className={styles.card}>
            <p className={styles.lede}>{t.verifyFirst}</p>
            <Link href="/lease?tab=verify" className={styles.btn}>
              {t.goVerify}
            </Link>
          </div>
        )}
        {verified && tab === 'browse' && <BrowseTab tenantId={session.tenantId} kind={q.kind} t={t} locale={locale} />}
        {verified && tab === 'mine' && <MineTab tenantId={session.tenantId} t={t} locale={locale} />}
        {verified && tab === 'new' && <NewTab t={t} />}
        {verified && tab === 'requests' && <RequestsTab tenantId={session.tenantId} t={t} />}
      </div>
    </div>
  );
}

type T = ReturnType<typeof getLiving>['market'];

function fmtMoney(cents: number | null, locale: string) {
  if (cents == null) return '';
  return new Intl.NumberFormat(locale === 'fi' ? 'fi-FI' : 'en-FI', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
function fmtDate(iso: string | null, locale: string) {
  return iso ? new Date(iso).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB', { timeZone: 'UTC' }) : '';
}

async function BrowseTab({ tenantId, kind, t, locale }: { tenantId: string; kind?: string; t: T; locale: string }) {
  const me = await db.orm.public.Tenant.where({ id: tenantId }).first();
  const listings = await db.orm.public.Listing.where({ status: 'open' })
    .include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b)))
    .include('seller', (s) => s)
    .include('requests', (r) => r)
    .orderBy((l) => l.createdAt.desc())
    .limit(100)
    .all();

  const shown = listings.filter((l) => l.sellerId !== tenantId && (kind === 'sublet' || kind === 'swap' ? l.kind === kind : true));

  return (
    <>
      <div className={styles.itemActions}>
        {[
          ['', t.all],
          ['sublet', t.sublet],
          ['swap', t.swap],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/marketplace?tab=browse${value ? `&kind=${value}` : ''}`}
            className={`${styles.tab} ${((kind ?? '') === value) ? styles.tabActive : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {shown.length === 0 && <div className={styles.empty}>{t.empty}</div>}
      {shown.map((l) => {
        const already = l.requests.some((r) => r.requesterId === tenantId);
        const sameUnit = me?.unitId === l.unitId;
        return (
          <div key={l.id} className={styles.card}>
            <div className={styles.item} style={{ padding: 0, border: 'none' }}>
              <div className={styles.itemMain}>
                <span className={styles.cardTitle}>{l.title}</span>
                <span className={styles.itemMeta}>
                  {l.unit?.stairwell?.building?.name} {l.unit?.stairwell?.label}
                  {l.unit?.code} · {l.unit?.floor}. {t.floor} · {(l.seller?.name ?? '').split(' ')[0]}
                </span>
              </div>
              <span className={`${styles.badge} ${l.kind === 'sublet' ? styles.badgeOk : styles.badgeWarn}`}>{l.kind === 'sublet' ? t.sublet : t.swap}</span>
            </div>
            <p className={styles.lede} style={{ color: '#333' }}>{l.description}</p>
            {l.kind === 'sublet' && (
              <span className={styles.itemMeta}>
                {fmtMoney(l.priceCents, locale)} {t.perMonth} · {fmtDate(l.availableFrom, locale)} - {fmtDate(l.availableTo, locale)}
              </span>
            )}
            {l.kind === 'swap' && l.wanted && (
              <span className={styles.itemMeta}>
                {t.wantsLabel}: {l.wanted}
              </span>
            )}
            {already ? (
              <span className={styles.badge}>{t.requested}</span>
            ) : sameUnit ? null : (
              <form action={requestListingAction} className={styles.form}>
                <input type="hidden" name="listingId" value={l.id} />
                <div className={styles.field}>
                  <label htmlFor={`m-${l.id}`}>{t.messageLabel}</label>
                  <input id={`m-${l.id}`} name="message" required placeholder={t.messagePlaceholder} />
                </div>
                <button type="submit" className={`${styles.btn} ${styles.btnSmall}`}>
                  {t.sendRequest}
                </button>
              </form>
            )}
          </div>
        );
      })}
    </>
  );
}

async function MineTab({ tenantId, t, locale }: { tenantId: string; t: T; locale: string }) {
  const listings = await db.orm.public.Listing.where({ sellerId: tenantId })
    .include('requests', (r) => r.include('requester', (x) => x))
    .include('subleases', (s) => s)
    .orderBy((l) => l.createdAt.desc())
    .all();

  if (listings.length === 0) return <div className={styles.empty}>{t.empty}</div>;

  return (
    <>
      {listings.map((l) => (
        <div key={l.id} className={styles.card}>
          <div className={styles.item} style={{ padding: 0, border: 'none' }}>
            <div className={styles.itemMain}>
              <span className={styles.cardTitle}>{l.title}</span>
              <span className={styles.itemMeta}>{l.kind === 'sublet' ? t.sublet : t.swap}</span>
            </div>
            <span className={`${styles.badge} ${l.status === 'completed' ? styles.badgeOk : l.status === 'pending_approval' ? styles.badgeWarn : ''}`}>
              {(t.status as Record<string, string>)[l.status] ?? l.status}
            </span>
          </div>
          {l.status === 'pending_approval' && <div className={`${styles.notice} ${styles.noticeWarn}`}>{t.acceptedNote}</div>}
          {l.status === 'completed' && (
            <div className={`${styles.notice} ${styles.noticeOk}`}>
              {l.kind === 'sublet' ? t.subleaseDeal : t.swapDeal}
              {l.subleases[0] ? ` · ${fmtDate(l.subleases[0].startDate, locale)} - ${fmtDate(l.subleases[0].endDate, locale)}` : ''}
            </div>
          )}
          {l.status === 'open' && (
            <>
              <div className={styles.sectionHeading}>{t.requestsHeading}</div>
              {l.requests.filter((r) => r.status === 'pending').length === 0 && <div className={styles.empty}>{t.noRequests}</div>}
              {l.requests
                .filter((r) => r.status === 'pending')
                .map((r) => (
                  <div key={r.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemTitle}>{(r.requester?.name ?? '').split(' ')[0]}</span>
                      <span className={styles.itemMeta}>{r.message}</span>
                    </div>
                    <form action={respondRequestAction} className={styles.itemActions}>
                      <input type="hidden" name="requestId" value={r.id} />
                      <button type="submit" name="accept" value="1" className={`${styles.btn} ${styles.btnSmall}`}>
                        {t.accept}
                      </button>
                      <button type="submit" name="accept" value="0" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}>
                        {t.decline}
                      </button>
                    </form>
                  </div>
                ))}
            </>
          )}
          {(l.status === 'open' || l.status === 'pending_approval') && (
            <form action={closeListingAction}>
              <input type="hidden" name="listingId" value={l.id} />
              <button type="submit" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}>
                {t.close}
              </button>
            </form>
          )}
        </div>
      ))}
    </>
  );
}

function NewTab({ t }: { t: T }) {
  return (
    <form action={createListingAction} className={`${styles.card} ${styles.form}`}>
      <div>
        <h2 className={styles.cardTitle}>{t.formHeading}</h2>
        <p className={styles.lede}>{t.formLede}</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="kind">{t.kind}</label>
        <select id="kind" name="kind" defaultValue="sublet">
          <option value="sublet">{t.sublet}</option>
          <option value="swap">{t.swap}</option>
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="title">{t.titleLabel}</label>
        <input id="title" name="title" required placeholder={t.titlePlaceholder} />
      </div>
      <div className={styles.field}>
        <label htmlFor="description">{t.description}</label>
        <textarea id="description" name="description" required />
      </div>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="price">{t.price}</label>
          <input id="price" name="price" inputMode="decimal" />
        </div>
        <div className={styles.field}>
          <label htmlFor="wanted">{t.wanted}</label>
          <input id="wanted" name="wanted" placeholder={t.wantedPlaceholder} />
        </div>
      </div>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="availableFrom">{t.from}</label>
          <input id="availableFrom" name="availableFrom" type="date" />
        </div>
        <div className={styles.field}>
          <label htmlFor="availableTo">{t.to}</label>
          <input id="availableTo" name="availableTo" type="date" />
        </div>
      </div>
      <button type="submit" className={styles.btn}>
        {t.publish}
      </button>
    </form>
  );
}

async function RequestsTab({ tenantId, t }: { tenantId: string; t: T }) {
  const requests = await db.orm.public.ListingRequest.where({ requesterId: tenantId })
    .include('listing', (l) => l)
    .orderBy((r) => r.createdAt.desc())
    .all();
  if (requests.length === 0) return <div className={styles.empty}>{t.empty}</div>;

  return (
    <>
      {requests.map((r) => (
        <div key={r.id} className={styles.item}>
          <div className={styles.itemMain}>
            <span className={styles.itemTitle}>{r.listing?.title}</span>
            <span className={styles.itemMeta}>{r.message}</span>
          </div>
          <span className={`${styles.badge} ${r.status === 'accepted' ? styles.badgeOk : r.status === 'declined' ? styles.badgeBad : ''}`}>
            {(t.requestStatus as Record<string, string>)[r.status] ?? r.status}
          </span>
          {r.status === 'pending' && (
            <form action={withdrawRequestAction}>
              <input type="hidden" name="requestId" value={r.id} />
              <button type="submit" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}>
                {t.withdraw}
              </button>
            </form>
          )}
        </div>
      ))}
    </>
  );
}
