import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { nowMs } from '../../../../lib/time';
import { loadFlatOverview } from '../../../../lib/flat';
import { freeRooms } from '../../../../lib/pods';
import { decideTransferAction, nudgeFlatAction } from '../../../../lib/transfer-actions';

export const metadata: Metadata = {
  title: 'Shared flats - Kuopas staff',
};

export default async function StaffFlatsPage({ searchParams }: { searchParams: Promise<{ nudged?: string; error?: string }> }) {
  const q = await searchParams;
  const locale = await getLocale();
  const f = getLiving(locale).flat.staff;

  const flats = await loadFlatOverview(new Date(nowMs()));

  const requests = (await db.orm.public.TransferRequest.orderBy((r) => r.createdAt.asc())
    .include('tenant', (x) => x)
    .all()).filter((r) => ['open', 'mediation'].includes(r.status));
  const resolved = (await db.orm.public.TransferRequest.where({ status: 'resolved' }).all()).length;

  // Homes a resident could move to: other units with a free room.
  const candidateUnits = (await db.orm.public.Unit.include('stairwell', (s) => s.include('building', (b) => b)).all()).filter((u) => u.kind !== 'unspecified' || u.roomCount > 1);
  const free = new Map<string, number>();
  for (const u of candidateUnits) free.set(u.id, await freeRooms(u.id));

  const unitOf = new Map(flats.map((x) => [x.unitId, x.label]));
  const waiting = requests.filter((r) => r.wants !== 'other_shared');

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{f.title}</h1>
      <p style={{ color: '#767676', marginTop: 6, marginBottom: 24 }}>{f.lede}</p>
      {q.nudged === '1' && <div className={styles.card}>{f.nudged}</div>}
      {q.error === 'unit' && <div className={styles.card} style={{ color: '#b3261e' }}>{f.noUnit}</div>}

      <div className={styles.card}>
        <h2>{f.queueHeading}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>
          {f.queueLede} {f.stats}: {resolved}
        </p>
        {requests.length === 0 && <div className={styles.empty}>{f.queueNone}</div>}
        {requests.map((r) => {
          const pos = r.wants === 'other_shared' ? null : waiting.findIndex((w) => w.id === r.id) + 1;
          const options = candidateUnits
            .filter((u) => (free.get(u.id) ?? 0) > 0 && u.id !== r.fromUnitId)
            .filter((u) => (r.wants === 'studio' ? u.kind === 'studio' : r.wants === 'other_shared' ? u.kind === 'solu' : true));
          return (
            <div key={r.id} className={styles.row} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>
                  {r.tenant?.name} &middot; {f.reasons[r.reason as keyof typeof f.reasons]} &middot; {f.wants[r.wants as keyof typeof f.wants]} &middot; {f.status[r.status as keyof typeof f.status]}
                </span>
                <span className={styles.rowMeta}>
                  {r.fromUnitId ? unitOf.get(r.fromUnitId) ?? '' : ''} &middot; {f.triedAgreement}: {r.triedAgreement ? f.yes : f.no} &middot; {f.checklist}: {r.checklistRate}%
                  {pos ? ` · ${f.position} #${pos}` : ''}
                </span>
                <span className={styles.rowMeta}>{r.description}</span>
              </div>
              <form action={decideTransferAction} className={styles.form} style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={r.id} />
                <input name="note" placeholder={f.note} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '8px 10px', fontSize: 13 }} />
                <select name="unitId" defaultValue="">
                  <option value="">{f.chooseUnit}: {f.noUnit}</option>
                  {options.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.stairwell?.building?.name} {u.stairwell?.label}
                      {u.code} ({u.kind}, {free.get(u.id)} free)
                    </option>
                  ))}
                </select>
                <div className={styles.inlineForm} style={{ flexWrap: 'wrap' }}>
                  {r.status === 'open' && (
                    <button type="submit" name="decision" value="mediation" className={styles.inlineSubmit} style={{ background: '#8a5a00' }}>
                      {f.startMediation}
                    </button>
                  )}
                  <button type="submit" name="decision" value="approve" className={styles.inlineSubmit}>
                    {f.approve}
                  </button>
                  <button type="submit" name="decision" value="resolved" className={styles.inlineSubmit}>
                    {f.resolved}
                  </button>
                  <button type="submit" name="decision" value="decline" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                    {f.decline}
                  </button>
                </div>
              </form>
            </div>
          );
        })}
      </div>

      <div className={styles.card}>
        <h2>{f.title}</h2>
        {flats.length === 0 && <div className={styles.empty}>{f.none}</div>}
        {flats.map((row) => (
          <div key={row.unitId} className={styles.row} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>
                {row.label} &middot; {row.residents} {f.resident} &middot; {f.risk} {row.risk}
              </span>
              <span className={styles.rowMeta}>
                {f.agreement}: {f.agreementStates[row.agreement]}
                {row.agreementMissing ? ' *' : ''} &middot; {f.cleaning}: {row.cleaning === null ? '-' : `${row.cleaning}%`} &middot; {row.overdue} {f.overdue} &middot; {row.complaints} {f.complaintsLabel}
              </span>
              <span className={styles.rowMeta} style={{ color: row.flags.length ? '#8a5a00' : '#046a38' }}>
                {row.flags.length ? row.flags.map((flag) => f.flags[flag]).join(' · ') : f.healthy}
              </span>
            </div>
            {row.flags.length > 0 && (
              <form action={nudgeFlatAction} style={{ marginTop: 8 }}>
                <input type="hidden" name="unitId" value={row.unitId} />
                <button type="submit" className={styles.inlineSubmit}>
                  {f.nudge}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
