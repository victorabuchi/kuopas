import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { DIMENSIONS, compare, parseDealbreakers, type Answers } from '../../../lib/matching';
import { isVerified } from '../../../lib/verification';
import { connectAction, respondConnectionAction } from '../../../lib/matching-actions';
import { startConversationAction } from '../../../lib/direct-message-actions';
import TopBar from '../TopBar';
import MatchWizard from './MatchWizard';

export const metadata: Metadata = {
  title: 'Roommates - Kuopas',
};

const TABS = ['find', 'profile', 'connections'] as const;
type Tab = (typeof TABS)[number];

function answersOf(p: {
  sleepSchedule: string;
  cleanliness: number;
  noiseTolerance: number;
  studyHabit: string;
  guestPolicy: string;
  smoking: string;
  alcohol: string;
  cooking: string;
}): Answers {
  return { ...p };
}

export default async function RoommatesPage({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const q = await searchParams;
  const locale = await getLocale();
  const t = getLiving(locale).roommates;

  const verified = await isVerified(session.tenantId);
  const mine = await db.orm.public.MatchProfile.where({ tenantId: session.tenantId }).first();
  const tab: Tab = (TABS as readonly string[]).includes(q.tab ?? '') ? (q.tab as Tab) : mine ? 'find' : 'profile';
  const tabLabels: Record<Tab, string> = { find: t.tabFind, profile: t.tabProfile, connections: t.tabConnections };

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      {verified && (
        <div className={styles.tabs}>
          {TABS.map((key) => (
            <Link key={key} href={`/roommates?tab=${key}`} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}>
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
        {verified && tab === 'profile' && <ProfileTab mine={mine} t={t} />}
        {verified && tab === 'find' && <FindTab tenantId={session.tenantId} mine={mine} t={t} saved={q.saved === '1'} />}
        {verified && tab === 'connections' && <ConnectionsTab tenantId={session.tenantId} t={t} />}
      </div>
    </div>
  );
}

type T = ReturnType<typeof getLiving>['roommates'];
type Mine = Awaited<ReturnType<typeof db.orm.public.MatchProfile.first>>;

function ProfileTab({ mine, t }: { mine: Mine | null; t: T }) {
  const questions = DIMENSIONS.map((dim) => {
    const q = (t.questions as Record<string, { title: string; options: Record<string, string> }>)[dim.key]!;
    return {
      key: dim.key as string,
      title: q.title,
      options: dim.options.map((value) => ({ value, label: q.options[value] ?? value })),
    };
  });
  const initial: Record<string, string> = mine
    ? Object.fromEntries(DIMENSIONS.map((d) => [d.key, String((mine as unknown as Record<string, string | number>)[d.key])]))
    : {};

  return (
    <MatchWizard
      questions={questions}
      initial={initial}
      initialDealbreakers={mine ? parseDealbreakers(mine.dealbreakers) : []}
      initialBio={mine?.bio ?? ''}
      initialActive={mine?.active ?? true}
      labels={{
        wizardTitle: t.wizardTitle,
        wizardLede: t.wizardLede,
        step: t.step,
        of: t.of,
        next: t.next,
        back: t.back,
        finish: t.finish,
        nonNegotiable: t.nonNegotiable,
        bioLabel: t.bioLabel,
        bioPlaceholder: t.bioPlaceholder,
        visibleLabel: t.visibleLabel,
        finalStep: t.finalStep,
      }}
    />
  );
}

async function FindTab({ tenantId, mine, t, saved }: { tenantId: string; mine: Mine | null; t: T; saved: boolean }) {
  if (!mine) {
    return (
      <div className={styles.card}>
        <p className={styles.lede}>{t.noProfile}</p>
        <Link href="/roommates?tab=profile" className={styles.btn}>
          {t.startWizard}
        </Link>
      </div>
    );
  }

  const others = await db.orm.public.MatchProfile.where({ active: true }).include('tenant', (x) => x).all();
  const verifications = await db.orm.public.IdentityVerification.where({ status: 'approved' }).all();
  const institutionOf = new Map(verifications.map((v) => [v.tenantId, v.institution]));
  const connections = await db.orm.public.MatchConnection.all();

  const myAnswers = answersOf(mine);
  const myBreakers = parseDealbreakers(mine.dealbreakers);

  const ranked = others
    .filter((o) => o.tenantId !== tenantId && institutionOf.has(o.tenantId))
    .map((o) => ({ o, r: compare(myAnswers, myBreakers, answersOf(o), parseDealbreakers(o.dealbreakers)) }))
    .filter(({ r }) => !r.blocked)
    .sort((a, b) => b.r.score - a.r.score);

  const dimLabel = (k: string) => (t.dims as Record<string, string>)[k] ?? k;
  const statusWith = (otherId: string) => {
    const c = connections.find(
      (x) => (x.fromId === tenantId && x.toId === otherId) || (x.fromId === otherId && x.toId === tenantId),
    );
    if (!c) return null;
    return c.status === 'accepted' ? 'accepted' : c.fromId === tenantId ? 'requested' : 'incoming';
  };

  return (
    <>
      {saved && <div className={`${styles.notice} ${styles.noticeOk}`}>{t.saved}</div>}
      {!mine.active && <div className={`${styles.notice} ${styles.noticeWarn}`}>{t.hiddenNote}</div>}
      <div className={styles.sectionHeading}>{t.matchesHeading}</div>
      {ranked.length === 0 && <div className={styles.empty}>{t.noMatches}</div>}
      {ranked.map(({ o, r }) => {
        const status = statusWith(o.tenantId);
        const firstName = (o.tenant?.name ?? '').split(' ')[0];
        return (
          <div key={o.id} className={styles.card}>
            <div className={styles.item} style={{ padding: 0, border: 'none' }}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>
                  {firstName} <span className={`${styles.badge} ${styles.badgeOk}`}>{t.verifiedBadge}</span>
                </span>
                {institutionOf.get(o.tenantId) && (
                  <span className={styles.itemMeta}>{institutionOf.get(o.tenantId)}</span>
                )}
              </div>
              <span className={`${styles.badge} ${r.score >= 75 ? styles.badgeOk : styles.badgeWarn}`} style={{ fontSize: 14, height: 30 }}>
                {r.score}% {t.compatibility}
              </span>
            </div>
            {o.bio && <p className={styles.lede} style={{ color: '#333' }}>{o.bio}</p>}
            {r.best.length > 0 && (
              <span className={styles.itemMeta}>
                {t.matchesOn}: {r.best.map(dimLabel).join(', ')}
              </span>
            )}
            {r.differences.length > 0 && (
              <span className={styles.itemMeta}>
                {t.differsOn}: {r.differences.map(dimLabel).join(', ')}
              </span>
            )}
            {status === null && (
              <form action={connectAction}>
                <input type="hidden" name="toId" value={o.tenantId} />
                <button type="submit" className={`${styles.btn} ${styles.btnSmall}`}>
                  {t.connect}
                </button>
              </form>
            )}
            {status === 'requested' && <span className={styles.badge}>{t.requested}</span>}
            {status === 'incoming' && (
              <form action={connectAction}>
                <input type="hidden" name="toId" value={o.tenantId} />
                <button type="submit" className={`${styles.btn} ${styles.btnSmall}`}>
                  {t.accept}
                </button>
              </form>
            )}
            {status === 'accepted' && (
              <form action={startConversationAction}>
                <input type="hidden" name="otherTenantId" value={o.tenantId} />
                <button type="submit" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                  {t.message}
                </button>
              </form>
            )}
          </div>
        );
      })}
    </>
  );
}

async function ConnectionsTab({ tenantId, t }: { tenantId: string; t: T }) {
  const all = await db.orm.public.MatchConnection.include('from', (x) => x).include('to', (x) => x).all();
  const mineOnly = all.filter((c) => c.fromId === tenantId || c.toId === tenantId);
  const incoming = mineOnly.filter((c) => c.toId === tenantId && c.status === 'pending');
  const outgoing = mineOnly.filter((c) => c.fromId === tenantId && c.status === 'pending');
  const connected = mineOnly.filter((c) => c.status === 'accepted');

  if (mineOnly.length === 0) return <div className={styles.empty}>{t.noConnections}</div>;

  return (
    <>
      {incoming.length > 0 && <div className={styles.sectionHeading}>{t.incoming}</div>}
      {incoming.map((c) => (
        <div key={c.id} className={styles.item}>
          <span className={`${styles.itemMain} ${styles.itemTitle}`}>{(c.from?.name ?? '').split(' ')[0]}</span>
          <form action={respondConnectionAction} className={styles.itemActions}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" name="accept" value="1" className={`${styles.btn} ${styles.btnSmall}`}>
              {t.accept}
            </button>
            <button type="submit" name="accept" value="0" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}>
              {t.decline}
            </button>
          </form>
        </div>
      ))}
      {outgoing.length > 0 && <div className={styles.sectionHeading}>{t.outgoing}</div>}
      {outgoing.map((c) => (
        <div key={c.id} className={styles.item}>
          <span className={`${styles.itemMain} ${styles.itemTitle}`}>{(c.to?.name ?? '').split(' ')[0]}</span>
          <span className={styles.badge}>{t.pending}</span>
        </div>
      ))}
      {connected.length > 0 && <div className={styles.sectionHeading}>{t.accepted}</div>}
      {connected.map((c) => {
        const other = c.fromId === tenantId ? c.to : c.from;
        return (
          <div key={c.id} className={styles.item}>
            <span className={`${styles.itemMain} ${styles.itemTitle}`}>{(other?.name ?? '').split(' ')[0]}</span>
            <form action={startConversationAction}>
              <input type="hidden" name="otherTenantId" value={other?.id ?? ''} />
              <button type="submit" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                {t.message}
              </button>
            </form>
          </div>
        );
      })}
    </>
  );
}
