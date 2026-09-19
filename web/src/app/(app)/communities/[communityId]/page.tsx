import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import chatStyles from '../../chat/[groupId]/chat.module.css';
import styles from '../communities.module.css';
import { db } from '../../../../prisma/db';
import { getSession } from '../../../../lib/session';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import { displayNameFor } from '../../../../lib/names';
import {
  joinCommunityAction,
  leaveCommunityAction,
  sendCommunityMessageAction,
} from '../../../../lib/community-actions';

export default async function CommunityPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;

  const session = await getSession();
  if (!session) redirect('/login');

  const community = await db.orm.public.Community.where({ id: communityId })
    .include('members', (m) => m)
    .first();
  if (!community) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.communities;

  const isMember = community.members.some((m) => m.tenantId === session.tenantId);

  const messages = isMember
    ? await db.orm.public.CommunityMessage.where({ communityId })
        .include('sender', (s) => s)
        .orderBy((m) => m.sentAt.asc())
        .limit(200)
        .all()
    : [];

  return (
    <div className={chatStyles.page}>
      <div className={chatStyles.topBar}>
        <Link href="/communities" className={chatStyles.back} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className={chatStyles.topBarText}>
          <span className={chatStyles.topBarTitle}>{community.name}</span>
          <span className={chatStyles.topBarSubtitle}>
            {community.members.length} {t.members}
          </span>
        </div>
        {isMember && (
          <form action={leaveCommunityAction} style={{ marginLeft: 'auto' }}>
            <input type="hidden" name="communityId" value={community.id} />
            <button type="submit" className={styles.leaveBtn}>
              {t.leave}
            </button>
          </form>
        )}
      </div>

      {!isMember ? (
        <div className={styles.gate}>
          <div className={styles.gateName}>{community.name}</div>
          {community.description && <p className={styles.gateDesc}>{community.description}</p>}
          <p className={styles.gateNote}>{t.joinToChat}</p>
          <form action={joinCommunityAction}>
            <input type="hidden" name="communityId" value={community.id} />
            <button type="submit" className={styles.createBtn}>
              {t.join}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className={chatStyles.messages}>
            {community.description && <p className={chatStyles.empty}>{community.description}</p>}
            {messages.length === 0 && <p className={chatStyles.empty}>{t.noMessages}</p>}
            {messages.map((message) => {
              const isOwn = message.senderId === session.tenantId;
              return (
                <div key={message.id} className={`${chatStyles.row} ${isOwn ? chatStyles.rowOut : chatStyles.rowIn}`}>
                  {!isOwn && (
                    <span className={chatStyles.senderName}>{displayNameFor(message.sender!, 'building')}</span>
                  )}
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

          <form action={sendCommunityMessageAction} className={chatStyles.composer}>
            <input type="hidden" name="communityId" value={community.id} />
            <input
              type="text"
              name="content"
              placeholder={t.placeholder}
              required
              maxLength={2000}
              autoComplete="off"
              className={chatStyles.composerInput}
            />
            <button type="submit" className={chatStyles.send} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 14-7-7 14-2-6z" />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
