import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './messages.module.css';
import TopBar from '../TopBar';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import { startConversationAction } from '../../../lib/direct-message-actions';
import { otherMemberId } from '../../../lib/direct-messages';

export const metadata: Metadata = {
  title: 'Messages - Kuopas',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .first();
  if (!tenant) redirect('/login');

  const building = tenant.unit!.stairwell!.building!;

  const conversations = await db.orm.public.DirectConversation
    .where((c) => c.memberAId.eq(session.tenantId))
    .all();
  const conversationsB = await db.orm.public.DirectConversation
    .where((c) => c.memberBId.eq(session.tenantId))
    .all();
  const allConversations = [...conversations, ...conversationsB];

  const otherIds = allConversations.map((c) => otherMemberId(c, session.tenantId));
  const others =
    otherIds.length === 0 ? [] : await db.orm.public.Tenant.where((t) => t.id.in(otherIds)).all();
  const otherById = new Map(others.map((t) => [t.id, t]));

  const conversationRows = await Promise.all(
    allConversations.map(async (c) => {
      const otherId = otherMemberId(c, session.tenantId);
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
    (t) => t.id !== session.tenantId && t.unit!.stairwell!.buildingId === building.id,
  );
  const alreadyMessaging = new Set(otherIds);
  const newContacts = sameBuildingTenants.filter((t) => !alreadyMessaging.has(t.id));

  return (
    <div className={styles.page}>
      <TopBar title="Messages" />

      <div className={styles.sectionHeading}>Conversations</div>
      {conversationRows.length === 0 ? (
        <div className={styles.empty}>No direct messages yet. Start one below.</div>
      ) : (
        <div className={styles.chatList}>
          {conversationRows.map(({ conversation, other, lastMessage }) =>
            other ? (
              <Link key={conversation.id} href={`/messages/${conversation.id}`} className={styles.chatRow}>
                <div className={styles.chatAvatar}>{initials(other.name)}</div>
                <div className={styles.chatRowText}>
                  <div className={styles.chatRowTop}>
                    <span className={styles.chatRowName}>{other.name}</span>
                    {lastMessage && (
                      <span className={styles.chatRowTime}>{new Date(lastMessage.sentAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <span className={styles.chatRowPreview}>
                    {lastMessage ? lastMessage.content : 'No messages yet'}
                  </span>
                </div>
              </Link>
            ) : null,
          )}
        </div>
      )}

      <div className={styles.sectionHeading}>Start a new conversation</div>
      {newContacts.length === 0 ? (
        <div className={styles.empty}>You&apos;re already messaging everyone in {building.name}.</div>
      ) : (
        <div className={styles.peopleList}>
          {newContacts.map((t) => (
            <form key={t.id} action={startConversationAction}>
              <input type="hidden" name="otherTenantId" value={t.id} />
              <button type="submit" className={styles.personButton}>
                {t.name}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
