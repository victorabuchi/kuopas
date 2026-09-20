import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { nowMs } from '../../../../lib/time';
import { AMENITY_KINDS, SPACE_KINDS, type AmenityKind } from '../../../../lib/booking';
import {
  saveAmenitiesAction,
  addInventoryAction,
  removeInventoryAction,
  setSaunaCapacityAction,
  saveSpaceAction,
  deleteSpaceAction,
  staffCancelSpaceBookingAction,
} from '../../../../lib/facility-actions';

export const metadata: Metadata = {
  title: 'Facilities - Kuopas staff',
};

type Rows = { kind: string; enabled: boolean }[];

function StateSelects({ rows, t }: { rows: Rows; t: ReturnType<typeof getLiving>['booking'] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {AMENITY_KINDS.map((kind: AmenityKind) => {
        const row = rows.find((r) => r.kind === kind);
        const value = row ? (row.enabled ? 'yes' : 'no') : 'auto';
        return (
          <label key={kind} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, fontWeight: 700 }}>
            {t.kinds[kind].name}
            <select name={`state_${kind}`} defaultValue={value} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '6px 10px', fontSize: 13 }}>
              <option value="auto">{t.staff.auto}</option>
              <option value="yes">{t.staff.yes}</option>
              <option value="no">{t.staff.no}</option>
            </select>
          </label>
        );
      })}
    </div>
  );
}

