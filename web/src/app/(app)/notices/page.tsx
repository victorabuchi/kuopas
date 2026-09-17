import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import chatStyles from '../chat/[groupId]/chat.module.css';
import feedStyles from '../feed/feed.module.css';
import complaintsStyles from '../complaints/complaints.module.css';
import supportStyles from '../support/support.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { displayNameFor } from '../../../lib/names';
import { replyToNoticeAction } from '../../../lib/direct-notice-actions';
import { submitComplaintAction } from '../../../lib/complaint-actions';
import {
  createNoticeboardPostAction,
  commentOnPostAction,
  reactToPostAction,
  reportPostAction,
} from '../../../lib/building-post-actions';
import MarkPostsRead from '../feed/MarkPostsRead';

export const metadata: Metadata = {
  title: 'Kuopas - Kuopas',
};

const TAB_VALUES = ['chat', 'announcements', 'noticeboard', 'complaints', 'support'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string): value is TabValue {
  return (TAB_VALUES as readonly string[]).includes(value);
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { tab: rawTab } = await searchParams;
  const tab: TabValue = rawTab && isTabValue(rawTab) ? rawTab : 'chat';

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.notices;

  const titleByTab: Record<TabValue, string> = {
    chat: t.fromKuopas,
    announcements: dict.feedBoard.title,
    noticeboard: dict.feedBoard.title,
    complaints: dict.complaints.title,
    support: dict.support.title,
  };

  return (
    <div className={chatStyles.page}>
      <div className={chatStyles.topBar}>
        <div className={chatStyles.topBarText}>
          <span className={chatStyles.topBarTitle}>{titleByTab[tab]}</span>
        </div>
      </div>

      <div className={chatStyles.tabs}>
        <Link href="/notices?tab=chat" className={`${chatStyles.tab} ${tab === 'chat' ? chatStyles.tabActive : ''}`}>
          {t.fromKuopas}
        </Link>
        <Link
          href="/notices?tab=announcements"
          className={`${chatStyles.tab} ${tab === 'announcements' ? chatStyles.tabActive : ''}`}
        >
          {dict.feedBoard.tabAnnouncements}
        </Link>
        <Link
          href="/notices?tab=noticeboard"
          className={`${chatStyles.tab} ${tab === 'noticeboard' ? chatStyles.tabActive : ''}`}
        >
          {dict.feedBoard.tabNoticeboard}
        </Link>
        <Link
          href="/notices?tab=complaints"
          className={`${chatStyles.tab} ${tab === 'complaints' ? chatStyles.tabActive : ''}`}
        >
          {dict.nav.complaints}
        </Link>
        <Link
          href="/notices?tab=support"
          className={`${chatStyles.tab} ${tab === 'support' ? chatStyles.tabActive : ''}`}
        >
          {dict.nav.support}
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'chat' && <ChatTab tenantId={session.tenantId} t={t} />}
        {(tab === 'announcements' || tab === 'noticeboard') && (
          <FeedTab tenantId={session.tenantId} locale={locale} dict={dict} tab={tab} />
        )}
        {tab === 'complaints' && <ComplaintsTab tenantId={session.tenantId} dict={dict} />}
        {tab === 'support' && <SupportTab dict={dict} />}
      </div>
    </div>
  );
}

