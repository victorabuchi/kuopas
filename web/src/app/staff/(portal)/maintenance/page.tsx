import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../../staff.module.css';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import { getLiving } from '../../../../lib/living';
import { findHotspots, loadLocatedComplaints } from '../../../../lib/maintenance';
import { db } from '../../../../prisma/db';
import { conditionRank } from '../../../../lib/inspection';

export const metadata: Metadata = {
  title: 'Maintenance insights - Kuopas staff',
};

export default async function StaffMaintenancePage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = getLiving(locale).staff.maintenance;
  const categoryLabel: Record<string, string> = {
    plumbing: dict.complaints.categoryPlumbing,
    electrical: dict.complaints.categoryElectrical,
    heating: dict.complaints.categoryHeating,
    appliance: dict.complaints.categoryAppliance,
    pest: dict.complaints.categoryPest,
    noise: dict.complaints.categoryNoise,
    structural: dict.complaints.categoryStructural,
    other: dict.complaints.categoryOther,
  };

  const insp = getLiving(locale).inspection;
  const moveIns = await db.orm.public.Inspection.where({ kind: 'move_in' })
    .include('items', (i) => i)
    .include('unit', (u) => u.include('stairwell', (st) => st.include('building', (b) => b)))
    .all();
  const recorded = moveIns
    .filter((i) => ['submitted', 'acknowledged'].includes(i.status))
    .flatMap((i) => (i.items ?? []).filter((x) => conditionRank(x.condition) > 0).map((x) => ({ i, x })))
    .sort((a, b) => conditionRank(b.x.condition) - conditionRank(a.x.condition))
    .slice(0, 40);

  const recent = await loadLocatedComplaints(90);
  const hotspots = findHotspots(recent);

  const byCategory = new Map<string, number>();
  for (const c of recent) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
  const trend = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...trend.map(([, n]) => n), 1);

  const clusters = new Map<string, typeof recent>();
  for (const c of recent) {
    if (!c.clusterId || c.status === 'resolved') continue;
    clusters.set(c.clusterId, [...(clusters.get(c.clusterId) ?? []), c]);
  }
  const openClusters = [...clusters.values()].filter((items) => items.length > 1);

  const kindLabel = { stack: t.stack, floor: t.floor, unit: t.unit };

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.lede}</p>

      <div className={styles.card}>
        <h2>{t.hotspots}</h2>
        {hotspots.length === 0 && <div className={styles.empty}>{t.noHotspots}</div>}
        <div className={styles.list}>
          {hotspots.map((h) => (
            <div key={h.key} className={styles.row} style={{ alignItems: 'flex-start' }}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>
                  {categoryLabel[h.category]} · {kindLabel[h.kind]}: {h.where}
                </span>
                <span className={styles.rowMeta}>
                  {h.building} · {t.units}: {h.units.join(', ')}
                </span>
                <span className={styles.rowMeta}>{(t.advice as Record<string, string>)[h.category]}</span>
              </div>
              <span className={`${styles.status} ${h.open > 0 ? styles.statusNew : styles.statusResolved}`}>
                {h.count} {t.reports} · {h.open} {t.open}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2>{t.trend}</h2>
        {trend.map(([category, n]) => (
          <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
            <span style={{ width: 130, fontSize: 13 }}>{categoryLabel[category]}</span>
            <div style={{ flex: 1, background: '#f0f2f0', borderRadius: 6, height: 12 }}>
              <div style={{ width: `${(n / max) * 100}%`, height: '100%', background: '#046a38', borderRadius: 6 }} />
            </div>
            <span style={{ width: 24, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{n}</span>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h2>{t.clusters}</h2>
        {openClusters.length === 0 && <div className={styles.empty}>{t.noClusters}</div>}
        {openClusters.map((items) => (
          <div key={items[0]!.clusterId!} className={styles.row} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className={styles.rowCategory}>
              {categoryLabel[items[0]!.category]} · {items[0]!.buildingName}
            </span>
            {items.map((c) => (
              <Link key={c.id} href={`/staff/complaints/${c.id}`} className={styles.rowMeta} style={{ color: '#046a38' }}>
                {c.stairwellLabel}
                {c.unitCode} · {t.viewTicket}
              </Link>
            ))}
          </div>
        ))}
      </div>
    
      <div className={styles.card}>
        <h2>{insp.staff.recorded}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>{insp.staff.recordedLede}</p>
        {recorded.length === 0 && <div className={styles.empty}>{insp.staff.noRecorded}</div>}
        {recorded.map(({ i, x }) => (
          <Link key={x.id} href={`/staff/inspections/${i.id}`} className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>
                {(insp.areas as Record<string, string>)[x.area]} &middot; {(insp.items as Record<string, string>)[`${x.area}.${x.item}`] ?? x.item}
              </span>
              <span className={styles.rowMeta}>
                {i.unit?.stairwell?.building?.name} {i.unit?.stairwell?.label}
                {i.unit?.code} &middot; {insp.conditions[x.condition as keyof typeof insp.conditions] ?? x.condition}
                {x.note ? ` · ${x.note}` : ''}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
