import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { addUnitsAction, deleteUnitAction, saveUnitAction } from '../../../../lib/home-actions';
import { UNIT_KINDS } from '../../../../lib/unit-kinds';

export const metadata: Metadata = {
  title: 'Homes - Kuopas staff',
};

type T = ReturnType<typeof getLiving>['intake']['homes'];

function Fields({ t, unit }: { t: T; unit?: { kind: string; roomCount: number; furnished: boolean; temporary: boolean; openForApplications: boolean; availableFrom: string | null } }) {
  return (
    <>
      <div className={styles.field}>
        <label>{t.kind}</label>
        <select name="kind" defaultValue={unit?.kind ?? 'solu'}>
          {UNIT_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.kinds[k]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label>{t.rooms}</label>
        <input name="roomCount" type="number" min={1} max={12} defaultValue={unit?.roomCount ?? 3} />
      </div>
      <div className={styles.field}>
        <label>{t.availableFrom}</label>
        <input name="availableFrom" type="date" defaultValue={unit?.availableFrom ? unit.availableFrom.slice(0, 10) : ''} />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
        <input type="checkbox" name="furnished" defaultChecked={unit?.furnished ?? false} /> {t.furnished}
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
        <input type="checkbox" name="temporary" defaultChecked={unit?.temporary ?? false} /> {t.temporary}
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
        <input type="checkbox" name="openForApplications" defaultChecked={unit?.openForApplications ?? false} /> {t.open}
      </label>
    </>
  );
}

export default async function StaffHomesPage({ searchParams }: { searchParams: Promise<{ building?: string; added?: string }> }) {
  const { building: buildingParam, added } = await searchParams;
  const locale = await getLocale();
  const t = getLiving(locale).intake.homes;

  const buildings = await db.orm.public.Building.orderBy((b) => b.name.asc()).all();
  const building = buildings.find((b) => b.id === buildingParam) ?? null;

  const header = (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: 6, marginBottom: 24 }}>{t.lede}</p>
      <form method="get" className={styles.inlineForm} style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 700, fontSize: 13 }}>{t.building}</label>
        <select name="building" defaultValue={building?.id ?? ''}>
          <option value="">{t.choose}</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.inlineSubmit}>
          {t.building}
        </button>
      </form>
    </>
  );
  if (!building) return header;

  const stairwells = await db.orm.public.Stairwell.where({ buildingId: building.id }).orderBy((s) => s.label.asc()).all();
  const stairwellIds = stairwells.map((s) => s.id);
  const units = stairwellIds.length
    ? await db.orm.public.Unit.where((u) => u.stairwellId.in(stairwellIds)).include('tenants', (x) => x).orderBy((u) => u.code.asc()).all()
    : [];
  const labelOf = new Map(stairwells.map((s) => [s.id, s.label]));

  return (
    <>
      {header}
      {added && <div className={styles.card}>{t.added}: {added}</div>}

      <div className={styles.card}>
        <h2>{t.apartments}</h2>
        {units.length === 0 && <div className={styles.empty}>{t.none}</div>}
        {units.map((u) => (
          <details key={u.id} style={{ borderTop: '1px solid #e7e7e7', padding: '10px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
              {labelOf.get(u.stairwellId)}
              {u.code}{' '}
              <span style={{ color: '#767676', fontWeight: 500 }}>
                {t.kinds[u.kind as keyof typeof t.kinds] ?? u.kind} &middot; {u.roomCount} {t.rooms.toLowerCase()} &middot; {(u.tenants ?? []).length} {t.residents}
                {u.openForApplications ? ` · ${t.open}` : ''}
              </span>
            </summary>
            <form action={saveUnitAction} className={styles.form} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="buildingId" value={building.id} />
              <Fields t={t} unit={u} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className={styles.inlineSubmit}>
                  {t.save}
                </button>
              </div>
            </form>
            {(u.tenants ?? []).length === 0 ? (
              <form action={deleteUnitAction} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="buildingId" value={building.id} />
                <button type="submit" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                  {t.delete}
                </button>
              </form>
            ) : (
              <span style={{ fontSize: 12.5, color: '#767676' }}>{t.deleteBlocked}</span>
            )}
          </details>
        ))}
      </div>

      <div className={styles.card}>
        <h2>{t.addHeading}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>{t.addLede}</p>
        <form action={addUnitsAction} className={styles.form}>
          <input type="hidden" name="buildingId" value={building.id} />
          <div className={styles.field}>
            <label>{t.stairwell}</label>
            <input name="stairwell" defaultValue="A" maxLength={10} />
          </div>
          <div className={styles.field}>
            <label>{t.codes}</label>
            <textarea name="codes" rows={3} placeholder="101, 102, 103" required />
          </div>
          <Fields t={t} />
          <div>
            <button type="submit" className={styles.submit}>
              {t.add}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
