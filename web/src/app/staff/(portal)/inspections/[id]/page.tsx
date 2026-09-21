import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from '../../../staff.module.css';
import { db } from '../../../../../prisma/db';
import { getLocale } from '../../../../../lib/i18n';
import { getLiving } from '../../../../../lib/living';
import { AREAS, conditionRank } from '../../../../../lib/inspection';
import { openTicketFromItemAction, reviewInspectionAction } from '../../../../../lib/inspection-actions';

export const metadata: Metadata = {
  title: 'Inspection - Kuopas staff',
};

export default async function StaffInspectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const locale = await getLocale();
  const L = getLiving(locale).inspection;
  const t = L.staff;

  const inspection = await db.orm.public.Inspection.where({ id })
    .include('tenant', (x) => x)
    .include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b)))
    .include('items', (i) => i)
    .first();
  if (!inspection) notFound();
  const items = inspection.items ?? [];
  const itemLabel = (area: string, item: string) => (L.items as Record<string, string>)[`${area}.${item}`] ?? item;
  const day = (iso: string) => new Date(iso).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-GB');

  // Move-out: compare with the same resident's move-in record.
  let baseline: Map<string, string> | null = null;
  if (inspection.kind === 'move_out') {
    const moveIn = (await db.orm.public.Inspection.where({ tenantId: inspection.tenantId, kind: 'move_in' }).include('items', (i) => i).all()).find((i) =>
      ['submitted', 'acknowledged'].includes(i.status),
    );
    if (moveIn) baseline = new Map((moveIn.items ?? []).map((i) => [`${i.area}.${i.item}`, i.condition]));
  }
  const newDamage = baseline
    ? items.filter((i) => conditionRank(i.condition) > conditionRank(baseline!.get(`${i.area}.${i.item}`) ?? 'ok'))
    : [];
  const alreadyThere = baseline
    ? items.filter((i) => conditionRank(i.condition) > 0 && conditionRank(i.condition) <= conditionRank(baseline!.get(`${i.area}.${i.item}`) ?? 'ok'))
    : [];

  const renderItem = (i: (typeof items)[number], extra?: string) => (
    <div key={i.id} className={styles.card} style={{ padding: 12, marginBottom: 10 }}>
      <div className={styles.rowText}>
        <span className={styles.rowCategory}>
          {(L.areas as Record<string, string>)[i.area]} &middot; {itemLabel(i.area, i.item)}
        </span>
        <span className={styles.rowMeta}>
          {L.conditions[i.condition as keyof typeof L.conditions] ?? i.condition}
          {extra ? ` · ${extra}` : ''}
          {i.note ? ` · ${i.note}` : ''}
        </span>
        {i.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={i.photoUrl} alt={itemLabel(i.area, i.item)} style={{ width: 220, borderRadius: 10, marginTop: 6 }} />
        )}
      </div>
      {conditionRank(i.condition) > 0 && (
        <form action={openTicketFromItemAction} style={{ marginTop: 8 }}>
          <input type="hidden" name="itemId" value={i.id} />
          <button type="submit" className={styles.inlineSubmit}>
            {t.ticket}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <>
      <Link href="/staff/inspections" className={styles.back}>
        &lsaquo; {t.title}
      </Link>
      <h1 style={{ marginTop: 12 }}>
        {L.kinds[inspection.kind as keyof typeof L.kinds]} &middot; {inspection.tenant?.name}
      </h1>
      <p style={{ color: '#767676', marginTop: 6 }}>
        {inspection.unit?.stairwell?.building?.name} {inspection.unit?.stairwell?.label}
        {inspection.unit?.code} &middot; {L.status[inspection.status as keyof typeof L.status] ?? inspection.status}
        {inspection.submittedAt ? ` · ${L.submittedOn} ${day(inspection.submittedAt)}` : ''}
      </p>
      {inspection.contentHash && (
        <p style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', color: '#767676' }}>
          {L.fingerprint}: {inspection.contentHash}
        </p>
      )}
      {q.ticket === '1' && <div className={styles.card}>{t.ticketOpened}</div>}

      {inspection.status === 'submitted' && (
        <form action={reviewInspectionAction} className={styles.card}>
          <input type="hidden" name="id" value={inspection.id} />
          <div className={styles.form}>
            <input name="note" placeholder={t.note} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '8px 10px', fontSize: 13 }} />
            <div className={styles.inlineForm}>
              <button type="submit" name="decision" value="acknowledge" className={styles.inlineSubmit}>
                {t.acknowledge}
              </button>
              <button type="submit" name="decision" value="changes" className={styles.inlineSubmit} style={{ background: '#8a5a00' }}>
                {t.requestChanges}
              </button>
            </div>
          </div>
        </form>
      )}
      {inspection.staffNote && <div className={styles.card}>{L.staffNote}: {inspection.staffNote}</div>}

      {inspection.kind === 'move_out' && (
        <div className={styles.card}>
          <h2>{t.compareHeading}</h2>
          {!baseline && <span className={styles.rowMeta}>{t.compareNone}</span>}
          {baseline && newDamage.length === 0 && <span className={styles.rowMeta}>{t.unchanged}</span>}
          {newDamage.length > 0 && <strong style={{ display: 'block', margin: '8px 0' }}>{t.newDamage}</strong>}
          {newDamage.map((i) => renderItem(i, `${t.moveIn}: ${L.conditions[(baseline!.get(`${i.area}.${i.item}`) ?? 'ok') as keyof typeof L.conditions]}`))}
          {alreadyThere.length > 0 && <strong style={{ display: 'block', margin: '8px 0' }}>{t.alreadyThere}</strong>}
          {alreadyThere.map((i) => renderItem(i))}
        </div>
      )}

      <h2>{t.allItems}</h2>
      {AREAS.map((area) => {
        const rows = items.filter((i) => i.area === area.key);
        return (
          <details key={area.key} open={rows.some((r) => conditionRank(r.condition) > 0)} style={{ marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{(L.areas as Record<string, string>)[area.key]}</summary>
            <div style={{ marginTop: 8 }}>{rows.map((r) => renderItem(r))}</div>
          </details>
        );
      })}
    </>
  );
}
