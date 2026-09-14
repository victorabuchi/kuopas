import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './feed.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { displayNameFor } from '../../../lib/names';
import {
  createNoticeboardPostAction,
  commentOnPostAction,
  reactToPostAction,
  reportPostAction,
} from '../../../lib/building-post-actions';
import MarkPostsRead from './MarkPostsRead';

export const metadata: Metadata = {
  title: 'Noticeboard - Kuopas',
};

const TAB_VALUES = ['announcements', 'noticeboard'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue);
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: TabValue = rawTab && isTabValue(rawTab) ? rawTab : 'announcements';

  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.feedBoard;

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');
  const unit = await db.orm.public.Unit.where({ id: tenant.unitId }).first();
  if (!unit) redirect('/login');
  const stairwell = await db.orm.public.Stairwell.where({ id: unit.stairwellId }).first();
  if (!stairwell) redirect('/login');

  const postType = tab === 'announcements' ? 'announcement' : 'noticeboard';
  const posts = await db.orm.public.BuildingPost.where({ buildingId: stairwell.buildingId, type: postType })
    .include('authorTenant', (a) => a)
    .include('authorStaff', (a) => a)
    .include('comments', (c) => c.include('author', (a) => a).orderBy((cm) => cm.createdAt.asc()))
    .include('reactions', (r) => r)
    .orderBy((p) => p.createdAt.desc())
    .limit(50)
    .all();

  const categoryLabel: Record<string, string> = {
    furniture: t.categoryFurniture,
    lost_found: t.categoryLostFound,
    borrow: t.categoryBorrow,
    giveaway: t.categoryGiveaway,
    other: t.categoryOther,
  };

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />

      <div className={styles.tabs}>
        <Link
          href="/feed?tab=announcements"
          className={`${styles.tab} ${tab === 'announcements' ? styles.tabActive : ''}`}
        >
          {t.tabAnnouncements}
        </Link>
        <Link
          href="/feed?tab=noticeboard"
          className={`${styles.tab} ${tab === 'noticeboard' ? styles.tabActive : ''}`}
        >
          {t.tabNoticeboard}
        </Link>
      </div>

      {tab === 'noticeboard' && (
        <form action={createNoticeboardPostAction} className={styles.composer}>
          <div className={styles.composerRow}>
            <input type="text" name="title" placeholder={t.postTitle} required />
            <select name="category" defaultValue="furniture">
              <option value="furniture">{t.categoryFurniture}</option>
              <option value="lost_found">{t.categoryLostFound}</option>
              <option value="borrow">{t.categoryBorrow}</option>
              <option value="giveaway">{t.categoryGiveaway}</option>
              <option value="other">{t.categoryOther}</option>
            </select>
          </div>
          <textarea name="content" placeholder={t.postContent} required />
          <input type="file" name="photo" accept="image/*" />
          <button type="submit" className={styles.submit}>
            {t.submit}
          </button>
        </form>
      )}

      {tab === 'announcements' && <MarkPostsRead postIds={posts.map((p) => p.id)} />}

      <div className={styles.feed}>
        {posts.length === 0 && (
          <div className={styles.empty}>{tab === 'announcements' ? t.noAnnouncementsYet : t.noNoticeboardYet}</div>
        )}
        {posts.map((post) => {
          const senderName = post.authorStaff ? t.kuopas : displayNameFor(post.authorTenant!, 'building');
          const reacted = post.reactions.some((r) => r.tenantId === session.tenantId);
          const title = locale === 'en' && post.titleEn ? post.titleEn : post.title;
          const content = locale === 'en' && post.contentEn ? post.contentEn : post.content;
          return (
            <article key={post.id} className={styles.post}>
              <div className={styles.postHeader}>
                <div className={`${styles.postAvatar} ${post.authorStaff ? '' : styles.postAvatarNoticeboard}`}>
                  {initials(senderName)}
                </div>
                <div className={styles.postHeaderText}>
                  <span className={styles.postSender}>{senderName}</span>
                  <span className={styles.postMeta}>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <p className={styles.postTitle}>{title}</p>
              <p className={styles.postContent}>{content}</p>
              {post.photoUrl && <img src={post.photoUrl} alt="" className={styles.postPhoto} />}
              {post.noticeboardCategory && (
                <span className={styles.categoryBadge}>{categoryLabel[post.noticeboardCategory]}</span>
              )}

              <div className={styles.postActions}>
                <form action={reactToPostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button
                    type="submit"
                    className={`${styles.postAction} ${reacted ? styles.postActionActive : ''}`}
                  >
                    👍 {post.reactions.length}
                  </button>
                </form>
                {post.type === 'announcement' && (
                  <span className={styles.reactionsOnlyNote}>{t.reactionsOnly}</span>
                )}
                {post.authorTenant && post.authorTenant.id !== session.tenantId && (
                  <form action={reportPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className={styles.postAction}>
                      {t.report}
                    </button>
                  </form>
                )}
              </div>

              {post.type === 'noticeboard' && (
                <>
                  {post.comments.length > 0 && (
                    <div className={styles.commentsPreview}>
                      {post.comments.slice(-3).map((comment) => (
                        <div key={comment.id} className={styles.comment}>
                          <span className={styles.commentAuthor}>
                            {displayNameFor(comment.author!, 'building')}
                          </span>
                          {comment.content}
                          {comment.authorId !== session.tenantId && (
                            <form action={reportPostAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="commentId" value={comment.id} />
                              <button type="submit" className={styles.commentReport}>
                                {t.reportComment}
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <form action={commentOnPostAction} className={styles.commentForm}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="text" name="content" placeholder={t.commentPlaceholder} required />
                    <button type="submit" className={styles.commentSubmit}>
                      {t.reply}
                    </button>
                  </form>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
