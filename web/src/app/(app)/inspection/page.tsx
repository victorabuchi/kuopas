import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../features.module.css';
import TopBar from '../TopBar';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { INSPECTION_KINDS } from '../../../lib/inspection';
import { startInspectionAction } from '../../../lib/inspection-actions';

export const metadata: Metadata = {
  title: 'Inspection - Kuopas',
};

export default async function InspectionListPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const locale = await getLocale();
  const t = getLiving(locale).inspection;

  const inspections = await db.orm.public.Inspection.where({ tenantId: session.tenantId }).orderBy((i) => i.createdAt.desc()).all();
  const startedKinds = new Set(inspections.map((i) => i.kind));
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB');

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <p className={styles.lede}>{t.lede}</p>
        <div className={`${styles.notice} ${styles.noticeOk}`}>{t.depositNote}</div>

        {inspections.length === 0 && <div className={styles.empty}>{t.none}</div>}
        {inspections.map((i) => (
          <Link key={i.id} href={`/inspection/${i.id}`} className={styles.item} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>{t.kinds[i.kind as keyof typeof t.kinds] ?? i.kind}</span>
              <span className={styles.itemMeta}>
                {i.submittedAt ? `${t.submittedOn} ${day(i.submittedAt)}` : i.dueAt ? `${t.due} ${day(i.dueAt)}` : ''}
              </span>
            </div>
            <span className={`${styles.badge} ${i.status === 'acknowledged' ? styles.badgeOk : styles.badgeWarn}`}>
              {t.status[i.status as keyof typeof t.status] ?? i.status}
            </span>
          </Link>
        ))}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {INSPECTION_KINDS.filter((k) => !startedKinds.has(k)).map((kind) => (
            <form key={kind} action={startInspectionAction}>
              <input type="hidden" name="kind" value={kind} />
              <button type="submit" className={kind === 'move_in' ? styles.btn : `${styles.btn} ${styles.btnGhost}`}>
                {t.start[kind]}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
