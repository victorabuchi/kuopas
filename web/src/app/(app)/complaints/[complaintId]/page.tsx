import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import styles from '../complaints.module.css';
import { db } from '../../../../prisma/db';
import { getSession } from '../../../../lib/session';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import { sendComplaintMessageAction } from '../../../../lib/complaint-actions';

export default async function ComplaintThreadPage({
  params,
}: {
  params: Promise<{ complaintId: string }>;
}) {
  const { complaintId } = await params;

  const session = await getSession();
  if (!session) redirect('/login');

  const complaint = await db.orm.public.Complaint.where({ id: complaintId }).first();
  if (!complaint) notFound();
  if (complaint.tenantId !== session.tenantId) redirect('/complaints');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.complaints;

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
  const statusLabel: Record<string, { label: string; style: string }> = {
    new: { label: t.statusSent, style: styles.statusSent },
    in_progress: { label: t.statusAcknowledged, style: styles.statusAcknowledged },
    resolved: { label: t.statusResolved, style: styles.statusResolved },
  };
  const status = statusLabel[complaint.status];

  const messages = await db.orm.public.ComplaintMessage.where({ complaintId })
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/complaints" className={styles.back} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className={styles.topBarText}>
          <span className={styles.topBarTitle}>{categoryLabel[complaint.category]}</span>
          <span className={styles.topBarSubtitle}>{new Date(complaint.createdAt).toLocaleString()}</span>
        </div>
        <span className={`${styles.status} ${status.style}`}>{status.label}</span>
      </div>

      <div className={styles.detail}>
        <p className={styles.detailDescription}>{complaint.description}</p>
        {complaint.photoUrl && <img src={complaint.photoUrl} alt="" className={styles.detailPhoto} />}
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>{t.noMessagesYet}</p>}
        {messages.map((message) => {
          const isOwn = message.senderTenantId === session.tenantId;
          return (
            <div
              key={message.id}
              className={`${styles.messageRow} ${isOwn ? styles.messageRowOut : styles.messageRowIn}`}
            >
              {!isOwn && <span className={styles.messageAuthor}>Kuopas</span>}
              <div className={`${styles.messageBubble} ${isOwn ? styles.messageBubbleOut : styles.messageBubbleIn}`}>
                {message.content}
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendComplaintMessageAction} className={styles.composerBar}>
        <input type="hidden" name="complaintId" value={complaint.id} />
        <input type="text" name="content" placeholder={t.placeholder} required autoComplete="off" />
        <button type="submit" className={styles.send}>
          {dict.common.send}
        </button>
      </form>
    </div>
  );
}
