import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './home.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';

export const metadata: Metadata = {
  title: 'Feed - Kuopas',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('memberships', (memberships) => memberships.include('chatGroup', (g) => g))
    .first();
  if (!tenant) redirect('/login');

  const groupIds = tenant.memberships.map((m) => m.chatGroup!.id);

  const messages =
    groupIds.length === 0
      ? []
      : await db.orm.public.Message.where((m) => m.chatGroupId.in(groupIds))
          .include('sender', (s) => s)
          .include('chatGroup', (g) => g)
          .orderBy((m) => m.sentAt.desc())
          .limit(30)
          .all();

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>Feed</span>
      </div>

      <div className={styles.feed}>
        {messages.length === 0 && (
          <div className={styles.empty}>No messages yet. Say hello in one of your chats.</div>
        )}
        {messages.map((message) => (
          <Link key={message.id} href={`/chat/${message.chatGroup!.id}`} className={styles.post}>
            <div className={styles.postHeader}>
              <div className={styles.postAvatar}>{initials(message.sender!.name)}</div>
              <div className={styles.postHeaderText}>
                <span className={styles.postSender}>{message.sender!.name}</span>
                <span className={styles.postMeta}>
                  {message.chatGroup!.name} &middot; {new Date(message.sentAt).toLocaleString()}
                </span>
              </div>
            </div>
            <p className={styles.postContent}>{message.content}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
