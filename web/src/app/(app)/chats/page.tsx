import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './chats.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { displayNameFor } from '../../../lib/names';

export const metadata: Metadata = {
  title: 'Chats - Kuopas',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'all' } = await searchParams;

  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('memberships', (memberships) => memberships.include('chatGroup', (g) => g))
    .first();
  if (!tenant) redirect('/login');

  const groupIds = tenant.memberships.map((m) => m.chatGroup!.id);

  const scopeByGroupId = new Map(tenant.memberships.map((m) => [m.chatGroup!.id, m.chatGroup!.scope]));

  const lastMessageByGroup = new Map<string, { senderName: string; content: string; sentAt: string }>();
  if (groupIds.length > 0) {
    const recent = await db.orm.public.Message.where((m) => m.chatGroupId.in(groupIds))
      .include('sender', (s) => s)
      .orderBy((m) => m.sentAt.desc())
      .limit(50)
      .all();
    for (const message of recent) {
      if (!lastMessageByGroup.has(message.chatGroupId)) {
        const scope = scopeByGroupId.get(message.chatGroupId) ?? 'building';
        lastMessageByGroup.set(message.chatGroupId, {
          senderName: displayNameFor(message.sender!, scope),
          content: message.content,
          sentAt: message.sentAt,
        });
      }
    }
  }

  const showChats = tab === 'all' || tab === 'groups';

  return (
    <div className={styles.page}>
      <TopBar title={dict.chats.title} />

      <div className={styles.tabs}>
        <Link href="/chats?tab=all" className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}>
          {dict.chats.all}
        </Link>
        <Link href="/chats?tab=unread" className={`${styles.tab} ${tab === 'unread' ? styles.tabActive : ''}`}>
          {dict.chats.unread}
        </Link>
        <Link
          href="/chats?tab=favourites"
          className={`${styles.tab} ${tab === 'favourites' ? styles.tabActive : ''}`}
        >
          {dict.chats.favourites}
        </Link>
        <Link href="/chats?tab=groups" className={`${styles.tab} ${tab === 'groups' ? styles.tabActive : ''}`}>
          {dict.chats.groups}
        </Link>
      </div>

      {showChats ? (
        <div className={styles.chatList}>
          {tenant.memberships.map((m) => {
            const group = m.chatGroup!;
            const last = lastMessageByGroup.get(group.id);
            return (
              <Link key={m.id} href={`/chat/${group.id}`} className={styles.chatRow}>
                <div className={styles.chatAvatar}>{initials(group.name)}</div>
                <div className={styles.chatRowText}>
                  <div className={styles.chatRowTop}>
                    <span className={styles.chatRowName}>{group.name}</span>
                    {last && (
                      <span className={styles.chatRowTime}>{new Date(last.sentAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <span className={styles.chatRowPreview}>
                    {last ? `${last.senderName}: ${last.content}` : dict.chats.noMessagesYet}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          {tab === 'unread' ? dict.chats.unreadUnavailable : dict.chats.favouritesUnavailable}
        </div>
      )}
    </div>
  );
}
