import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './communities.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { createCommunityAction, joinCommunityAction } from '../../../lib/community-actions';

export const metadata: Metadata = {
  title: 'Communities - Kuopas',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function CommunitiesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.communities;

  const communities = await db.orm.public.Community.include('members', (m) => m)
    .orderBy((c) => c.createdAt.desc())
    .limit(200)
    .all();

  const joined = communities.filter((c) => c.members.some((m) => m.tenantId === session.tenantId));
  const others = communities.filter((c) => !c.members.some((m) => m.tenantId === session.tenantId));

  function Row({ community, isMember }: { community: (typeof communities)[number]; isMember: boolean }) {
    return (
      <div className={styles.row}>
        <div className={styles.rowAvatar}>{initials(community.name)}</div>
        <div className={styles.rowText}>
          <span className={styles.rowName}>{community.name}</span>
          {community.description && <span className={styles.rowDesc}>{community.description}</span>}
          <span className={styles.rowMeta}>
            {community.members.length} {t.members}
          </span>
        </div>
        {isMember ? (
          <Link href={`/communities/${community.id}`} className={styles.rowAction}>
            {t.open}
          </Link>
        ) : (
          <form action={joinCommunityAction}>
            <input type="hidden" name="communityId" value={community.id} />
            <button type="submit" className={styles.rowAction}>
              {t.join}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <form action={createCommunityAction} className={styles.create}>
          <div className={styles.createHeading}>{t.createHeading}</div>
          <input name="name" type="text" required minLength={3} maxLength={50} placeholder={t.namePlaceholder} />
          <input name="description" type="text" maxLength={200} placeholder={t.descriptionPlaceholder} />
          <button type="submit" className={styles.createBtn}>
            {t.create}
          </button>
        </form>

        {joined.length > 0 && (
          <section>
            <div className={styles.sectionHeading}>{t.yourCommunities}</div>
            {joined.map((c) => (
              <Row key={c.id} community={c} isMember />
            ))}
          </section>
        )}

        <section>
          <div className={styles.sectionHeading}>{t.discover}</div>
          {communities.length === 0 && <div className={styles.empty}>{t.noneYet}</div>}
          {communities.length > 0 && others.length === 0 && <div className={styles.empty}>{t.nothingToJoin}</div>}
          {others.map((c) => (
            <Row key={c.id} community={c} isMember={false} />
          ))}
        </section>
      </div>
    </div>
  );
}
