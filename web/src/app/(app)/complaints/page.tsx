import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './complaints.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { submitComplaintAction } from '../../../lib/complaint-actions';

export const metadata: Metadata = {
  title: 'Complaints & faults - Kuopas',
};

export default async function ComplaintsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.complaints;

  const RESIDENT_STATUS: Record<string, { label: string; style: string }> = {
    new: { label: t.statusSent, style: styles.statusSent },
    in_progress: { label: t.statusAcknowledged, style: styles.statusAcknowledged },
    resolved: { label: t.statusResolved, style: styles.statusResolved },
  };

  const complaints = await db.orm.public.Complaint.where({ tenantId: session.tenantId })
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
    <div className={styles.page}>
      <TopBar title={t.title} />

      <form action={submitComplaintAction} className={styles.composer}>
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
        <button type="submit" className={styles.submit}>
          {t.submit}
        </button>
      </form>

      <div className={styles.list}>
        <div className={styles.listHeading}>{t.yourComplaints}</div>
        {complaints.length === 0 && <div className={styles.empty}>{t.noneYet}</div>}
        {complaints.map((complaint) => {
          const status = RESIDENT_STATUS[complaint.status];
          return (
            <Link key={complaint.id} href={`/complaints/${complaint.id}`} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>{categoryLabel[complaint.category]}</span>
                <span className={styles.rowDescription}>{complaint.description}</span>
                <span className={styles.rowMeta}>{new Date(complaint.createdAt).toLocaleDateString()}</span>
              </div>
              <span className={`${styles.status} ${status.style}`}>{status.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
