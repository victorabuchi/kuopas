import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import styles from './chat.module.css';
import { db } from '../../../../prisma/db';
import { sendMessageAction } from '../../../actions';
import { getSession } from '../../../../lib/session';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import { displayNameFor } from '../../../../lib/names';
import { getLiving } from '../../../../lib/living';
import { reportChatMessageAction } from '../../../../lib/household-actions';
import { blockUserAction } from '../../../../lib/safety-actions';
import { blockedByMe } from '../../../../lib/blocks';

export default async function ChatGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;

  const session = await getSession();
  if (!session) redirect('/login');

  const group = await db.orm.public.ChatGroup.where({ id: groupId }).include(
    'members',
    (members) => members.include('tenant', (t) => t),
  ).first();
  if (!group) notFound();

  const isMember = group.members.some((m) => m.tenant!.id === session.tenantId);
  if (!isMember) redirect('/home');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const h = getLiving(locale).household;

  const blocked = await blockedByMe(session.tenantId);
  const s = getLiving(locale).safety;

  const allMessages = await db.orm.public.Message.where({ chatGroupId: groupId })
    .include('sender', (s) => s)
    .include('reports', (r) => r)
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();
  const messages = allMessages.filter((m) => !blocked.has(m.sender!.id));

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/chats" className={styles.back} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className={styles.topBarText}>
          <span className={styles.topBarTitle}>{group.name}</span>
          <span className={styles.topBarSubtitle}>
            {group.members.length} {dict.groups.members}
          </span>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>{dict.chatThread.noMessagesSayHello}</p>}
        {messages.map((message) => {
          const isOwn = message.sender!.id === session.tenantId;
          return (
            <div key={message.id} className={`${styles.row} ${isOwn ? styles.rowOut : styles.rowIn}`}>
              {!isOwn && (
                <span className={styles.senderName}>
                  {displayNameFor(message.sender!, group.scope)}
                </span>
              )}
              <div className={`${styles.bubble} ${isOwn ? styles.bubbleOut : styles.bubbleIn}`}>
                {message.removedAt ? <em>{h.removedMessage}</em> : <span>{message.content}</span>}
                <span className={styles.time}>
                  {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {!isOwn && (
                <form action={blockUserAction}>
                  <input type="hidden" name="blockedId" value={message.sender!.id} />
                  <input type="hidden" name="returnTo" value={`/chat/${groupId}`} />
                  <button type="submit" className={styles.reportBtn}>
                    {s.block}
                  </button>
                </form>
              )}
              {!isOwn && !message.removedAt && (
                <form action={reportChatMessageAction}>
                  <input type="hidden" name="messageId" value={message.id} />
                  {message.reports.some((r) => r.reporterId === session.tenantId) ? (
                    <span className={styles.reportBtn}>{h.reported}</span>
                  ) : (
                    <button type="submit" className={styles.reportBtn}>
                      {h.report}
                    </button>
                  )}
                </form>
              )}
            </div>
          );
        })}
      </div>

      <form action={sendMessageAction} className={styles.composer}>
        <input type="hidden" name="chatGroupId" value={group.id} />
        <input
          type="text"
          name="content"
          placeholder={dict.chatThread.placeholder}
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
