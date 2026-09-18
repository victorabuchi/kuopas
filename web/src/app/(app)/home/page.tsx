import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './home.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import MoveInGuideOverlay from '../MoveInGuideOverlay';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

export const metadata: Metadata = {
  title: 'Feed - Kuopas',
};

const TAB_VALUES = ['news', 'updates', 'promotions', 'discounts', 'events'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: TabValue = rawTab && isTabValue(rawTab) ? rawTab : 'news';

  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const tabs = [
    { value: 'news' as const, label: dict.home.tabNews },
    { value: 'updates' as const, label: dict.home.tabUpdates },
    { value: 'promotions' as const, label: dict.home.tabPromotions },
    { value: 'discounts' as const, label: dict.home.tabDiscounts },
    { value: 'events' as const, label: dict.home.tabEvents },
  ];

  const posts = await db.orm.public.NewsPost.where({ category: tab })
    .orderBy((n) => n.publishedAt.desc())
    .limit(30)
    .all();

  return (
    <div className={styles.page}>
      {!tenant.hasSeenMoveInGuide && <MoveInGuideOverlay tenantId={tenant.id} dict={dict} />}
      <TopBar title={dict.home.title} />

      <div className={styles.tabs}>
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/home?tab=${t.value}`}
            className={`${styles.tab} ${tab === t.value ? styles.tabActive : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className={styles.feed}>
        {posts.length === 0 && (
          <div className={styles.empty}>
            {dict.home.emptyPrefix} {tabs.find((t) => t.value === tab)?.label.toLowerCase()} {dict.home.emptySuffix}
          </div>
        )}
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.post}
          >
            <div className={styles.postHeader}>
              <div className={styles.newsBadge}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                  <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5.5" />
                </svg>
              </div>
              <div className={styles.postHeaderText}>
                <span className={styles.postSender}>{dict.home.kuopasNews}</span>
                <span className={styles.postMeta}>{new Date(post.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <p className={styles.newsTitle}>{post.title}</p>
            <p className={styles.postContent}>{post.summary}</p>
            <span className={styles.newsLink}>{dict.home.readFullArticle}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
