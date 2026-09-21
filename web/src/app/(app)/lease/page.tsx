import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { formatMoney } from '../../../lib/lease';
import { nowMs } from '../../../lib/time';
import { requestGuarantorAction } from '../../../lib/guarantor-actions';
import TopBar from '../TopBar';
import VerifyTab from './VerifyTab';

export const metadata: Metadata = {
  title: 'Lease - Kuopas',
};

const TABS = ['lease', 'guarantor', 'verify', 'room'] as const;
type Tab = (typeof TABS)[number];

type Search = {
  tab?: string;
  err?: string;
  sent?: string;
  done?: string;
  docsent?: string;
  devcode?: string;
};

export default async function LeasePage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const q = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(q.tab ?? '') ? (q.tab as Tab) : 'lease';

  const locale = await getLocale();
  const L = getLiving(locale);
  const t = L.lease;
  const v = L.verify;

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');

  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB', { timeZone: 'UTC' });
  const tabLabels: Record<Tab, string> = { lease: t.tabLease, guarantor: t.tabGuarantor, verify: t.tabVerify, room: t.tabRoom };

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.tabs}>
        {TABS.map((key) => (
          <Link key={key} href={`/lease?tab=${key}`} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}>
            {tabLabels[key]}
          </Link>
        ))}
        <Link href="/inspection" className={styles.tab}>
          {L.inspection.tab}
        </Link>
      </div>

      <div className={styles.content}>
        {tab === 'lease' && <LeaseTab tenantId={tenant.id} t={t} dateFmt={dateFmt} locale={locale} />}
        {tab === 'guarantor' && <GuarantorTab tenantId={tenant.id} t={t} sent={q.sent === '1'} />}
        {tab === 'verify' && <VerifyTab tenantId={tenant.id} v={v} q={q} />}
        {tab === 'room' && <RoomTab tenantId={tenant.id} unitId={tenant.unitId!} t={t} />}
      </div>
    </div>
  );
}

type T = ReturnType<typeof getLiving>['lease'];

