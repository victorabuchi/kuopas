import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../chat/[groupId]/chat.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { replyToNoticeAction } from '../../../lib/direct-notice-actions';

export const metadata: Metadata = {
  title: 'Notices - Kuopas',
};

export default async function NoticesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.notices;

  const thread = await db.orm.public.DirectNoticeThread.where({ tenantId: session.tenantId }).first();
  const messages = thread
    ? await db.orm.public.DirectNoticeMessage.where({ threadId: thread.id })
        .orderBy((m) => m.sentAt.asc())
        .limit(200)
        .all()
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.topBarText}>
          <span className={styles.topBarTitle}>{t.fromKuopas}</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <Link href="/feed?tab=announcements" className={styles.tab}>
          {dict.feedBoard.tabAnnouncements}
        </Link>
        <Link href="/feed?tab=noticeboard" className={styles.tab}>
          {dict.feedBoard.tabNoticeboard}
        </Link>
        <Link href="/complaints" className={styles.tab}>
          {dict.nav.complaints}
        </Link>
        <Link href="/support" className={styles.tab}>
          {dict.nav.support}
        </Link>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>{t.noMessagesYet}</p>}
        {messages.map((message) => {
          const isOwn = Boolean(message.senderTenantId);
          return (
            <div key={message.id} className={`${styles.row} ${isOwn ? styles.rowOut : styles.rowIn}`}>
              {!isOwn && <span className={styles.senderName}>{t.fromKuopas}</span>}
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

      <form action={replyToNoticeAction} className={styles.composer}>
        <input
          type="text"
          name="content"
          placeholder={t.placeholder}
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