export default async function StaffFacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building: buildingParam } = await searchParams;
  const locale = await getLocale();
  const t = getLiving(locale).booking;
  const s = t.staff;

  const buildings = await db.orm.public.Building.orderBy((b) => b.name.asc()).all();
  const building = buildings.find((b) => b.id === buildingParam) ?? null;

  const header = (
    <>
      <h1 style={{ marginTop: 0 }}>{s.title}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{s.lede}</p>
      <form method="get" className={styles.inlineForm} style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 700, fontSize: 13 }}>{s.building}</label>
        <select name="building" defaultValue={building?.id ?? ''}>
          <option value="">{s.choose}</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.inlineSubmit}>
          {s.building}
        </button>
      </form>
    </>
  );
  if (!building) return header;

  const [buildingRows, machines, saunas, spots, spaces, stairwells] = await Promise.all([
    db.orm.public.BuildingAmenity.where({ buildingId: building.id }).all(),
    db.orm.public.LaundryMachine.where({ buildingId: building.id }).orderBy((m) => m.label.asc()).all(),
    db.orm.public.SaunaSlot.where({ buildingId: building.id }).orderBy((m) => m.label.asc()).all(),
    db.orm.public.ParkingSpot.where({ buildingId: building.id }).orderBy((m) => m.label.asc()).all(),
    db.orm.public.BookableSpace.where({ buildingId: building.id }).orderBy((m) => m.name.asc()).all(),
    db.orm.public.Stairwell.where({ buildingId: building.id }).orderBy((m) => m.label.asc()).all(),
  ]);
  const stairwellIds = stairwells.map((w) => w.id);
  const units = stairwellIds.length
    ? await db.orm.public.Unit.where((u) => u.stairwellId.in(stairwellIds)).orderBy((u) => u.code.asc()).all()
    : [];
  const unitRows = units.length ? await db.orm.public.UnitAmenity.where((r) => r.unitId.in(units.map((u) => u.id))).all() : [];

  const spaceIds = spaces.map((sp) => sp.id);
  const upcoming = spaceIds.length
    ? await db.orm.public.SpaceBooking.where((b) => b.spaceId.in(spaceIds)).include('tenant', (x) => x).all()
    : [];
  const now = nowMs();
  const futureBookings = upcoming
    .filter((b) => new Date(b.endsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const spaceName = new Map(spaces.map((sp) => [sp.id, sp.name]));
  const when = (iso: string) => new Date(iso).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const bid = building.id;
  const invForms: { kind: 'laundry' | 'sauna' | 'parking'; add: string }[] = [
    { kind: 'laundry', add: s.addMachine },
    { kind: 'sauna', add: s.addSauna },
    { kind: 'parking', add: s.addSpot },
  ];

  return (
    <>
      {header}

      <div className={styles.card}>
        <h2>{s.amenitiesHeading}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>{s.amenitiesLede}</p>
        <form action={saveAmenitiesAction} className={styles.form}>
          <input type="hidden" name="scope" value="building" />
          <input type="hidden" name="targetId" value={bid} />
          <input type="hidden" name="buildingId" value={bid} />
          <StateSelects rows={buildingRows} t={t} />
          <div>
            <button type="submit" className={styles.inlineSubmit}>
              {s.save}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.card} id="inventory">
        <h2>{s.inventoryHeading}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>{s.inventoryNote}</p>

        {invForms.map(({ kind, add }) => {
          const rows = kind === 'laundry' ? machines : kind === 'sauna' ? saunas : spots;
          return (
            <div key={kind} style={{ marginBottom: 18 }}>
              <strong style={{ fontSize: 14 }}>{t.kinds[kind].name}</strong>
              <div className={styles.list} style={{ margin: '8px 0' }}>
                {rows.map((row) => (
                  <div key={row.id} className={styles.row}>
                    <span className={styles.rowCategory}>{row.label}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {kind === 'sauna' && 'capacity' in row && typeof row.capacity === 'number' && (
                        <form action={setSaunaCapacityAction} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="buildingId" value={bid} />
                          <label style={{ fontSize: 12.5 }}>{s.saunaCapacity}</label>
                          <input name="capacity" type="number" min={1} max={50} defaultValue={row.capacity as number} style={{ width: 64, borderRadius: 8, border: '1px solid #e7e7e7', padding: '6px 8px' }} />
                          <button type="submit" className={styles.inlineSubmit}>
                            {s.save}
                          </button>
                        </form>
                      )}
                      <form action={removeInventoryAction}>
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="buildingId" value={bid} />
                        <button type="submit" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                          {s.remove}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
              <form action={addInventoryAction} className={styles.inlineForm}>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="buildingId" value={bid} />
                <input name="label" required placeholder={s.labelPlaceholder} style={{ borderRadius: 8, border: '1px solid #e7e7e7', padding: '6px 10px', fontSize: 13, minWidth: 220 }} />
                <button type="submit" className={styles.inlineSubmit}>
                  {add}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <div className={styles.card} id="spaces">
        <h2>{s.spacesHeading}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>{s.spacesLede}</p>

        {spaces.length === 0 && <div className={styles.empty}>{s.noSpaces}</div>}
        {spaces.map((sp) => (
          <details key={sp.id} style={{ borderTop: '1px solid #e7e7e7', padding: '10px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
              {sp.name} <span style={{ color: '#767676', fontWeight: 500 }}>({t.kinds[sp.kind as (typeof SPACE_KINDS)[number]]?.name ?? sp.kind})</span>
            </summary>
            <SpaceForm action={saveSpaceAction} bid={bid} space={sp} s={s} t={t} />
            <form action={deleteSpaceAction} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={sp.id} />
              <input type="hidden" name="buildingId" value={bid} />
              <button type="submit" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                {s.delete}
              </button>
            </form>
          </details>
        ))}

        <details style={{ borderTop: '1px solid #e7e7e7', padding: '10px 0' }} open={spaces.length === 0}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{s.newSpace}</summary>
          <SpaceForm action={saveSpaceAction} bid={bid} space={null} s={s} t={t} />
        </details>
      </div>

      <div className={styles.card} id="units">
        <h2>{s.unitsHeading}</h2>
        <p style={{ color: '#767676', marginTop: 0, fontSize: 13.5 }}>{s.unitsLede}</p>
        {units.length === 0 && <div className={styles.empty}>{s.noUnits}</div>}
        {units.map((u) => (
          <details key={u.id} style={{ borderTop: '1px solid #e7e7e7', padding: '10px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
              {s.unit} {u.code}
              {unitRows.some((r) => r.unitId === u.id) && <span style={{ color: '#046a38', fontWeight: 600 }}> *</span>}
            </summary>
            <form action={saveAmenitiesAction} className={styles.form} style={{ marginTop: 10 }}>
              <input type="hidden" name="scope" value="unit" />
              <input type="hidden" name="targetId" value={u.id} />
              <input type="hidden" name="buildingId" value={bid} />
              <StateSelects rows={unitRows.filter((r) => r.unitId === u.id)} t={t} />
              <div>
                <button type="submit" className={styles.inlineSubmit}>
                  {s.save}
                </button>
              </div>
            </form>
          </details>
        ))}
      </div>

      <div className={styles.card} id="bookings">
        <h2>{s.bookingsHeading}</h2>
        {futureBookings.length === 0 && <div className={styles.empty}>{s.noBookings}</div>}
        <div className={styles.list}>
          {futureBookings.map((b) => (
            <div key={b.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>{spaceName.get(b.spaceId)}</span>
                <span className={styles.rowMeta}>
                  {when(b.startsAt)} &middot; {b.tenant?.name}
                  {b.note ? ` · ${b.note}` : ''}
                </span>
              </div>
              <form action={staffCancelSpaceBookingAction}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="buildingId" value={bid} />
                <button type="submit" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                  {s.cancelBooking}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

type SpaceRow = {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  capacity: number;
  openHour: number;
  closeHour: number;
  maxHoursPerBooking: number;
  maxHoursPerWeek: number;
  advanceDays: number;
};

function SpaceForm({
  action,
  bid,
  space,
  s,
  t,
}: {
  action: (formData: FormData) => Promise<void>;
  bid: string;
  space: SpaceRow | null;
  s: ReturnType<typeof getLiving>['booking']['staff'];
  t: ReturnType<typeof getLiving>['booking'];
}) {
  const num = (name: string, label: string, value: number, min: number, max: number) => (
    <div className={styles.field}>
      <label>{label}</label>
      <input name={name} type="number" min={min} max={max} defaultValue={value} required />
    </div>
  );
  return (
    <form action={action} className={styles.form} style={{ marginTop: 10 }}>
      {space && <input type="hidden" name="id" value={space.id} />}
      <input type="hidden" name="buildingId" value={bid} />
      <div className={styles.field}>
        <label>{s.kind}</label>
        <select name="kind" defaultValue={space?.kind ?? SPACE_KINDS[0]}>
          {SPACE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.kinds[k].name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label>{s.name}</label>
        <input name="name" required maxLength={80} defaultValue={space?.name ?? ''} />
      </div>
      <div className={styles.field}>
        <label>{s.description}</label>
        <input name="description" maxLength={240} defaultValue={space?.description ?? ''} />
      </div>
      {num('capacity', s.capacity, space?.capacity ?? 6, 1, 200)}
      {num('openHour', s.opens, space?.openHour ?? 8, 0, 23)}
      {num('closeHour', s.closes, space?.closeHour ?? 22, 1, 24)}
      {num('maxHoursPerBooking', s.perBooking, space?.maxHoursPerBooking ?? 2, 1, 24)}
      {num('maxHoursPerWeek', s.perWeek, space?.maxHoursPerWeek ?? 4, 1, 168)}
      {num('advanceDays', s.advance, space?.advanceDays ?? 14, 1, 365)}
      <div>
        <button type="submit" className={styles.submit}>
          {space ? s.save : s.newSpace}
        </button>
      </div>
    </form>
  );
}
