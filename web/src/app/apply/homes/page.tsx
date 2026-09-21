import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from '../../(app)/features.module.css';
import TopBar from '../../(app)/TopBar';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { isVerified } from '../../../lib/verification';
import { joinedPodFor, loadProfiles, pairFit, podMembers } from '../../../lib/pods';
import { applyToUnitAction, respondOfferAction, withdrawApplicationAction } from '../../../lib/apply-actions';

export const metadata: Metadata = {
  title: 'Homes - Kuopas',
};

export default async function HomesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const me = session.tenantId;
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = getLiving(locale).apply;

  const verified = await isVerified(me);
  const pod = await joinedPodFor(me);
  const members = pod ? (await podMembers(pod.id)).filter((m) => m.status === 'joined') : [];
  const podProfiles = await loadProfiles([me, ...members.map((m) => m.tenantId)]);
  const applications = pod ? await db.orm.public.PodApplication.where({ podId: pod.id }).all() : [];

  const units = await db.orm.public.Unit.where({ openForApplications: true })
    .include('stairwell', (s) => s.include('building', (b) => b))
    .include('media', (m) => m.orderBy((x) => x.createdAt.asc()))
    .include('tenants', (x) => x)
    .all();

  const errors: Record<string, string> = {
    verify: t.notVerified,
    'pod-not-ready': t.podNotReady,
    'too-big': t.tooBig,
    'leave-pod': t.inPodNote,
    organiser: t.organiser,
  };
  const groupSize = Math.max(1, members.length);
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB', { timeZone: 'UTC' });

  const rows = await Promise.all(
    units.map(async (u) => {
      const residents = u.tenants ?? [];
      const free = Math.max(0, u.roomCount - residents.length);
      const residentProfiles = await loadProfiles(residents.map((r) => r.id));
      // Average fit between my pod and the people already living there.
      const scores: number[] = [];
      for (const mem of members.length ? members.map((m) => m.tenantId) : [me]) {
        const mine = podProfiles.get(mem);
        if (!mine) continue;
        for (const res of residentProfiles.values()) if (res.active) scores.push(pairFit(mine, res).score);
      }
      const fit = scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null;
      return { u, free, fit, residentsCount: residents.length };
    }),
  );

  return (
    <div className={styles.page}>
      <TopBar title={t.homesTitle} />
      <div className={styles.content}>
        <p className={styles.lede}>{t.homesLede}</p>
        {error && errors[error] && <div className={`${styles.notice} ${styles.noticeErr}`}>{errors[error]}</div>}
        {rows.length === 0 && <div className={styles.empty}>{t.homesNone}</div>}

        {rows.map(({ u, free, fit }) => {
          const application = applications.find((a) => a.unitId === u.id && !['withdrawn', 'declined', 'rejected'].includes(a.status));
          const building = u.stairwell?.building;
          const kind = t.kinds[u.kind as keyof typeof t.kinds] ?? t.kinds.other;
          const media = (u.media ?? []).slice(0, 4);
          return (
            <div key={u.id} className={styles.card}>
              <div className={styles.item} style={{ padding: 0, border: 'none' }}>
                <div className={styles.itemMain}>
                  <span className={styles.cardTitle}>
                    {building?.name}, {u.stairwell?.label}
                    {u.code}
                  </span>
                  <span className={styles.itemMeta}>
                    {kind} &middot; {t.rooms.replace('{n}', String(u.roomCount))} &middot; {t.free.replace('{n}', String(free))}
                    {u.furnished ? ` · ${t.furnished}` : ''}
                    {u.availableFrom ? ` · ${t.availableFrom} ${dateFmt(u.availableFrom)}` : ''}
                  </span>
                </div>
                {application && <span className={`${styles.badge} ${styles.badgeOk}`}>{t.appStatus[application.status as keyof typeof t.appStatus] ?? application.status}</span>}
              </div>

              {u.kind === 'solu' && (
                <span className={styles.itemMeta}>
                  {t.fit}: {fit === null ? t.fitNone : `${fit}%`}
                </span>
              )}

              {media.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {media.map((m) =>
                    m.kind === 'video' ? (
                      <video key={m.id} src={m.url} controls preload="metadata" style={{ width: 200, borderRadius: 10 }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={m.url} alt={m.caption ?? t.tour} style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 10 }} />
                    ),
                  )}
                </div>
              )}

              {application?.status === 'offered' && pod?.creatorId === me && (
                <form action={respondOfferAction} style={{ display: 'flex', gap: 8 }}>
                  <input type="hidden" name="id" value={application.id} />
                  <button type="submit" name="accept" value="1" className={styles.btn}>
                    {t.acceptOffer}
                  </button>
                  <button type="submit" name="accept" value="0" className={`${styles.btn} ${styles.btnGhost}`}>
                    {t.declineOffer}
                  </button>
                </form>
              )}
              {application && ['submitted', 'offered'].includes(application.status) && pod?.creatorId === me && (
                <form action={withdrawApplicationAction}>
                  <input type="hidden" name="id" value={application.id} />
                  <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                    {t.withdraw}
                  </button>
                </form>
              )}

              {!application && verified && (
                <form action={applyToUnitAction} className={styles.form}>
                  <input type="hidden" name="unitId" value={u.id} />
                  <input name="message" maxLength={300} placeholder={t.messagePlaceholder} />
                  {groupSize > free && <div className={`${styles.notice} ${styles.noticeWarn}`}>{t.tooBig}</div>}
                  <div>
                    <button type="submit" className={styles.btn}>
                      {members.length > 1 ? t.applyWithPod : t.applyAlone}
                    </button>
                  </div>
                </form>
              )}
              {!verified && <div className={`${styles.notice} ${styles.noticeWarn}`}>{t.notVerified}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
