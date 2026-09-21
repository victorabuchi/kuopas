import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import chatStyles from '../chat/[groupId]/chat.module.css';
import feedStyles from '../feed/feed.module.css';
import complaintsStyles from '../complaints/complaints.module.css';
import supportStyles from '../support/support.module.css';
import messagesStyles from './messages.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { displayNameFor } from '../../../lib/names';
import { getLiving } from '../../../lib/living';
import { replyToNoticeAction } from '../../../lib/direct-notice-actions';
import { submitComplaintAction } from '../../../lib/complaint-actions';
import { startConversationAction } from '../../../lib/direct-message-actions';
import { otherMemberId } from '../../../lib/direct-messages';
import {
  createNoticeboardPostAction,
  commentOnPostAction,
  reactToPostAction,
  reportPostAction,
} from '../../../lib/building-post-actions';
import MarkPostsRead from '../feed/MarkPostsRead';
import { blockUserAction } from '../../../lib/safety-actions';
import { blockedByMe } from '../../../lib/blocks';

export const metadata: Metadata = {
  title: 'Messages - Kuopas',
};

const TAB_VALUES = ['chat', 'announcements', 'noticeboard', 'complaints', 'support', 'direct'] as const;
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

export default async function MessagesPage({
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
    direct: dict.messages.title,
  };

  return (
    <div className={chatStyles.page}>
      <div className={chatStyles.topBar}>
        <div className={chatStyles.topBarText}>
          <span className={chatStyles.topBarTitle}>{titleByTab[tab]}</span>
        </div>
      </div>

      <div className={chatStyles.tabs}>
        <Link
          href="/messages?tab=chat"
          className={`${chatStyles.tab} ${tab === 'chat' ? chatStyles.tabActive : ''}`}
        >
          {t.fromKuopas}
        </Link>
        <Link
          href="/messages?tab=announcements"
          className={`${chatStyles.tab} ${tab === 'announcements' ? chatStyles.tabActive : ''}`}
        >
          {dict.feedBoard.tabAnnouncements}
        </Link>
        <Link
          href="/messages?tab=noticeboard"
          className={`${chatStyles.tab} ${tab === 'noticeboard' ? chatStyles.tabActive : ''}`}
        >
          {dict.feedBoard.tabNoticeboard}
        </Link>
        <Link
          href="/messages?tab=complaints"
          className={`${chatStyles.tab} ${tab === 'complaints' ? chatStyles.tabActive : ''}`}
        >
          {dict.nav.complaints}
        </Link>
        <Link
          href="/messages?tab=support"
          className={`${chatStyles.tab} ${tab === 'support' ? chatStyles.tabActive : ''}`}
        >
          {dict.nav.support}
        </Link>
        <Link
          href="/messages?tab=direct"
          className={`${chatStyles.tab} ${tab === 'direct' ? chatStyles.tabActive : ''}`}
        >
          {dict.messages.directTab}
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'chat' && <ChatTab tenantId={session.tenantId} t={t} />}
        {(tab === 'announcements' || tab === 'noticeboard') && (
          <FeedTab tenantId={session.tenantId} locale={locale} dict={dict} tab={tab} />
        )}
        {tab === 'complaints' && <ComplaintsTab tenantId={session.tenantId} dict={dict} locale={locale} />}
        {tab === 'support' && <SupportTab dict={dict} />}
        {tab === 'direct' && <DirectTab tenantId={session.tenantId} dict={dict} />}
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
  const blocked = await blockedByMe(tenantId);
  const blockLabel = getLiving(locale).safety.block;
  const allPosts = await db.orm.public.BuildingPost.where({ buildingId: stairwell.buildingId, type: postType })
    .include('authorTenant', (a) => a)
    .include('authorStaff', (a) => a)
    .include('comments', (c) => c.include('author', (a) => a).orderBy((cm) => cm.createdAt.asc()))
    .include('reactions', (r) => r)
    .orderBy((p) => p.createdAt.desc())
    .limit(50)
    .all();
  // Posts and comments from people you blocked are hidden.
  const posts = allPosts
    .filter((p) => !p.authorTenantId || !blocked.has(p.authorTenantId))
    .map((p) => ({ ...p, comments: p.comments.filter((c) => !blocked.has(c.authorId)) }));

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
                  <form action={blockUserAction}>
                    <input type="hidden" name="blockedId" value={post.authorTenant.id} />
                    <input type="hidden" name="returnTo" value="/messages?tab=noticeboard" />
                    <button type="submit" className={feedStyles.postAction}>
                      {blockLabel}
                    </button>
                  </form>
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
                            <form action={blockUserAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="blockedId" value={comment.authorId} />
                              <input type="hidden" name="returnTo" value="/messages?tab=noticeboard" />
                              <button type="submit" className={feedStyles.commentReport}>
                                {blockLabel}
                              </button>
                            </form>
                          )}
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

