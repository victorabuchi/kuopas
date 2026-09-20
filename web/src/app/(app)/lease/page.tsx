import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { getLiving } from '../../../lib/living';
import { formatMoney } from '../../../lib/lease';
import { nowMs } from '../../../lib/time';
import { isVerified } from '../../../lib/verification';
import {
  confirmEmailCodeAction,
  requestEmailCodeAction,
  submitDocumentVerificationAction,
} from '../../../lib/verification-actions';
import { requestGuarantorAction } from '../../../lib/guarantor-actions';
import TopBar from '../TopBar';

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
  const dict = getDictionary(locale);
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
      </div>

      <div className={styles.content}>
        {tab === 'lease' && <LeaseTab tenantId={tenant.id} t={t} dateFmt={dateFmt} locale={locale} />}
        {tab === 'guarantor' && <GuarantorTab tenantId={tenant.id} t={t} sent={q.sent === '1'} />}
        {tab === 'verify' && <VerifyTab tenantId={tenant.id} v={v} q={q} common={dict.common} />}
        {tab === 'room' && <RoomTab tenantId={tenant.id} unitId={tenant.unitId} t={t} />}
      </div>
    </div>
  );
}

type T = ReturnType<typeof getLiving>['lease'];
type V = ReturnType<typeof getLiving>['verify'];

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
    .orderBy((l) => l.startDate.desc())
    .all();

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
          lease.status === 'cancelled' ? t.cancelled : lease.status === 'ended' || end < now ? t.ended : upcoming ? t.upcoming : t.active;
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

async function VerifyTab({
  tenantId,
  v,
  q,
  common,
}: {
  tenantId: string;
  v: V;
  q: Search;
  common: { back: string };
}) {
  void common;
  const records = await db.orm.public.IdentityVerification.where({ tenantId })
    .orderBy((r) => r.createdAt.desc())
    .all();
  const verified = await isVerified(tenantId);
  const approved = records.find((r) => r.status === 'approved');
  const pending = records.find((r) => r.status === 'pending');
  const methodLabel = (m: string) => (v.methods as Record<string, string>)[m] ?? m;

  const errors: Record<string, string> = {
    code: v.codeWrong,
    not_university: v.notUniversity,
    cooldown: v.cooldown,
    email_unavailable: v.emailUnavailable,
    file: v.docMissing,
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
