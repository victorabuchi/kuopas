import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import styles from '../../chat/[groupId]/chat.module.css';
import { db } from '../../../../prisma/db';
import { sendDirectMessageAction } from '../../../../lib/direct-message-actions';
import { getSession } from '../../../../lib/session';
import { otherMemberId } from '../../../../lib/direct-messages';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import { getLiving } from '../../../../lib/living';
import { blockUserAction, reportContentAction, unblockUserAction } from '../../../../lib/safety-actions';
import { blockedByMe, blockedEitherWay } from '../../../../lib/blocks';

export default async function DirectMessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ reported?: string }>;
}) {
  const { conversationId } = await params;
  const { reported } = await searchParams;

  const session = await getSession();
  if (!session) redirect('/login');

  const conversation = await db.orm.public.DirectConversation.where({ id: conversationId }).first();
  if (!conversation) notFound();

  const isMember = conversation.memberAId === session.tenantId || conversation.memberBId === session.tenantId;
  if (!isMember) redirect('/messages');

  const otherId = otherMemberId(conversation, session.tenantId);
  const other = await db.orm.public.Tenant.where({ id: otherId }).first();
  if (!other) notFound();

  const iBlocked = (await blockedByMe(session.tenantId)).has(otherId);
  const blockedAny = await blockedEitherWay(session.tenantId, otherId);
  const allMessages = await db.orm.public.DirectMessage.where({ conversationId })
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const s = getLiving(locale).safety;
  const messages = iBlocked ? [] : allMessages;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/messages?tab=direct" className={styles.back} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className={styles.topBarText}>
          <span className={styles.topBarTitle}>{other.name}</span>
        </div>
        <form action={iBlocked ? unblockUserAction : blockUserAction} style={{ marginLeft: 'auto' }}>
          <input type="hidden" name="blockedId" value={other.id} />
          <input type="hidden" name="returnTo" value={`/messages/${conversation.id}`} />
          <button type="submit" className={styles.reportBtn}>
            {iBlocked ? s.unblock : s.block}
          </button>
        </form>
      </div>

      <div className={styles.messages}>
        {reported === '1' && <p className={styles.empty}>{s.reportedNote}</p>}
        {blockedAny && <p className={styles.empty}>{iBlocked ? s.blockedBanner : s.cannotMessage}</p>}
        {messages.length === 0 && !blockedAny && <p className={styles.empty}>{dict.messages.noMessagesSayHello}</p>}
        {messages.map((message) => {
          const isOwn = message.senderId === session.tenantId;
          return (
            <div key={message.id} className={`${styles.row} ${isOwn ? styles.rowOut : styles.rowIn}`}>
              <div className={`${styles.bubble} ${isOwn ? styles.bubbleOut : styles.bubbleIn}`}>
                {message.removedAt ? <em>{s.removed}</em> : <span>{message.content}</span>}
                <span className={styles.time}>
                  {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {!isOwn && !message.removedAt && (
                <form action={reportContentAction}>
                  <input type="hidden" name="kind" value="direct" />
                  <input type="hidden" name="messageId" value={message.id} />
                  <input type="hidden" name="returnTo" value={`/messages/${conversation.id}`} />
                  <button type="submit" className={styles.reportBtn}>
                    {s.report}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {!blockedAny && (
      <form action={sendDirectMessageAction} className={styles.composer}>
        <input type="hidden" name="conversationId" value={conversation.id} />
        <input
          type="text"
          name="content"
          placeholder={dict.messages.placeholder}
          required
          autoComplete="off"
          className={styles.composerInput}
        />
        <button type="submit" className={styles.send} aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 14-7-7 14-2-6z" />
          </svg>
        </button>
      </form>
      )}
    </div>
  );
}
