import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../laundry/laundry.module.css';
import TopBar from '../TopBar';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import { bookSaunaAction, cancelSaunaBookingAction } from '../../../lib/sauna-actions';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { getLiving } from '../../../lib/living';
import { getBookingContext, isAmenityAvailable, loadResidents } from '../../../lib/booking';
import BookingPanel from '../booking/BookingPanel';
import {
  SLOT_START_HOURS,
  SLOT_LENGTH_HOURS,
  MAX_HOURS_PER_WEEK,
  MAX_DAYS_IN_ADVANCE,
  getWeekStart,
  addDays,
  formatWeekParam,
  parseWeekParam,
  slotDate,
} from '../../../lib/sauna';

export const metadata: Metadata = {
  title: 'Sauna - Kuopas',
};

export default async function SaunaPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; week?: string; error?: string; pick?: string }>;
}) {
  const { slot: slotParam, week: weekParam, error, pick } = await searchParams;

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
  if (!bctx || !(await isAmenityAvailable('sauna', bctx))) redirect('/booking');
  const bt = getLiving(locale).booking;

  const slots = await db.orm.public.SaunaSlot.where({ buildingId: building.id })
    .orderBy((s) => s.label.asc())
    .all();

  if (slots.length === 0) {
    return (
      <div className={styles.page}>
        <TopBar title={dict.sauna.title} />
        <div className={styles.empty}>
          {dict.sauna.noneSetUp} {building.name}.
        </div>
      </div>
    );
  }

  const activeSlot = slots.find((s) => s.id === slotParam) ?? slots[0]!;
  const weekStart = parseWeekParam(weekParam);
  const weekParamValue = formatWeekParam(weekStart);
  const weekEnd = addDays(weekStart, 7);

  const bookings = await db.orm.public.SaunaBooking.where({ slotId: activeSlot.id })
    .include('tenant', (t) => t)
    .all();
  const bookingsInWeek = bookings.filter((b) => {
    const t = new Date(b.startsAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  });
  const bookingByStart = new Map(bookingsInWeek.map((b) => [new Date(b.startsAt).toISOString(), b]));

  const now = new Date();
  const maxAdvance = addDays(now, MAX_DAYS_IN_ADVANCE);

  // A picked turn opens the group panel so the booker can bring others.
  const picked = pick ? new Date(pick) : null;
  const pickedValid =
    picked !== null &&
    !Number.isNaN(picked.getTime()) &&
    SLOT_START_HOURS.includes(picked.getHours()) &&
    picked.getTime() > now.getTime() &&
    picked.getTime() <= maxAdvance.getTime() &&
    !bookingByStart.has(picked.toISOString());
  const residents = pickedValid ? await loadResidents(bctx) : { roommates: [], others: [] };
  const pickLink = (iso: string) => `/sauna?slot=${activeSlot.id}&week=${weekParamValue}&pick=${encodeURIComponent(iso)}`;

  return (
    <div className={styles.page}>
      <TopBar title={dict.sauna.title} />
      <Link href="/booking" className={styles.backLink}>
        &lsaquo; {bt.backToBooking}
      </Link>

      <div className={styles.toolbar}>
        <div className={styles.machineTabs}>
          {slots.map((s) => (
            <Link
              key={s.id}
              href={`/sauna?slot=${s.id}&week=${weekParamValue}`}
              className={`${styles.machineTab} ${s.id === activeSlot.id ? styles.machineTabActive : ''}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
        <div className={styles.weekNav}>
          <Link href={`/sauna?slot=${activeSlot.id}&week=${formatWeekParam(addDays(weekStart, -7))}`} className={styles.navBtn} aria-label="Previous week">
            &lsaquo;
          </Link>
          <Link href={`/sauna?slot=${activeSlot.id}&week=${formatWeekParam(getWeekStart(new Date()))}`} className={styles.navBtn}>
            {dict.sauna.today}
          </Link>
          <Link href={`/sauna?slot=${activeSlot.id}&week=${formatWeekParam(addDays(weekStart, 7))}`} className={styles.navBtn} aria-label="Next week">
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

      <p className={styles.rules}>{dict.sauna.rules(SLOT_LENGTH_HOURS, MAX_HOURS_PER_WEEK, MAX_DAYS_IN_ADVANCE)}</p>

      {pickedValid && picked ? (
        <BookingPanel
          action={bookSaunaAction}
          hidden={{ slotId: activeSlot.id, week: weekParamValue, startsAt: picked.toISOString() }}
          whenLabel={`${picked.toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} ${String(picked.getHours()).padStart(2, '0')}-${String(picked.getHours() + SLOT_LENGTH_HOURS).padStart(2, '0')}`}
          hoursOptions={[SLOT_LENGTH_HOURS]}
          capacity={activeSlot.capacity}
          roommates={residents.roommates}
          others={residents.others}
          cancelHref={`/sauna?slot=${activeSlot.id}&week=${weekParamValue}`}
          withNote={false}
          t={bt}
        />
      ) : (
        <p className={styles.rules} style={{ marginTop: 0 }}>
          {bt.pickHint}
        </p>
      )}

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
                <td className={styles.timeCol}>
                  {String(hour).padStart(2, '0')}-{String(hour + SLOT_LENGTH_HOURS).padStart(2, '0')}
                </td>
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
                          <form action={cancelSaunaBookingAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="slotId" value={activeSlot.id} />
                            <input type="hidden" name="week" value={weekParamValue} />
                            <button type="submit" className={styles.cellButton}>
                              {dict.sauna.you}
                            </button>
                          </form>
                        ) : (
                          <span className={styles.cellLabel}>{dict.sauna.booked}</span>
                        )}
                      </td>
                    );
                  }

                  if (isPast || beyondAdvance) {
                    return <td key={dayOffset} className={`${styles.cell} ${styles.cellDisabled}`} />;
                  }

                  const isPicked = pickedValid && picked?.getTime() === date.getTime();
                  return (
                    <td key={dayOffset} className={`${styles.cell} ${styles.cellFree} ${isPicked ? styles.cellPicked : ''}`}>
                      <Link href={pickLink(iso)} className={styles.cellLink} aria-label={`Book ${iso}`} />
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
