import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import styles from '../../chat/[groupId]/chat.module.css';
import { db } from '../../../../prisma/db';
import { sendDirectMessageAction } from '../../../../lib/direct-message-actions';
import { getSession } from '../../../../lib/session';
import { otherMemberId } from '../../../../lib/direct-messages';

export default async function DirectMessageThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  const session = await getSession();
  if (!session) redirect('/login');

  const conversation = await db.orm.public.DirectConversation.where({ id: conversationId }).first();
  if (!conversation) notFound();

  const isMember = conversation.memberAId === session.tenantId || conversation.memberBId === session.tenantId;
  if (!isMember) redirect('/messages');

  const otherId = otherMemberId(conversation, session.tenantId);
  const other = await db.orm.public.Tenant.where({ id: otherId }).first();
  if (!other) notFound();

  const messages = await db.orm.public.DirectMessage.where({ conversationId })
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/messages" className={styles.back} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className={styles.topBarText}>
          <span className={styles.topBarTitle}>{other.name}</span>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>No messages yet. Say hello.</p>}
        {messages.map((message) => {
          const isOwn = message.senderId === session.tenantId;
          return (
            <div key={message.id} className={`${styles.row} ${isOwn ? styles.rowOut : styles.rowIn}`}>
              <div className={`${styles.bubble} ${isOwn ? styles.bubbleOut : styles.bubbleIn}`}>
                <span>{message.content}</span>
                <span className={styles.time}>
                  {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendDirectMessageAction} className={styles.composer}>
        <input type="hidden" name="conversationId" value={conversation.id} />
        <input
          type="text"
          name="content"
          placeholder="Message"
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
    </div>
  );
}
