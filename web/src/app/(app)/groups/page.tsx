import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './groups.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

export const metadata: Metadata = {
  title: 'Groups - Kuopas',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function GroupsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const scopeLabel: Record<string, string> = {
    building: dict.profile.building,
    stairwell: dict.profile.stairwell,
    floor: dict.profile.floor,
  };

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('memberships', (memberships) =>
      memberships.include('chatGroup', (g) => g.include('members', (m) => m.include('tenant', (t) => t))),
    )
    .first();
  if (!tenant) redirect('/login');

  return (
    <div className={styles.page}>
      <TopBar title={dict.groups.title} />

      <div className={styles.list}>
        {tenant.memberships.map((m) => {
          const group = m.chatGroup!;
          return (
            <div key={m.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>{initials(group.name)}</div>
                <div className={styles.cardHeaderText}>
                  <span className={styles.name}>{group.name}</span>
                  <span className={styles.scope}>{scopeLabel[group.scope] ?? group.scope}</span>
                </div>
              </div>

              <div className={styles.members}>
                <span className={styles.membersLabel}>
                  {group.members.length} {dict.groups.members}
                </span>
                <div className={styles.memberChips}>
                  {group.members.map((member) => (
                    <span key={member.id} className={styles.memberChip}>
                      {member.tenant!.name}
                    </span>
                  ))}
                </div>
              </div>

              <Link href={`/chat/${group.id}`} className={styles.openChat}>
                {dict.groups.openChat}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
