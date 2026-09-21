import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../../(app)/features.module.css';
import TopBar from '../../(app)/TopBar';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { isVerified } from '../../../lib/verification';
import { POD_MAX, groupFit, joinedPodFor, loadProfiles, pairFit, podMembers } from '../../../lib/pods';
import {
  createPodAction,
  disbandPodAction,
  invitePodAction,
  leavePodAction,
  removePodMemberAction,
  respondPodInviteAction,
} from '../../../lib/pod-actions';

export const metadata: Metadata = {
  title: 'Pods - Kuopas',
};

export default async function PodsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const me = session.tenantId;
  const q = await searchParams;
  const t = getLiving(await getLocale()).apply;

  const verified = await isVerified(me);
  const mine = await db.orm.public.MatchProfile.where({ tenantId: me }).first();
  const pod = await joinedPodFor(me);

  const invitations = await db.orm.public.PodMember.where({ tenantId: me, status: 'invited' })
    .include('pod', (p) => p.include('creator', (c) => c))
    .all();

  const members = pod ? await podMembers(pod.id) : [];
  const joined = members.filter((m) => m.status === 'joined');
  const profiles = await loadProfiles(joined.map((m) => m.tenantId));
  const fit = pod ? groupFit(joined.map((m) => m.tenantId), profiles) : null;
  const isCreator = pod?.creatorId === me;
  const approvals = await db.orm.public.IdentityVerification.where({ status: 'approved' }).all();
  const institutionOf = new Map(approvals.map((a) => [a.tenantId, a.institution]));

  // Verified applicants who fit everyone already in the pod.
  let candidates: { id: string; name: string; institution: string | null; bio: string; average: number; lowest: number }[] = [];
  if (pod && isCreator && mine) {
    const pool = await db.orm.public.MatchProfile.where({ active: true }).include('tenant', (x) => x).all();
    const inPods = new Set((await db.orm.public.PodMember.where({ status: 'joined' }).all()).map((m) => m.tenantId));
    const live = new Set(members.filter((m) => m.status === 'joined' || m.status === 'invited').map((m) => m.tenantId));
    for (const p of pool) {
      if (!p.tenant || p.tenant.unitId || p.tenantId === me || inPods.has(p.tenantId) || live.has(p.tenantId)) continue;
      if (!institutionOf.has(p.tenantId)) continue;
      const scores: number[] = [];
      let blocked = false;
      for (const m of joined) {
        const theirs = profiles.get(m.tenantId);
        if (!theirs) continue;
        const f = pairFit(p, theirs);
        if (f.blocked) blocked = true;
        scores.push(f.score);
      }
      if (blocked || scores.length === 0) continue;
      const average = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
      if (average < pod.minScore) continue;
      candidates.push({ id: p.tenantId, name: p.tenant.name.split(' ')[0] ?? '', institution: institutionOf.get(p.tenantId) ?? null, bio: p.bio, average, lowest: Math.min(...scores) });
    }
    candidates = candidates.sort((a, b) => b.average - a.average).slice(0, 30);
  }

  return (
    <div className={styles.page}>
      <TopBar title={t.podsTitle} />
      <div className={styles.content}>
        <p className={styles.lede}>{t.podsLede}</p>
        {q.saved === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{t.saved}</div>}

        {!verified && (
          <div className={styles.card}>
            <p className={styles.lede}>{t.needVerify}</p>
            <Link href="/apply/verify" className={styles.btn}>
              {t.goVerify}
            </Link>
          </div>
        )}
        {verified && !mine && (
          <div className={styles.card}>
            <p className={styles.lede}>{t.needProfile}</p>
            <Link href="/apply/roommates" className={styles.btn}>
              {t.goProfile}
            </Link>
          </div>
        )}

        {verified && invitations.length > 0 && (
          <>
            <div className={styles.sectionHeading}>{t.invitations}</div>
            {invitations.map((inv) => (
              <div key={inv.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{inv.pod?.name}</span>
                  <span className={styles.itemMeta}>
                    {inv.pod?.creator?.name} {t.invitedTo}
                  </span>
                </div>
                <form action={respondPodInviteAction} style={{ display: 'flex', gap: 8 }}>
                  <input type="hidden" name="memberId" value={inv.id} />
                  <button type="submit" name="accept" value="1" className={styles.btn} disabled={Boolean(pod) || !mine}>
                    {t.accept}
                  </button>
                  <button type="submit" name="accept" value="0" className={`${styles.btn} ${styles.btnGhost}`}>
                    {t.decline}
                  </button>
                </form>
              </div>
            ))}
            {pod && <div className={`${styles.notice} ${styles.noticeWarn}`}>{t.inPodNote}</div>}
          </>
        )}

        {verified && mine && !pod && (
          <form action={createPodAction} className={`${styles.card} ${styles.form}`}>
            <h2 className={styles.cardTitle}>{t.createHeading}</h2>
            <div className={styles.field}>
              <label htmlFor="name">{t.podName}</label>
              <input id="name" name="name" required maxLength={60} placeholder={t.podNamePlaceholder} />
            </div>
            <div className={styles.field}>
              <label htmlFor="minScore">{t.minScore}</label>
              <select id="minScore" name="minScore" defaultValue="60">
                {[40, 50, 60, 70, 80].map((n) => (
                  <option key={n} value={n}>
                    {n}%
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.btn}>
              {t.create}
            </button>
          </form>
        )}

        {pod && (
          <>
            <div className={styles.sectionHeading}>{t.yourPod}</div>
            <div className={styles.card}>
              <div className={styles.item} style={{ padding: 0, border: 'none' }}>
                <div className={styles.itemMain}>
                  <span className={styles.cardTitle}>{pod.name}</span>
                  {fit?.average != null && (
                    <span className={styles.itemMeta}>
                      {t.groupFit}: {fit.average}% &middot; {t.lowestPair}: {fit.lowest}%
                    </span>
                  )}
                </div>
                {fit?.clash && <span className={`${styles.badge} ${styles.badgeBad}`}>{t.clash}</span>}
              </div>

              <div className={styles.sectionHeading}>{t.members}</div>
              {members
                .filter((m) => m.status === 'joined' || m.status === 'invited')
                .map((m) => (
                  <div key={m.id} className={styles.item} style={{ padding: '8px 0', border: 'none' }}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemTitle}>
                        {m.tenantId === me ? t.you : m.tenant?.name}
                        {m.tenantId === pod.creatorId && <span className={styles.itemMeta}> &middot; {t.organiser}</span>}
                      </span>
                      <span className={styles.itemMeta}>{institutionOf.get(m.tenantId) ?? ''}</span>
                    </div>
                    <span className={`${styles.badge} ${m.status === 'joined' ? styles.badgeOk : styles.badgeWarn}`}>
                      {m.status === 'joined' ? t.memberJoined : t.memberInvited}
                    </span>
                    {isCreator && m.tenantId !== me && (
                      <form action={removePodMemberAction}>
                        <input type="hidden" name="podId" value={pod.id} />
                        <input type="hidden" name="memberId" value={m.id} />
                        <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                          {t.remove}
                        </button>
                      </form>
                    )}
                  </div>
                ))}

              <div>
                {isCreator ? (
                  <form action={disbandPodAction}>
                    <input type="hidden" name="podId" value={pod.id} />
                    <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                      {t.disband}
                    </button>
                  </form>
                ) : (
                  <form action={leavePodAction}>
                    <input type="hidden" name="podId" value={pod.id} />
                    <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                      {t.leave}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {isCreator && (
              <>
                <div className={styles.sectionHeading}>{t.findHeading}</div>
                <p className={styles.lede}>{t.findLede}</p>
                {members.filter((m) => m.status !== 'declined' && m.status !== 'left').length >= POD_MAX && (
                  <div className={`${styles.notice} ${styles.noticeWarn}`}>{t.podFull}</div>
                )}
                {candidates.length === 0 && <div className={styles.empty}>{t.findNone}</div>}
                {candidates.map((c) => (
                  <div key={c.id} className={styles.card}>
                    <div className={styles.item} style={{ padding: 0, border: 'none' }}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>
                          {c.name} <span className={`${styles.badge} ${styles.badgeOk}`}>{t.verifiedBadge}</span>
                        </span>
                        {c.institution && <span className={styles.itemMeta}>{c.institution}</span>}
                      </div>
                      <span className={`${styles.badge} ${c.average >= 75 ? styles.badgeOk : styles.badgeWarn}`}>
                        {c.average}% {t.compatible}
                      </span>
                    </div>
                    {c.bio && <p className={styles.lede} style={{ color: '#333' }}>{c.bio}</p>}
                    <form action={invitePodAction}>
                      <input type="hidden" name="podId" value={pod.id} />
                      <input type="hidden" name="inviteeId" value={c.id} />
                      <button type="submit" className={styles.btn}>
                        {t.invite}
                      </button>
                    </form>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
