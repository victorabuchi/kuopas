import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './communities.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

export const metadata: Metadata = {
  title: 'Communities - Kuopas',
};

const SCOPE_ORDER = ['building', 'stairwell', 'floor', 'unit'] as const;

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

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .include('memberships', (memberships) => memberships.include('chatGroup', (g) => g))
    .first();
  if (!tenant) redirect('/login');

  const building = tenant.unit!.stairwell!.building!;
  const groups = tenant.memberships
    .map((m) => m.chatGroup!)
    .sort((a, b) => SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope));

  const groupIds = groups.map((g) => g.id);
  const members = groupIds.length === 0 ? [] : await db.orm.public.ChatGroupMember.where((m) => m.chatGroupId.in(groupIds)).all();
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.chatGroupId, (counts.get(m.chatGroupId) ?? 0) + 1);

  const scopeLabel: Record<string, string> = {
    building: dict.profile.building,
    stairwell: dict.profile.stairwell,
    floor: dict.profile.floor,
    unit: dict.profile.unit,
  };

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <div className={styles.community}>
          <div className={styles.communityAvatar}>{initials(building.name)}</div>
          <div>
            <div className={styles.communityKicker}>{t.yourCommunity}</div>
            <div className={styles.communityName}>{building.name}</div>
            <div className={styles.communityLede}>{t.lede}</div>
          </div>
        </div>

        {groups.length === 0 && <div className={styles.empty}>{t.empty}</div>}
        <div className={styles.list}>
          {groups.map((group) => (
            <Link key={group.id} href={`/chat/${group.id}`} className={styles.row}>
              <div className={styles.rowAvatar}>{initials(group.name)}</div>
              <div className={styles.rowText}>
                <span className={styles.rowName}>{group.name}</span>
                <span className={styles.rowMeta}>
                  {scopeLabel[group.scope]} · {counts.get(group.id) ?? 0} {dict.groups.members}
                </span>
              </div>
              <span className={styles.rowOpen}>{dict.groups.openChat}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
