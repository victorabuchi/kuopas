import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './laundry.module.css';
import TopBar from '../TopBar';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import { bookSlotAction, cancelBookingAction } from '../../../lib/laundry-actions';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { getLiving } from '../../../lib/living';
import { getBookingContext, isAmenityAvailable } from '../../../lib/booking';
import {
  SLOT_START_HOURS,
  MAX_HOURS_PER_WEEK,
  MAX_DAYS_IN_ADVANCE,
  getWeekStart,
  addDays,
  formatWeekParam,
  parseWeekParam,
  slotDate,
} from '../../../lib/laundry';

export const metadata: Metadata = {
  title: 'Laundry - Kuopas',
};

export default async function LaundryPage({
  searchParams,
}: {
  searchParams: Promise<{ machine?: string; week?: string; error?: string }>;
}) {
  const { machine: machineParam, week: weekParam, error } = await searchParams;

  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const dayLabels = [
    dict.days.mon,
    dict.days.tue,
    dict.days.wed,
    dict.days.thu,
    dict.days.fri,
    dict.days.sat,
    dict.days.sun,
  ];

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .first();
  if (!tenant) redirect('/login');

  const building = tenant.unit!.stairwell!.building!;

  const bctx = await getBookingContext(session.tenantId);
  if (!bctx || !(await isAmenityAvailable('laundry', bctx))) redirect('/booking');
  const backLabel = getLiving(locale).booking.backToBooking;

  const machines = await db.orm.public.LaundryMachine.where({ buildingId: building.id })
    .orderBy((m) => m.label.asc())
    .all();

  if (machines.length === 0) {
    return (
      <div className={styles.page}>
        <TopBar title={dict.laundry.title} />
        <div className={styles.empty}>
          {dict.laundry.noneSetUp} {building.name}.
        </div>
      </div>
    );
  }

  const activeMachine = machines.find((m) => m.id === machineParam) ?? machines[0]!;
  const weekStart = parseWeekParam(weekParam);
  const weekParamValue = formatWeekParam(weekStart);
  const weekEnd = addDays(weekStart, 7);

  const bookings = await db.orm.public.LaundryBooking.where({ machineId: activeMachine.id })
    .include('tenant', (t) => t)
    .all();
  const bookingsInWeek = bookings.filter((b) => {
    const t = new Date(b.startsAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  });
  const bookingByStart = new Map(bookingsInWeek.map((b) => [new Date(b.startsAt).toISOString(), b]));

  const now = new Date();
  const maxAdvance = addDays(now, MAX_DAYS_IN_ADVANCE);

  return (
    <div className={styles.page}>
      <TopBar title={dict.laundry.title} />
      <Link href="/booking" className={styles.backLink}>
        &lsaquo; {backLabel}
      </Link>

      <div className={styles.toolbar}>
        <div className={styles.machineTabs}>
          {machines.map((m) => (
            <Link
              key={m.id}
              href={`/laundry?machine=${m.id}&week=${weekParamValue}`}
              className={`${styles.machineTab} ${m.id === activeMachine.id ? styles.machineTabActive : ''}`}
            >
              {m.label}
            </Link>
          ))}
        </div>
        <div className={styles.weekNav}>
          <Link href={`/laundry?machine=${activeMachine.id}&week=${formatWeekParam(addDays(weekStart, -7))}`} className={styles.navBtn} aria-label="Previous week">
            &lsaquo;
          </Link>
          <Link href={`/laundry?machine=${activeMachine.id}&week=${formatWeekParam(getWeekStart(new Date()))}`} className={styles.navBtn}>
            {dict.laundry.today}
          </Link>
          <Link href={`/laundry?machine=${activeMachine.id}&week=${formatWeekParam(addDays(weekStart, 7))}`} className={styles.navBtn} aria-label="Next week">
            &rsaquo;
          </Link>
          <span className={styles.weekLabel}>
            {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {' - '}
            {addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <p className={styles.rules}>{dict.laundry.rules(MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE)}</p>

      <div className={styles.gridWrap}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.timeCol} />
              {dayLabels.map((label, i) => (
                <th key={label} className={styles.dayHead}>
                  {label}
                  <span className={styles.dayDate}>{addDays(weekStart, i).getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOT_START_HOURS.map((hour) => (
              <tr key={hour}>
                <td className={styles.timeCol}>{String(hour).padStart(2, '0')}:00</td>
                {dayLabels.map((_, dayOffset) => {
                  const date = slotDate(weekStart, dayOffset, hour);
                  const iso = date.toISOString();
                  const booking = bookingByStart.get(iso);
                  const isPast = date.getTime() < now.getTime();
                  const beyondAdvance = date.getTime() > maxAdvance.getTime();

                  if (booking) {
                    const isMine = booking.tenantId === session.tenantId;
                    return (
                      <td key={dayOffset} className={`${styles.cell} ${isMine ? styles.cellMine : styles.cellBooked}`}>
                        {isMine ? (
                          <form action={cancelBookingAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="machineId" value={activeMachine.id} />
                            <input type="hidden" name="week" value={weekParamValue} />
                            <button type="submit" className={styles.cellButton}>
                              {dict.laundry.you}
                            </button>
                          </form>
                        ) : (
                          <span className={styles.cellLabel}>{dict.laundry.booked}</span>
                        )}
                      </td>
                    );
                  }

                  if (isPast || beyondAdvance) {
                    return <td key={dayOffset} className={`${styles.cell} ${styles.cellDisabled}`} />;
                  }

                  return (
                    <td key={dayOffset} className={`${styles.cell} ${styles.cellFree}`}>
                      <form action={bookSlotAction}>
                        <input type="hidden" name="machineId" value={activeMachine.id} />
                        <input type="hidden" name="week" value={weekParamValue} />
                        <input type="hidden" name="startsAt" value={iso} />
                        <button type="submit" className={styles.cellButton} aria-label={`Book ${iso}`} />
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