async function ChatTab({ tenantId, t }: { tenantId: string; t: ReturnType<typeof getDictionary>['notices'] }) {
  const thread = await db.orm.public.DirectNoticeThread.where({ tenantId }).first();
  const messages = thread
    ? await db.orm.public.DirectNoticeMessage.where({ threadId: thread.id })
        .orderBy((m) => m.sentAt.asc())
        .limit(200)
        .all()
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={chatStyles.messages}>
        {messages.length === 0 && <p className={chatStyles.empty}>{t.noMessagesYet}</p>}
        {messages.map((message) => {
          const isOwn = Boolean(message.senderTenantId);
          return (
            <div key={message.id} className={`${chatStyles.row} ${isOwn ? chatStyles.rowOut : chatStyles.rowIn}`}>
              {!isOwn && <span className={chatStyles.senderName}>{t.fromKuopas}</span>}
              <div className={`${chatStyles.bubble} ${isOwn ? chatStyles.bubbleOut : chatStyles.bubbleIn}`}>
                <span>{message.content}</span>
                <span className={chatStyles.time}>
                  {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form action={replyToNoticeAction} className={chatStyles.composer}>
        <input
          type="text"
          name="content"
          placeholder={t.placeholder}
          required
          autoComplete="off"
          className={chatStyles.composerInput}
        />
        <button type="submit" className={chatStyles.send} aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 14-7-7 14-2-6z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

async function FeedTab({
  tenantId,
  locale,
  dict,
  tab,
}: {
  tenantId: string;
  locale: 'en' | 'fi';
  dict: ReturnType<typeof getDictionary>;
  tab: 'announcements' | 'noticeboard';
}) {
  const t = dict.feedBoard;

  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
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
    <div className={feedStyles.page}>
      {tab === 'noticeboard' && (
        <form action={createNoticeboardPostAction} className={feedStyles.composer}>
          <div className={feedStyles.composerRow}>
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
          <button type="submit" className={feedStyles.submit}>
            {t.submit}
          </button>
        </form>
      )}

      {tab === 'announcements' && <MarkPostsRead postIds={posts.map((p) => p.id)} />}

      <div className={feedStyles.feed}>
        {posts.length === 0 && (
          <div className={feedStyles.empty}>{tab === 'announcements' ? t.noAnnouncementsYet : t.noNoticeboardYet}</div>
        )}
        {posts.map((post) => {
          const senderName = post.authorStaff ? t.kuopas : displayNameFor(post.authorTenant!, 'building');
          const reacted = post.reactions.some((r) => r.tenantId === tenantId);
          const title = locale === 'en' && post.titleEn ? post.titleEn : post.title;
          const content = locale === 'en' && post.contentEn ? post.contentEn : post.content;
          return (
            <article key={post.id} className={feedStyles.post}>
              <div className={feedStyles.postHeader}>
                <div className={`${feedStyles.postAvatar} ${post.authorStaff ? '' : feedStyles.postAvatarNoticeboard}`}>
                  {initials(senderName)}
                </div>
                <div className={feedStyles.postHeaderText}>
                  <span className={feedStyles.postSender}>{senderName}</span>
                  <span className={feedStyles.postMeta}>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <p className={feedStyles.postTitle}>{title}</p>
              <p className={feedStyles.postContent}>{content}</p>
              {post.photoUrl && <img src={post.photoUrl} alt="" className={feedStyles.postPhoto} />}
              {post.noticeboardCategory && (
                <span className={feedStyles.categoryBadge}>{categoryLabel[post.noticeboardCategory]}</span>
              )}

              <div className={feedStyles.postActions}>
                <form action={reactToPostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button
                    type="submit"
                    className={`${feedStyles.postAction} ${reacted ? feedStyles.postActionActive : ''}`}
                  >
                    👍 {post.reactions.length}
                  </button>
                </form>
                {post.type === 'announcement' && (
                  <span className={feedStyles.reactionsOnlyNote}>{t.reactionsOnly}</span>
                )}
                {post.authorTenant && post.authorTenant.id !== tenantId && (
                  <form action={reportPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className={feedStyles.postAction}>
                      {t.report}
                    </button>
                  </form>
                )}
              </div>

              {post.type === 'noticeboard' && (
                <>
                  {post.comments.length > 0 && (
                    <div className={feedStyles.commentsPreview}>
                      {post.comments.slice(-3).map((comment) => (
                        <div key={comment.id} className={feedStyles.comment}>
                          <span className={feedStyles.commentAuthor}>
                            {displayNameFor(comment.author!, 'building')}
                          </span>
                          {comment.content}
                          {comment.authorId !== tenantId && (
                            <form action={reportPostAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="commentId" value={comment.id} />
                              <button type="submit" className={feedStyles.commentReport}>
                                {t.reportComment}
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <form action={commentOnPostAction} className={feedStyles.commentForm}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="text" name="content" placeholder={t.commentPlaceholder} required />
                    <button type="submit" className={feedStyles.commentSubmit}>
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

async function ComplaintsTab({ tenantId, dict }: { tenantId: string; dict: ReturnType<typeof getDictionary> }) {
  const t = dict.complaints;

  const RESIDENT_STATUS: Record<string, { label: string; style: string }> = {
    new: { label: t.statusSent, style: complaintsStyles.statusSent },
    in_progress: { label: t.statusAcknowledged, style: complaintsStyles.statusAcknowledged },
    resolved: { label: t.statusResolved, style: complaintsStyles.statusResolved },
  };

  const complaints = await db.orm.public.Complaint.where({ tenantId })
    .orderBy((c) => c.createdAt.desc())
    .limit(50)
    .all();

  const categoryLabel: Record<string, string> = {
    plumbing: t.categoryPlumbing,
    electrical: t.categoryElectrical,
    heating: t.categoryHeating,
    appliance: t.categoryAppliance,
    pest: t.categoryPest,
    noise: t.categoryNoise,
    structural: t.categoryStructural,
    other: t.categoryOther,
  };

  return (
    <div className={complaintsStyles.page}>
      <form action={submitComplaintAction} className={complaintsStyles.composer}>
        <h2>{t.newComplaint}</h2>
        <select name="category" defaultValue="other">
          <option value="plumbing">{t.categoryPlumbing}</option>
          <option value="electrical">{t.categoryElectrical}</option>
          <option value="heating">{t.categoryHeating}</option>
          <option value="appliance">{t.categoryAppliance}</option>
          <option value="pest">{t.categoryPest}</option>
          <option value="noise">{t.categoryNoise}</option>
          <option value="structural">{t.categoryStructural}</option>
          <option value="other">{t.categoryOther}</option>
        </select>
        <textarea name="description" placeholder={t.description} required />
        <input type="file" name="photo" accept="image/*" />
        <button type="submit" className={complaintsStyles.submit}>
          {t.submit}
        </button>
      </form>

      <div className={complaintsStyles.list}>
        <div className={complaintsStyles.listHeading}>{t.yourComplaints}</div>
        {complaints.length === 0 && <div className={complaintsStyles.empty}>{t.noneYet}</div>}
        {complaints.map((complaint) => {
          const status = RESIDENT_STATUS[complaint.status];
          return (
            <Link key={complaint.id} href={`/complaints/${complaint.id}`} className={complaintsStyles.row}>
              <div className={complaintsStyles.rowText}>
                <span className={complaintsStyles.rowCategory}>{categoryLabel[complaint.category]}</span>
                <span className={complaintsStyles.rowDescription}>{complaint.description}</span>
                <span className={complaintsStyles.rowMeta}>{new Date(complaint.createdAt).toLocaleDateString()}</span>
              </div>
              <span className={`${complaintsStyles.status} ${status.style}`}>{status.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SupportTab({ dict }: { dict: ReturnType<typeof getDictionary> }) {
  return (
    <div className={supportStyles.page}>
      <div className={supportStyles.content}>
        <div className={supportStyles.card}>
          <h2>{dict.support.customerService}</h2>
          <p className={supportStyles.hours}>{dict.support.hours}</p>
          <a className={supportStyles.contactRow} href="tel:+358207109740">
            <span className={supportStyles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5c0 8.284 6.716 15 15 15h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.76-.97l-4.13-1.03a1 1 0 0 0-1.05.36l-1.13 1.5a12.05 12.05 0 0 1-5.5-5.5l1.5-1.13a1 1 0 0 0 .36-1.05L9.25 3.76A1 1 0 0 0 8.28 3H5a1 1 0 0 0-1 1Z" />
              </svg>
            </span>
            +358 (0)20 710 9740
          </a>
          <a className={supportStyles.contactRow} href="mailto:customerservice@kuopas.fi">
            <span className={supportStyles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            customerservice@kuopas.fi
          </a>
          <div className={supportStyles.contactRow}>
            <span className={supportStyles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
            </span>
            Torikatu 15, 70110 Kuopio
          </div>
        </div>

        <div className={supportStyles.card}>
          <h2>{dict.support.maintenanceEmergency}</h2>
          <p className={supportStyles.hours}>{dict.support.maintenanceHours}</p>
          <a className={supportStyles.contactRow} href="tel:+358447640760">
            <span className={supportStyles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5c0 8.284 6.716 15 15 15h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.76-.97l-4.13-1.03a1 1 0 0 0-1.05.36l-1.13 1.5a12.05 12.05 0 0 1-5.5-5.5l1.5-1.13a1 1 0 0 0 .36-1.05L9.25 3.76A1 1 0 0 0 8.28 3H5a1 1 0 0 0-1 1Z" />
              </svg>
            </span>
            +358 (0)44 764 0760
          </a>
          <a className={supportStyles.contactRow} href="mailto:huolto@kuopas.fi">
            <span className={supportStyles.icon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            huolto@kuopas.fi
          </a>
        </div>
      </div>
    </div>
  );
}