async function LeaseTab({
  tenantId,
  t,
  dateFmt,
  locale,
}: {
  tenantId: string;
  t: T;
  dateFmt: (iso: string) => string;
  locale: string;
}) {
  const leases = await db.orm.public.Lease.where({ tenantId })
    .include('charges', (c) => c.orderBy((x) => x.periodStart.asc()))
    .include('unit', (u) => u)
    .include('signatures', (s) => s)
    .orderBy((l) => l.startDate.desc())
    .all();
  const sg = getLiving(locale === 'fi' ? 'fi' : 'en').signing;

  if (leases.length === 0) return <div className={`${styles.notice}`}>{t.noLease}</div>;

  const money = (cents: number) => formatMoney(cents, locale === 'fi' ? 'fi-FI' : 'en-FI');
  const now = nowMs();

  return (
    <>
      {leases.map((lease) => {
        const start = new Date(lease.startDate).getTime();
        const end = new Date(lease.endDate).getTime();
        const upcoming = start > now;
        const days = Math.ceil(((upcoming ? start : end) - now) / 86_400_000);
        const total = lease.charges.reduce((sum, c) => sum + c.amountCents, 0);
        const statusLabel =
          lease.status === 'pending_signature' ? sg.pendingBadge : lease.status === 'cancelled' ? t.cancelled : lease.status === 'ended' || end < now ? t.ended : upcoming ? t.upcoming : t.active;
        const kindLabel = (t.kinds as Record<string, string>)[lease.kind] ?? lease.kind;

        return (
          <div key={lease.id} className={styles.card}>
            <div className={styles.item} style={{ padding: 0, border: 'none' }}>
              <div className={styles.itemMain}>
                <span className={styles.cardTitle}>{kindLabel}</span>
                <span className={styles.itemMeta}>
                  {dateFmt(lease.startDate)} - {dateFmt(lease.endDate)}
                </span>
              </div>
              <span className={`${styles.badge} ${statusLabel === t.active ? styles.badgeOk : ''}`}>{statusLabel}</span>
            </div>
            {lease.status === 'pending_signature' && !lease.signatures.some((s) => s.tenantId === tenantId) && (
              <div className={`${styles.notice} ${styles.noticeWarn}`}>
                <strong>{sg.pendingBadge}</strong>{' '}
                <Link href={`/lease/sign/${lease.id}`} className={styles.btn} style={{ marginLeft: 8 }}>
                  {sg.signNow}
                </Link>
              </div>
            )}
            {lease.signatures.some((s) => s.tenantId === tenantId) && (
              <Link href={`/lease/sign/${lease.id}`} className={styles.itemMeta}>
                {sg.signed} &rsaquo;
              </Link>
            )}

            <div>
              <div className={styles.kv}>
                <span className={styles.kvLabel}>{t.unit}</span>
                <span className={styles.kvValue}>
                  {lease.unit?.code}
                </span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvLabel}>{t.rent}</span>
                <span className={styles.kvValue}>{money(lease.monthlyRentCents)}</span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvLabel}>{t.deposit}</span>
                <span className={styles.kvValue}>{money(lease.depositCents)}</span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvLabel}>{t.upfront}</span>
                <span className={styles.kvValue}>
                  {lease.upfrontMonths > 0 ? `${lease.upfrontMonths} ${t.months}` : t.upfrontNone}
                </span>
              </div>
              {days > 0 && lease.status === 'active' && (
                <div className={styles.kv}>
                  <span className={styles.kvLabel}>{upcoming ? t.startsIn : t.daysLeft}</span>
                  <span className={styles.kvValue}>{days}</span>
                </div>
              )}
            </div>

            <div className={styles.sectionHeading}>{t.schedule}</div>
            <p className={styles.lede}>{t.scheduleLede}</p>
            <div className={styles.list}>
              {lease.charges.map((c) => (
                <div key={c.id} className={styles.item} style={{ padding: '10px 4px' }}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemTitle} style={{ fontSize: 14 }}>
                      {dateFmt(c.periodStart)} - {dateFmt(c.periodEnd)}
                    </span>
                    <span className={styles.itemMeta}>
                      {t.due} {dateFmt(c.dueDate)}
                      {c.prorated ? ` · ${t.prorated}` : ''}
                    </span>
                  </div>
                  <span className={styles.itemTitle} style={{ fontSize: 14 }}>{money(c.amountCents)}</span>
                  <span className={`${styles.badge} ${c.paidAt ? styles.badgeOk : ''}`}>{c.paidAt ? t.paid : t.unpaid}</span>
                </div>
              ))}
              <div className={styles.kv} style={{ paddingTop: 12 }}>
                <span className={styles.kvLabel}>{t.total}</span>
                <span className={styles.kvValue}>{money(total)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

async function GuarantorTab({ tenantId, t, sent }: { tenantId: string; t: T; sent: boolean }) {
  const requests = await db.orm.public.GuarantorRequest.where({ tenantId })
    .include('institution', (i) => i)
    .orderBy((r) => r.createdAt.desc())
    .all();
  const institutions = await db.orm.public.GuarantorInstitution.where({ active: true }).all();

  const latest = requests[0];
  const approved = requests.find((r) => r.status === 'approved');
  const pending = requests.find((r) => r.status === 'pending');
  const status = approved ? t.guarantorApproved : pending ? t.guarantorPending : latest?.status === 'rejected' ? t.guarantorRejected : t.guarantorNone;

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t.guarantorHeading}</h2>
        <p className={styles.lede}>{t.guarantorLede}</p>
        <div className={styles.kv}>
          <span className={styles.kvLabel}>{t.guarantorStatus}</span>
          <span className={`${styles.badge} ${approved ? styles.badgeOk : pending ? styles.badgeWarn : latest?.status === 'rejected' ? styles.badgeBad : ''}`}>{status}</span>
        </div>
        {latest?.staffNote && (
          <div className={styles.notice}>
            <strong>{t.staffNote}:</strong> {latest.staffNote}
          </div>
        )}
        {sent && <div className={`${styles.notice} ${styles.noticeOk}`}>{t.requestSent}</div>}
      </div>

      {!approved && !pending && (
        <>
          <div className={styles.sectionHeading}>{t.institutions}</div>
          {institutions.length === 0 && <div className={styles.empty}>{t.noInstitutions}</div>}
          {institutions.map((inst) => (
            <div key={inst.id} className={styles.card}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>{inst.name}</span>
                <span className={styles.itemMeta}>{inst.description}</span>
              </div>
              <form action={requestGuarantorAction}>
                <input type="hidden" name="institutionId" value={inst.id} />
                <button type="submit" className={`${styles.btn} ${styles.btnSmall}`}>
                  {t.chooseInstitution}
                </button>
              </form>
            </div>
          ))}

          <form action={requestGuarantorAction} className={`${styles.card} ${styles.form}`}>
            <h3 className={styles.cardTitle}>{t.personalHeading}</h3>
            <div className={styles.field}>
              <label htmlFor="guarantorName">{t.guarantorName}</label>
              <input id="guarantorName" name="guarantorName" required />
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label htmlFor="guarantorEmail">{t.guarantorEmail}</label>
                <input id="guarantorEmail" name="guarantorEmail" type="email" />
              </div>
              <div className={styles.field}>
                <label htmlFor="guarantorPhone">{t.guarantorPhone}</label>
                <input id="guarantorPhone" name="guarantorPhone" />
              </div>
            </div>
            <button type="submit" className={styles.btn}>
              {t.requestGuarantor}
            </button>
          </form>
        </>
      )}
    </>
  );
}

async function RoomTab({ tenantId, unitId, t }: { tenantId: string; unitId: string; t: T }) {
  const media = await db.orm.public.UnitMedia.where({ unitId }).orderBy((m) => m.createdAt.asc()).all();
  const roommates = (await db.orm.public.Tenant.where({ unitId }).all()).filter((r) => r.id !== tenantId);
  const verifiedIds = new Set(
    (await db.orm.public.IdentityVerification.where({ status: 'approved' }).all()).map((r) => r.tenantId),
  );
  const profiles = await db.orm.public.MatchProfile.all();
  const bio = new Map(profiles.map((p) => [p.tenantId, p.bio]));

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t.roomHeading}</h2>
        <p className={styles.lede}>{t.roomLede}</p>
      </div>

      {media.length === 0 && <div className={styles.empty}>{t.noMedia}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {media.map((m) => (
          <figure key={m.id} style={{ margin: 0 }}>
            {m.kind === 'video' ? (
              <video src={m.url} controls preload="metadata" style={{ width: '100%', borderRadius: 12 }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.caption ?? ''} style={{ width: '100%', borderRadius: 12 }} />
            )}
            {m.caption && <figcaption className={styles.itemMeta}>{m.caption}</figcaption>}
          </figure>
        ))}
      </div>

      <div className={styles.sectionHeading}>{t.roommates}</div>
      {roommates.length === 0 && <div className={styles.empty}>{t.noRoommates}</div>}
      {roommates.map((r) => (
        <div key={r.id} className={styles.item}>
          <div className={styles.itemMain}>
            <span className={styles.itemTitle}>{r.name}</span>
            {bio.get(r.id) && <span className={styles.itemMeta}>{bio.get(r.id)}</span>}
          </div>
          {verifiedIds.has(r.id) && <span className={`${styles.badge} ${styles.badgeOk}`}>{t.verifiedBadge}</span>}
        </div>
      ))}
    </>
  );
}
