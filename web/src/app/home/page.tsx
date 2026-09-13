import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Mulish } from 'next/font/google';
import styles from './home.module.css';
import { getSession } from '../../lib/session';
import { logoutAction } from '../../lib/auth-actions';
import { db } from '../../prisma/db';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Home - Kuopas',
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
          .limit(50)
          .all();

  const lastMessageByGroup = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    const groupId = message.chatGroup!.id;
    if (!lastMessageByGroup.has(groupId)) lastMessageByGroup.set(groupId, message);
  }

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <div className={styles.topBar}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Kuopas
        </div>
        <form action={logoutAction} className={styles.logoutForm}>
          <button type="submit">Log out</button>
        </form>
      </div>

      <div className={styles.content}>
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
                    {last ? `${last.sender!.name}: ${last.content}` : 'No messages yet'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className={styles.feedHeading}>Recent activity</div>
        <div className={styles.feed}>
          {messages.length === 0 && (
            <div className={styles.empty}>No messages yet. Say hello in one of your chats above.</div>
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
    </div>
  );
}
