import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import styles from '../../../features.module.css';
import TopBar from '../../../TopBar';
import { getSession } from '../../../../../lib/session';
import { getLocale } from '../../../../../lib/i18n';
import { getLiving } from '../../../../../lib/living';
import { formatMoney } from '../../../../../lib/lease';
import { leaseFingerprint, loadLeaseForSigning } from '../../../../../lib/lease-document';
import { suomiFiMode } from '../../../../../lib/suomifi';

export const metadata: Metadata = {
  title: 'Sign lease - Kuopas',
};

export default async function SignLeasePage({
  params,
  searchParams,
}: {
  params: Promise<{ leaseId: string }>;
  searchParams: Promise<{ signed?: string; err?: string }>;
}) {
  const { leaseId } = await params;
  const q = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const L = getLiving(locale);
  const t = L.signing;
  const lease = await loadLeaseForSigning(leaseId);
  if (!lease || lease.tenantId !== session.tenantId) notFound();

  const money = (cents: number) => formatMoney(cents, locale === 'fi' ? 'fi-FI' : 'en-FI');
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB', { timeZone: 'UTC' });
  const mine = (lease.signatures ?? []).find((s) => s.tenantId === session.tenantId);
  const fingerprint = leaseFingerprint(lease);
  const changedSinceSigning = mine ? mine.documentHash !== fingerprint : false;
  const canSign = !mine && ['pending_signature', 'active'].includes(lease.status);
  const termsUrl = process.env['LEASE_TERMS_URL'];
  const unit = lease.unit;
  const kindLabel = (L.lease.kinds as Record<string, string>)[lease.kind] ?? lease.kind;
  const building = unit?.stairwell?.building;

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <Link href="/lease" className={styles.itemMeta}>
          &lsaquo; {t.back}
        </Link>
        <p className={styles.lede}>{t.lede}</p>
        {q.signed === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{t.justSigned}</div>}
        {q.err && <div className={`${styles.notice} ${styles.noticeErr}`}>{(t.errors as Record<string, string>)[q.err] ?? t.notFound}</div>}

        <div className={styles.card}>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{t.landlord}</span>
            <span className={styles.kvValue}>Kuopion Opiskelija-asunnot Oy, Torikatu 15, 70110 Kuopio</span>
          </div>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{t.tenant}</span>
            <span className={styles.kvValue}>
              {lease.tenant?.name} ({lease.tenant?.email})
            </span>
          </div>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{t.premises}</span>
            <span className={styles.kvValue}>
              {building?.name} {unit?.stairwell?.label}
              {unit?.code}, {building?.address}
            </span>
          </div>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{t.term}</span>
            <span className={styles.kvValue}>
              {kindLabel}: {day(lease.startDate)} - {day(lease.endDate)}
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
              {lease.upfrontMonths} {t.months}
            </span>
          </div>
          <div className={styles.sectionHeading}>{t.schedule}</div>
          {(lease.charges ?? []).map((c) => (
            <div key={c.id} className={styles.kv}>
              <span className={styles.kvLabel}>
                {day(c.periodStart)} - {day(c.periodEnd)} ({t.due} {day(c.dueDate)})
              </span>
              <span className={styles.kvValue}>{money(c.amountCents)}</span>
            </div>
          ))}
          <span className={styles.itemMeta}>
            {t.termsNote}{' '}
            {termsUrl && (
              <a href={termsUrl} target="_blank" rel="noreferrer">
                {t.termsLink}
              </a>
            )}
          </span>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{t.fingerprint}</span>
            <span className={styles.kvValue} style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
              {fingerprint}
            </span>
          </div>
        </div>

        {mine ? (
          <div className={`${styles.card} ${styles.cardSoft}`}>
            <span className={styles.itemTitle}>
              {t.youSigned} {new Date(mine.signedAt).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-GB')} {t.via} {(t.methods as Record<string, string>)[mine.method] ?? mine.method}
            </span>
            <span className={styles.itemMeta}>{t.fingerprint}: <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{mine.documentHash}</span></span>
            {changedSinceSigning && <div className={`${styles.notice} ${styles.noticeWarn}`}>The terms changed after you signed. Ask Kuopas.</div>}
            {lease.staffSignedAt ? (
              <span className={styles.itemMeta}>
                {t.staffSigned} {new Date(lease.staffSignedAt).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB')}. {lease.status === 'active' ? t.inForce : ''}
              </span>
            ) : (
              <span className={styles.itemMeta}>{t.awaitingStaff}</span>
            )}
            <span className={styles.itemMeta}>{t.legal}</span>
          </div>
        ) : canSign ? (
          suomiFiMode() !== 'off' ? (
            <div>
              <a href={`/api/auth/suomifi/start?intent=sign&leaseId=${lease.id}`} className={styles.btn}>
                {t.signButton}
              </a>
            </div>
          ) : (
            <div className={`${styles.notice} ${styles.noticeWarn}`}>{t.signOff}</div>
          )
        ) : (
          <div className={styles.notice}>{t.notFound}</div>
        )}
      </div>
    </div>
  );
}
