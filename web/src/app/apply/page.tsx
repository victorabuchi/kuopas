import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../(app)/features.module.css';
import TopBar from '../(app)/TopBar';
import { db } from '../../prisma/db';
import { getSession } from '../../lib/session';
import { getLocale } from '../../lib/i18n';
import { getLiving } from '../../lib/living';
import { isVerified } from '../../lib/verification';
import { joinedPodFor } from '../../lib/pods';
import { respondOfferAction } from '../../lib/apply-actions';

export const metadata: Metadata = {
  title: 'Apply - Kuopas',
};

export default async function ApplyOverviewPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const t = getLiving(await getLocale()).apply;

  const verified = await isVerified(session.tenantId);
  const profile = await db.orm.public.MatchProfile.where({ tenantId: session.tenantId }).first();
  const pod = await joinedPodFor(session.tenantId);
  const applications = pod
    ? await db.orm.public.PodApplication.where({ podId: pod.id }).include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b))).all()
    : [];
  const live = applications.filter((a) => !['withdrawn', 'declined', 'rejected'].includes(a.status));
  const offer = applications.find((a) => a.status === 'offered');
  const exchange = await db.orm.public.ExchangeApplication.where({ tenantId: session.tenantId }).first();

  const steps = [
    { key: 'verify' as const, done: verified, href: '/apply/verify' },
    { key: 'profile' as const, done: Boolean(profile), href: '/apply/roommates' },
    { key: 'pod' as const, done: Boolean(pod), href: '/apply/pods' },
    { key: 'apply' as const, done: live.length > 0, href: '/apply/homes' },
  ];

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <p className={styles.lede}>{t.lede}</p>

        {offer && pod?.creatorId === session.tenantId && (
          <div className={`${styles.notice} ${styles.noticeOk}`}>
            <strong>
              {t.offerBanner} {offer.unit?.stairwell?.building?.name} {offer.unit?.code}
            </strong>
            <form action={respondOfferAction} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input type="hidden" name="id" value={offer.id} />
              <button type="submit" name="accept" value="1" className={styles.btn}>
                {t.acceptOffer}
              </button>
              <button type="submit" name="accept" value="0" className={`${styles.btn} ${styles.btnGhost}`}>
                {t.declineOffer}
              </button>
            </form>
          </div>
        )}

        {steps.map((step, i) => (
          <div key={step.key} className={styles.card}>
            <div className={styles.item} style={{ padding: 0, border: 'none' }}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>
                  {i + 1}. {t.steps[step.key].title}
                </span>
                <span className={styles.itemMeta}>{t.steps[step.key].body}</span>
              </div>
              <span className={`${styles.badge} ${step.done ? styles.badgeOk : styles.badgeWarn}`}>{step.done ? t.stepDone : t.stepTodo}</span>
            </div>
            <div>
              <Link href={step.href} className={`${styles.btn} ${step.done ? styles.btnGhost : ''}`}>
                {t.open}
              </Link>
            </div>
          </div>
        ))}

        <div className={styles.sectionHeading}>{t.myApplications}</div>
        {live.length === 0 && <div className={styles.empty}>{t.noApplications}</div>}
        {live.map((a) => (
          <div key={a.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>
                {a.unit?.stairwell?.building?.name} {a.unit?.code}
              </span>
            </div>
            <span className={styles.badge}>{t.appStatus[a.status as keyof typeof t.appStatus] ?? a.status}</span>
          </div>
        ))}

        <div className={styles.card}>
          <span className={styles.itemTitle}>{t.exchangeLink}</span>
          <span className={styles.lede}>{t.exchangeLinkBody}</span>
          {exchange && (
            <span className={styles.badge}>{t.exchangeStatus[exchange.status as keyof typeof t.exchangeStatus] ?? exchange.status}</span>
          )}
          <div>
            <Link href="/apply/exchange" className={`${styles.btn} ${styles.btnGhost}`}>
              {t.open}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
