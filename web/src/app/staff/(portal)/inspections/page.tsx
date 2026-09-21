import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';

export const metadata: Metadata = {
  title: 'Inspections - Kuopas staff',
};

export default async function StaffInspectionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === 'all' ? 'all' : 'submitted';
  const locale = await getLocale();
  const L = getLiving(locale).inspection;
  const t = L.staff;

  const all = await db.orm.public.Inspection.orderBy((i) => i.createdAt.desc())
    .include('tenant', (x) => x)
    .include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b)))
    .include('items', (i) => i)
    .limit(200)
    .all();
  const rows = all.filter((i) => tab === 'all' || i.status === 'submitted');

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: 6, marginBottom: 24 }}>{t.lede}</p>
      <div className={styles.tabs}>
        {(['submitted', 'all'] as const).map((key) => (
          <Link key={key} href={`/staff/inspections?tab=${key}`} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}>
            {t.tabs[key]}
          </Link>
        ))}
      </div>
      {rows.length === 0 && <div className={styles.empty}>{t.none}</div>}
      <div className={styles.list}>
        {rows.map((i) => {
          const issues = (i.items ?? []).filter((x) => ['minor', 'damaged', 'missing'].includes(x.condition)).length;
          return (
            <Link key={i.id} href={`/staff/inspections/${i.id}`} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>
                  {L.kinds[i.kind as keyof typeof L.kinds] ?? i.kind} &middot; {i.tenant?.name}
                </span>
                <span className={styles.rowMeta}>
                  {i.unit?.stairwell?.building?.name} {i.unit?.stairwell?.label}
                  {i.unit?.code} &middot; {issues} {t.issuesCount}
                </span>
              </div>
              <span className={styles.status}>{L.status[i.status as keyof typeof L.status] ?? i.status}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
