import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import styles from '../../features.module.css';
import TopBar from '../../TopBar';
import { db } from '../../../../prisma/db';
import { getSession } from '../../../../lib/session';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { AREAS, CONDITIONS } from '../../../../lib/inspection';
import { saveInspectionAreaAction, submitInspectionAction } from '../../../../lib/inspection-actions';

export const metadata: Metadata = {
  title: 'Inspection - Kuopas',
};

export default async function InspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ inspectionId: string }>;
  searchParams: Promise<{ saved?: string; error?: string; submitted?: string }>;
}) {
  const { inspectionId } = await params;
  const q = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');
  const locale = await getLocale();
  const t = getLiving(locale).inspection;

  const inspection = await db.orm.public.Inspection.where({ id: inspectionId }).include('items', (i) => i).first();
  if (!inspection || inspection.tenantId !== session.tenantId) notFound();

  const editable = inspection.status === 'draft' || inspection.status === 'changes_requested';
  const items = inspection.items ?? [];
  const checked = items.filter((i) => i.condition !== 'unset').length;
  const issues = items.filter((i) => ['minor', 'damaged', 'missing'].includes(i.condition)).length;
  const day = (iso: string) => new Date(iso).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-GB');
  const itemLabel = (area: string, item: string) => (t.items as Record<string, string>)[`${area}.${item}`] ?? item;

  return (
    <div className={styles.page}>
      <TopBar title={t.kinds[inspection.kind as keyof typeof t.kinds] ?? t.title} />
      <div className={styles.content}>
        <Link href="/inspection" className={styles.itemMeta}>
          &lsaquo; {t.title}
        </Link>

        {q.submitted === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{t.justSubmitted}</div>}
        {q.error && <div className={`${styles.notice} ${styles.noticeErr}`}>{t.errors[q.error as keyof typeof t.errors] ?? q.error}</div>}
        {inspection.staffNote && (
          <div className={`${styles.notice} ${styles.noticeWarn}`}>
            <strong>{t.staffNote}:</strong> {inspection.staffNote}
            {inspection.status === 'changes_requested' && <div>{t.changesHint}</div>}
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.item} style={{ padding: 0, border: 'none' }}>
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>{t.progress.replace('{n}', String(checked)).replace('{m}', String(items.length))}</span>
              <span className={styles.itemMeta}>
                {t.issues}: {issues}
              </span>
            </div>
            <span className={`${styles.badge} ${inspection.status === 'acknowledged' ? styles.badgeOk : styles.badgeWarn}`}>
              {t.status[inspection.status as keyof typeof t.status] ?? inspection.status}
            </span>
          </div>
          {!editable && inspection.submittedAt && (
            <>
              <div className={styles.kv}>
                <span className={styles.kvLabel}>{t.submittedOn}</span>
                <span className={styles.kvValue}>{day(inspection.submittedAt)}</span>
              </div>
              {inspection.acknowledgedAt && (
                <div className={styles.kv}>
                  <span className={styles.kvLabel}>{t.acknowledgedOn}</span>
                  <span className={styles.kvValue}>{day(inspection.acknowledgedAt)}</span>
                </div>
              )}
              <div className={styles.kv}>
                <span className={styles.kvLabel}>{t.fingerprint}</span>
                <span className={styles.kvValue} style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                  {inspection.contentHash}
                </span>
              </div>
              <span className={styles.itemMeta}>{t.locked}</span>
            </>
          )}
        </div>

        {AREAS.map((area) => {
          const rows = area.items.map((key) => items.find((i) => i.area === area.key && i.item === key)).filter((r): r is NonNullable<typeof r> => Boolean(r));
          const areaChecked = rows.filter((r) => r.condition !== 'unset').length;
          const body = (
            <>
              {rows.map((row) => (
                <div key={row.id} className={styles.card} style={{ padding: 12 }}>
                  <span className={styles.itemTitle}>{itemLabel(area.key, row.item)}</span>
                  {editable ? (
                    <>
                      <select name={`condition_${row.item}`} defaultValue={row.condition}>
                        <option value="unset">{t.conditions.unset}</option>
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>
                            {t.conditions[c]}
                          </option>
                        ))}
                      </select>
                      <input name={`note_${row.item}`} maxLength={300} placeholder={t.notePlaceholder} defaultValue={row.note ?? ''} />
                      {row.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.photoUrl} alt={itemLabel(area.key, row.item)} style={{ width: 160, borderRadius: 10 }} />
                      )}
                      <input name={`photo_${row.item}`} type="file" accept="image/jpeg,image/png,image/webp" aria-label={row.photoUrl ? t.replacePhoto : t.photo} />
                    </>
                  ) : (
                    <>
                      <span className={`${styles.badge} ${['minor', 'damaged', 'missing'].includes(row.condition) ? styles.badgeWarn : styles.badgeOk}`} style={{ alignSelf: 'flex-start' }}>
                        {t.conditions[row.condition as keyof typeof t.conditions] ?? row.condition}
                      </span>
                      {row.note && <span className={styles.itemMeta}>{row.note}</span>}
                      {row.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.photoUrl} alt={itemLabel(area.key, row.item)} style={{ width: 200, borderRadius: 10 }} />
                      )}
                    </>
                  )}
                </div>
              ))}
            </>
          );
          return (
            <details key={area.key} id={area.key} open={editable ? q.saved === area.key || areaChecked < rows.length : true} className={styles.card}>
              <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
                {(t.areas as Record<string, string>)[area.key]} <span className={styles.itemMeta}>{areaChecked}/{rows.length}</span>
                {q.saved === area.key && <span className={`${styles.badge} ${styles.badgeOk}`} style={{ marginLeft: 8 }}>{t.saved}</span>}
              </summary>
              {editable ? (
                <form action={saveInspectionAreaAction} className={styles.form} style={{ marginTop: 12 }}>
                  <input type="hidden" name="inspectionId" value={inspection.id} />
                  <input type="hidden" name="area" value={area.key} />
                  {body}
                  <div>
                    <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                      {t.saveArea}
                    </button>
                  </div>
                </form>
              ) : (
                <div className={styles.form} style={{ marginTop: 12 }}>{body}</div>
              )}
            </details>
          );
        })}

        {editable && (
          <form action={submitInspectionAction} className={styles.card}>
            <input type="hidden" name="inspectionId" value={inspection.id} />
            <span className={styles.lede}>{t.submitHelp}</span>
            <div>
              <button type="submit" className={styles.btn}>
                {t.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