async function ComplaintsTab({ tenantId, dict, locale }: { tenantId: string; dict: ReturnType<typeof getDictionary>; locale: 'en' | 'fi' }) {
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
        <label style={{ fontSize: 13, color: '#767676' }} htmlFor="video">
          {getLiving(locale).maintenance.videoLabel}
        </label>
        <input id="video" type="file" name="video" accept="video/mp4,video/quicktime,video/webm" />
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

async function DirectTab({ tenantId, dict }: { tenantId: string; dict: ReturnType<typeof getDictionary> }) {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .first();
  if (!tenant) redirect('/login');

  const building = tenant.unit!.stairwell!.building!;

  const conversations = await db.orm.public.DirectConversation.where((c) => c.memberAId.eq(tenantId)).all();
  const conversationsB = await db.orm.public.DirectConversation.where((c) => c.memberBId.eq(tenantId)).all();
  const allConversations = [...conversations, ...conversationsB];

  const otherIds = allConversations.map((c) => otherMemberId(c, tenantId));
  const others = otherIds.length === 0 ? [] : await db.orm.public.Tenant.where((t) => t.id.in(otherIds)).all();
  const otherById = new Map(others.map((t) => [t.id, t]));

  const conversationRows = await Promise.all(
    allConversations.map(async (c) => {
      const otherId = otherMemberId(c, tenantId);
      const lastMessage = await db.orm.public.DirectMessage.where({ conversationId: c.id })
        .orderBy((m) => m.sentAt.desc())
        .first();
      return { conversation: c, other: otherById.get(otherId), lastMessage };
    }),
  );
  conversationRows.sort((a, b) => {
    const at = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : 0;
    return bt - at;
  });

  const allBuildingTenants = await db.orm.public.Tenant.include('unit', (unit) => unit.include('stairwell', (s) => s))
    .all();
  const sameBuildingTenants = allBuildingTenants.filter(
    (t) => t.id !== tenantId && t.unit?.stairwell?.buildingId === building.id,
  );
  const alreadyMessaging = new Set(otherIds);
  const newContacts = sameBuildingTenants.filter((t) => !alreadyMessaging.has(t.id));

  return (
    <div className={messagesStyles.page}>
      <div className={messagesStyles.sectionHeading}>{dict.messages.conversations}</div>
      {conversationRows.length === 0 ? (
        <div className={messagesStyles.empty}>{dict.messages.noneYet}</div>
      ) : (
        <div className={messagesStyles.chatList}>
          {conversationRows.map(({ conversation, other, lastMessage }) =>
            other ? (
              <Link key={conversation.id} href={`/messages/${conversation.id}`} className={messagesStyles.chatRow}>
                <div className={messagesStyles.chatAvatar}>{initials(other.name)}</div>
                <div className={messagesStyles.chatRowText}>
                  <div className={messagesStyles.chatRowTop}>
                    <span className={messagesStyles.chatRowName}>{other.name}</span>
                    {lastMessage && (
                      <span className={messagesStyles.chatRowTime}>
                        {new Date(lastMessage.sentAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span className={messagesStyles.chatRowPreview}>
                    {lastMessage ? lastMessage.content : dict.chats.noMessagesYet}
                  </span>
                </div>
              </Link>
            ) : null,
          )}
        </div>
      )}

      <div className={messagesStyles.sectionHeading}>{dict.messages.startNew}</div>
      {newContacts.length === 0 ? (
        <div className={messagesStyles.empty}>
          {dict.messages.everyone} {building.name}.
        </div>
      ) : (
        <div className={messagesStyles.peopleList}>
          {newContacts.map((t) => (
            <form key={t.id} action={startConversationAction}>
              <input type="hidden" name="otherTenantId" value={t.id} />
              <button type="submit" className={messagesStyles.personButton}>
                {t.name}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
