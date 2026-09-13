import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './home.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';

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

type FeedItem =
  | { kind: 'message'; at: string; id: string; groupId: string; groupName: string; senderName: string; content: string }
  | { kind: 'news'; at: string; id: string; title: string; summary: string; sourceUrl: string };

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('memberships', (memberships) => memberships.include('chatGroup', (g) => g))
    .first();
  if (!tenant) redirect('/login');

  const groupIds = tenant.memberships.map((m) => m.chatGroup!.id);

  const [messages, news] = await Promise.all([
    groupIds.length === 0
      ? []
      : db.orm.public.Message.where((m) => m.chatGroupId.in(groupIds))
          .include('sender', (s) => s)
          .include('chatGroup', (g) => g)
          .orderBy((m) => m.sentAt.desc())
          .limit(30)
          .all(),
    db.orm.public.NewsPost.orderBy((n) => n.publishedAt.desc()).limit(10).all(),
  ]);

  const feed: FeedItem[] = [
    ...messages.map(
      (message): FeedItem => ({
        kind: 'message',
        at: message.sentAt,
        id: message.id,
        groupId: message.chatGroup!.id,
        groupName: message.chatGroup!.name,
        senderName: message.sender!.name,
        content: message.content,
      }),
    ),
    ...news.map(
      (post): FeedItem => ({
        kind: 'news',
        at: post.publishedAt,
        id: post.id,
        title: post.title,
        summary: post.summary,
        sourceUrl: post.sourceUrl,
      }),
    ),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className={styles.page}>
      <TopBar title="Feed" />

      <div className={styles.feed}>
        {feed.length === 0 && <div className={styles.empty}>No activity yet.</div>}
        {feed.map((item) =>
          item.kind === 'message' ? (
            <Link key={`m-${item.id}`} href={`/chat/${item.groupId}`} className={styles.post}>
              <div className={styles.postHeader}>
                <div className={styles.postAvatar}>{initials(item.senderName)}</div>
                <div className={styles.postHeaderText}>
                  <span className={styles.postSender}>{item.senderName}</span>
                  <span className={styles.postMeta}>
                    {item.groupName} &middot; {new Date(item.at).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className={styles.postContent}>{item.content}</p>
            </Link>
          ) : (
            <a key={`n-${item.id}`} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.post}>
              <div className={styles.postHeader}>
                <div className={styles.newsBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                    <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5.5" />
                  </svg>
                </div>
                <div className={styles.postHeaderText}>
                  <span className={styles.postSender}>Kuopas News</span>
                  <span className={styles.postMeta}>{new Date(item.at).toLocaleDateString()}</span>
                </div>
              </div>
              <p className={styles.newsTitle}>{item.title}</p>
              <p className={styles.postContent}>{item.summary}</p>
              <span className={styles.newsLink}>Read the full article on kuopas.fi</span>
            </a>
          ),
        )}
      </div>
    </div>
  );
}
