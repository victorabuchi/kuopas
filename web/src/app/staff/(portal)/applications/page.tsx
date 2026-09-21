import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { decideApplicationAction } from '../../../../lib/apply-actions';
import { freeRooms, groupFit, loadProfiles, pairFit, podMembers } from '../../../../lib/pods';

export const metadata: Metadata = {
  title: 'Applications - Kuopas staff',
};

const OPEN = ['submitted', 'offered'];

export default async function StaffApplicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === 'decided' ? 'decided' : 'open';
  const t = getLiving(await getLocale()).intake.applications;

  const all = await db.orm.public.PodApplication.orderBy((a) => a.createdAt.asc())
    .include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b)).include('tenants', (x) => x))
    .include('pod', (p) => p)
    .limit(200)
    .all();
  const rows = all.filter((a) => (tab === 'open' ? OPEN.includes(a.status) : !OPEN.includes(a.status)));

  const approvals = await db.orm.public.IdentityVerification.where({ status: 'approved' }).all();
  const verifiedIds = new Set(approvals.map((a) => a.tenantId));

  const cards = await Promise.all(
    rows.map(async (a) => {
      const members = (await podMembers(a.podId)).filter((m) => m.status === 'joined');
      const residents = a.unit?.tenants ?? [];
      const profiles = await loadProfiles([...members.map((m) => m.tenantId), ...residents.map((r) => r.id)]);
      const fit = groupFit(members.map((m) => m.tenantId), profiles);
      const cross: number[] = [];
      for (const m of members) {
        const mine = profiles.get(m.tenantId);
        if (!mine) continue;
        for (const r of residents) {
          const theirs = profiles.get(r.id);
          if (theirs?.active) cross.push(pairFit(mine, theirs).score);
        }
      }
      const residentFit = cross.length ? Math.round(cross.reduce((s, n) => s + n, 0) / cross.length) : null;
      return { a, members, fit, residentFit, free: await freeRooms(a.unitId) };
    }),
  );

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: 6, marginBottom: 24 }}>{t.lede}</p>
      <div className={styles.tabs}>
        <Link href="/staff/applications?tab=open" className={`${styles.tab} ${tab === 'open' ? styles.tabActive : ''}`}>
          {t.tabOpen}
        </Link>
        <Link href="/staff/applications?tab=decided" className={`${styles.tab} ${tab === 'decided' ? styles.tabActive : ''}`}>
          {t.tabDecided}
        </Link>
      </div>

      {cards.length === 0 && <div className={styles.empty}>{t.none}</div>}
      {cards.map(({ a, members, fit, residentFit, free }) => (
        <div key={a.id} className={styles.card}>
          <div className={styles.rowText}>
            <span className={styles.rowCategory}>
              {a.unit?.stairwell?.building?.name}, {a.unit?.stairwell?.label}
              {a.unit?.code} &middot; {t.status[a.status as keyof typeof t.status] ?? a.status}
            </span>
            <span className={styles.rowMeta}>
              {free} {t.freeRooms} &middot; {t.needs} {members.length}
            </span>
            <span className={styles.rowMeta}>
              {t.pod}: {a.pod?.name} &middot; {t.groupFit}: {fit.average === null ? '-' : `${fit.average}% (${t.lowest} ${fit.lowest}%)`}
              {residentFit !== null ? ` · ${t.residentFit}: ${residentFit}%` : ''}
            </span>
            {fit.clash && <span className={styles.rowMeta} style={{ color: '#b3261e' }}>{t.clash}</span>}
            <span className={styles.rowMeta}>
              {t.members}:{' '}
              {members.map((m) => `${m.tenant?.name} (${verifiedIds.has(m.tenantId) ? t.verified : t.notVerified})`).join(', ')}
            </span>
            {a.message && (
              <span className={styles.rowMeta}>
                {t.message}: {a.message}
              </span>
            )}
          </div>
          {OPEN.includes(a.status) && (
            <form action={decideApplicationAction} className={styles.form} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={a.id} />
              <input name="note" placeholder={t.note} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '8px 10px', fontSize: 13 }} />
              <div className={styles.inlineForm}>
                {a.status === 'submitted' && (
                  <button type="submit" name="decision" value="offer" className={styles.inlineSubmit}>
                    {t.offer}
                  </button>
                )}
                <button type="submit" name="decision" value="allocate" className={styles.inlineSubmit}>
                  {t.allocate}
                </button>
                <button type="submit" name="decision" value="reject" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                  {t.reject}
                </button>
              </div>
            </form>
          )}
          {a.status === 'housed' && <span className={styles.rowMeta}>{t.leaseNote}</span>}
        </div>
      ))}
    </>
  );
}
