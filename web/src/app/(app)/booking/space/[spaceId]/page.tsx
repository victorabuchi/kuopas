import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import laundry from '../../../laundry/laundry.module.css';
import styles from '../../booking.module.css';
import TopBar from '../../../TopBar';
import BookingPanel from '../../BookingPanel';
import { getSession } from '../../../../../lib/session';
import { db } from '../../../../../prisma/db';
import { getLocale } from '../../../../../lib/i18n';
import { getDictionary } from '../../../../../lib/dictionary';
import { getLiving } from '../../../../../lib/living';
import { nowMs } from '../../../../../lib/time';
import { addDays, formatWeekParam, getWeekStart, parseWeekParam, slotDate } from '../../../../../lib/booking-grid';
import { getBookingContext, isAmenityAvailable, isSpaceKind, loadResidents, MAX_REPEAT_WEEKS } from '../../../../../lib/booking';
import { bookSpaceAction, cancelSpaceBookingAction } from '../../../../../lib/booking-actions';

export const metadata: Metadata = {
  title: 'Booking - Kuopas',
};

export default async function SpaceBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ week?: string; pick?: string; error?: string; skipped?: string }>;
}) {
  const { spaceId } = await params;
  const { week: weekParam, pick, error, skipped } = await searchParams;

  const session = await getSession();
  if (!session) redirect('/login');
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx) redirect('/login');

  const space = await db.orm.public.BookableSpace.where({ id: spaceId }).first();
  if (!space || space.buildingId !== ctx.buildingId || !isSpaceKind(space.kind)) notFound();
  if (!(await isAmenityAvailable(space.kind, ctx))) redirect('/booking');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = getLiving(locale).booking;
  const dayLabels = [dict.days.mon, dict.days.tue, dict.days.wed, dict.days.thu, dict.days.fri, dict.days.sat, dict.days.sun];

  const weekStart = parseWeekParam(weekParam);
  const weekValue = formatWeekParam(weekStart);
  const weekEnd = addDays(weekStart, 7);
  const now = nowMs();
  const maxAdvance = addDays(new Date(now), space.advanceDays).getTime();

  const bookings = await db.orm.public.SpaceBooking.where({ spaceId }).all();
  const busy = (start: Date, hours = 1) => {
    const a = start.getTime();
    const b = a + hours * 3_600_000;
    return bookings.find((x) => new Date(x.startsAt).getTime() < b && a < new Date(x.endsAt).getTime());
  };

  const hours: number[] = [];
  for (let h = space.openHour; h < space.closeHour; h += 1) hours.push(h);

  // A picked start opens the booking panel, limited to the free run after it.
  const picked = pick ? new Date(pick) : null;
  let pickedOptions: number[] = [];
  if (
    picked &&
    !Number.isNaN(picked.getTime()) &&
    picked.getTime() > now &&
    picked.getTime() <= maxAdvance &&
    picked.getHours() >= space.openHour &&
    picked.getHours() < space.closeHour &&
    !busy(picked)
  ) {
    const room = Math.min(space.maxHoursPerBooking, space.closeHour - picked.getHours());
    for (let n = 1; n <= room; n += 1) {
      const next = new Date(picked);
      next.setHours(next.getHours() + (n - 1));
      if (busy(next)) break;
      pickedOptions.push(n);
    }
  } else {
    pickedOptions = [];
  }
  const residents = pickedOptions.length ? await loadResidents(ctx) : { roommates: [], others: [] };
  const link = (w: string, p?: string) => `/booking/space/${spaceId}?week=${w}${p ? `&pick=${encodeURIComponent(p)}` : ''}`;

  return (
    <div className={laundry.page}>
      <TopBar title={space.name} />
      <Link href="/booking" className={styles.backLink}>
        &lsaquo; {t.backToBooking}
      </Link>

      <div className={laundry.toolbar}>
        <span className={laundry.weekLabel} style={{ marginLeft: 0 }}>
          {space.description}
        </span>
        <div className={laundry.weekNav}>
          <Link href={link(formatWeekParam(addDays(weekStart, -7)))} className={laundry.navBtn} aria-label="Previous week">
            &lsaquo;
          </Link>
          <Link href={link(formatWeekParam(getWeekStart(new Date(now))))} className={laundry.navBtn}>
            {t.today}
          </Link>
          <Link href={link(formatWeekParam(addDays(weekStart, 7)))} className={laundry.navBtn} aria-label="Next week">
            &rsaquo;
          </Link>
          <span className={laundry.weekLabel}>
            {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {' - '}
            {addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {error && <div className={laundry.error}>{error}</div>}
      {skipped && <div className={laundry.error}>{t.skipped.replace('{n}', skipped)}</div>}

      <p className={laundry.rules}>
        {t.rulesSpace
          .replace('{perBooking}', String(space.maxHoursPerBooking))
          .replace('{perWeek}', String(space.maxHoursPerWeek))
          .replace('{advance}', String(space.advanceDays))
          .replace('{open}', String(space.openHour).padStart(2, '0'))
          .replace('{close}', String(space.closeHour).padStart(2, '0'))}{' '}
        {t.capacity.replace('{n}', String(space.capacity))}
      </p>

      {pickedOptions.length > 0 && picked ? (
        <BookingPanel
          action={bookSpaceAction}
          hidden={{ spaceId, week: weekValue, startsAt: picked.toISOString() }}
          whenLabel={`${picked.toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} ${String(picked.getHours()).padStart(2, '0')}:00`}
          hoursOptions={pickedOptions}
          capacity={space.capacity}
          roommates={residents.roommates}
          others={residents.others}
          cancelHref={link(weekValue)}
          withNote
          repeatMax={MAX_REPEAT_WEEKS}
          t={t}
        />
      ) : (
        <p className={laundry.rules} style={{ marginTop: 0 }}>
          {t.pickHint}
        </p>
      )}

      <div className={laundry.gridWrap}>
        <table className={laundry.grid}>
          <thead>
            <tr>
              <th className={laundry.timeCol} />
              {dayLabels.map((label, i) => (
                <th key={label} className={laundry.dayHead}>
                  {label}
                  <span className={laundry.dayDate}>{addDays(weekStart, i).getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className={laundry.timeCol}>{String(hour).padStart(2, '0')}:00</td>
                {dayLabels.map((_, dayOffset) => {
                  const date = slotDate(weekStart, dayOffset, hour);
                  const iso = date.toISOString();
                  const booking = busy(date);
                  const inWeek = date.getTime() >= weekStart.getTime() && date.getTime() < weekEnd.getTime();

                  if (booking) {
                    const mine = booking.tenantId === ctx.tenantId;
                    return (
                      <td key={dayOffset} className={`${laundry.cell} ${mine ? laundry.cellMine : laundry.cellBooked}`}>
                        {mine ? (
                          <form action={cancelSpaceBookingAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="spaceId" value={spaceId} />
                            <input type="hidden" name="week" value={weekValue} />
                            <button type="submit" className={laundry.cellButton}>
                              {t.you}
                            </button>
                          </form>
                        ) : (
                          <span className={laundry.cellLabel}>{t.booked}</span>
                        )}
                      </td>
                    );
                  }
                  if (!inWeek || date.getTime() < now || date.getTime() > maxAdvance) {
                    return <td key={dayOffset} className={`${laundry.cell} ${laundry.cellDisabled}`} />;
                  }
                  const isPicked = picked?.getTime() === date.getTime();
                  return (
                    <td key={dayOffset} className={`${laundry.cell} ${laundry.cellFree} ${isPicked ? laundry.cellPicked : ''}`}>
                      <Link href={link(weekValue, iso)} className={laundry.cellLink} aria-label={`${t.free} ${iso}`} />
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
