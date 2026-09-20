import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from '../../../staff.module.css';
import { db } from '../../../../../prisma/db';
import { getLocale } from '../../../../../lib/i18n';
import { getDictionary } from '../../../../../lib/dictionary';
import {
  sendComplaintMessageAction,
  updateComplaintStatusAction,
  assignComplaintAction,
} from '../../../../../lib/complaint-actions';

export default async function StaffComplaintDetailPage({
  params,
}: {
  params: Promise<{ complaintId: string }>;
}) {
  const { complaintId } = await params;

  const complaint = await db.orm.public.Complaint.where({ id: complaintId })
    .include('tenant', (tn) => tn)
    .first();
  if (!complaint) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.staff;
  const ct = dict.complaints;

  const categoryLabel: Record<string, string> = {
    plumbing: ct.categoryPlumbing,
    electrical: ct.categoryElectrical,
    heating: ct.categoryHeating,
    appliance: ct.categoryAppliance,
    pest: ct.categoryPest,
    noise: ct.categoryNoise,
    structural: ct.categoryStructural,
    other: ct.categoryOther,
  };
  const statusStyle: Record<string, string> = {
    new: styles.statusNew,
    in_progress: styles.statusInProgress,
    resolved: styles.statusResolved,
  };
  const statusLabel: Record<string, string> = {
    new: t.statusNew,
    in_progress: t.statusInProgress,
    resolved: t.statusResolved,
  };

  const messages = await db.orm.public.ComplaintMessage.where({ complaintId })
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  const savedReplies = await db.orm.public.SavedReply.orderBy((r) => r.createdAt.desc()).all();

  const staffList = await db.orm.public.Staff.orderBy((s) => s.name.asc()).all();

  return (
    <>
      <Link href="/staff/complaints" className={styles.back}>
        ← {t.complaintsInbox}
      </Link>

      <div className={styles.detailHeader}>
        <div>
          <h1 style={{ margin: 0 }}>{categoryLabel[complaint.category]}</h1>
          <p style={{ color: '#767676', margin: '4px 0 0' }}>
            {t.reportedBy}: {complaint.tenant!.name} &middot; {new Date(complaint.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`${styles.status} ${statusStyle[complaint.status]}`}>{statusLabel[complaint.status]}</span>
      </div>

      <div className={styles.card}>
        <p>{complaint.description}</p>
        {complaint.videoUrl && (
          <video src={complaint.videoUrl} controls preload="metadata" style={{ maxWidth: '100%', borderRadius: 10, marginTop: 10 }} />
        )}
        {complaint.photoUrl && (
          <img src={complaint.photoUrl} alt="" style={{ maxWidth: '100%', borderRadius: 10, marginTop: 10 }} />
        )}

        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          <form action={updateComplaintStatusAction} className={styles.inlineForm}>
            <input type="hidden" name="complaintId" value={complaint.id} />
            <select name="status" defaultValue={complaint.status}>
              <option value="new">{t.statusNew}</option>
              <option value="in_progress">{t.statusInProgress}</option>
              <option value="resolved">{t.statusResolved}</option>
            </select>
            <button type="submit" className={styles.inlineSubmit}>
              {t.submit}
            </button>
          </form>

          <form action={assignComplaintAction} className={styles.inlineForm}>
            <input type="hidden" name="complaintId" value={complaint.id} />
            <select name="assignedStaffId" defaultValue={complaint.assignedStaffId ?? ''}>
              <option value="">{t.unassigned}</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className={styles.inlineSubmit}>
              {t.assignTo}
            </button>
          </form>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((message) => {
          const isStaff = Boolean(message.senderStaffId);
          return (
            <div
              key={message.id}
              className={`${styles.messageRow} ${isStaff ? styles.messageRowOut : styles.messageRowIn}`}
            >
              <span className={styles.messageAuthor}>{isStaff ? t.dashboardTitle : complaint.tenant!.name}</span>
              <div className={`${styles.messageBubble} ${isStaff ? styles.messageBubbleOut : styles.messageBubbleIn}`}>
                {message.content}
              </div>
            </div>
          );
        })}
      </div>

      {savedReplies.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {savedReplies.map((reply) => (
            <form key={reply.id} action={sendComplaintMessageAction}>
              <input type="hidden" name="complaintId" value={complaint.id} />
              <input type="hidden" name="actingAs" value="staff" />
              <input type="hidden" name="content" value={reply.content} />
              <button type="submit" className={styles.inlineSubmit} title={reply.content}>
                {reply.title}
              </button>
            </form>
          ))}
        </div>
      )}

      <form action={sendComplaintMessageAction} className={styles.inlineForm}>
        <input type="hidden" name="complaintId" value={complaint.id} />
        <input type="hidden" name="actingAs" value="staff" />
        <input
          type="text"
          name="content"
          placeholder={ct.placeholder}
          required
          style={{ flex: 1, borderRadius: 8, border: '1px solid #e7e7e7', padding: '10px 12px', fontSize: 14 }}
        />
        <button type="submit" className={styles.inlineSubmit}>
          {dict.common.send}
        </button>
      </form>
    </>
  );
}
