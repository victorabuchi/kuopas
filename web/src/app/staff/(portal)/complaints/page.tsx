import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import { getLiving } from '../../../../lib/living';

export const metadata: Metadata = {
  title: 'Complaints inbox - Kuopas staff',
};

const TAB_VALUES = ['new', 'in_progress', 'resolved'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue);
}

export default async function StaffComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status: TabValue = rawStatus && isTabValue(rawStatus) ? rawStatus : 'new';

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.staff;
  const ct = dict.complaints;

  const complaints = await db.orm.public.Complaint.where({ status })
    .include('tenant', (tn) => tn)
    .orderBy((c) => c.createdAt.desc())
    .limit(100)
    .all();

  const clusterCounts = new Map<string, number>();
  for (const c of complaints) if (c.clusterId) clusterCounts.set(c.clusterId, (clusterCounts.get(c.clusterId) ?? 0) + 1);

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

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.complaintsInbox}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.complaintsInboxLede}</p>

      <div className={styles.tabs}>
        {TAB_VALUES.map((value) => (
          <Link
            key={value}
            href={`/staff/complaints?status=${value}`}
            className={`${styles.tab} ${status === value ? styles.tabActive : ''}`}
          >
            {statusLabel[value]}
          </Link>
        ))}
      </div>

      <div className={styles.list}>
        {complaints.length === 0 && <div className={styles.empty}>{t.statusNew} 0</div>}
        {complaints.map((complaint) => (
          <Link key={complaint.id} href={`/staff/complaints/${complaint.id}`} className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>
                {categoryLabel[complaint.category]}
                {complaint.clusterId && (clusterCounts.get(complaint.clusterId) ?? 0) > 1 && (
                  <span className={styles.status} style={{ marginLeft: 8, background: '#fdf3dc', color: '#8a5a00' }}>
                    {getLiving(locale).staff.maintenance.related} {clusterCounts.get(complaint.clusterId)}
                  </span>
                )}
              </span>
              <span className={styles.rowMeta}>
                {t.reportedBy}: {complaint.tenant!.name} &middot; {new Date(complaint.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span className={`${styles.status} ${statusStyle[complaint.status]}`}>{statusLabel[complaint.status]}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
