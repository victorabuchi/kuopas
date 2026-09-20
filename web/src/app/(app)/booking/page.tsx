import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './booking.module.css';
import TopBar from '../TopBar';
import KindIcon from './kind-icon';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { nowMs } from '../../../lib/time';
import { getBookingContext, loadAmenities, isSpaceKind, type AmenityKind } from '../../../lib/booking';
import { respondToInviteAction, cancelSpaceBookingAction } from '../../../lib/booking-actions';

export const metadata: Metadata = {
  title: 'Booking - Kuopas',
};

type Item = {
  key: string;
  at: number;
  title: string;
  when: string;
  meta: string;
  href: string;
  action?: { kind: 'leave'; bookingKind: 'sauna' | 'space'; bookingId: string } | { kind: 'cancel'; bookingId: string; spaceId: string };
};

export default async function BookingHubPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const ctx = await getBookingContext(session.tenantId);
  if (!ctx) redirect('/login');

  const locale = await getLocale();
  const t = getLiving(locale).booking;
  const now = nowMs();
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const amenities = await loadAmenities(ctx.buildingId, ctx.unitId);
  const available = amenities.filter((a) => a.available);
  const spaces = (await db.orm.public.BookableSpace.where({ buildingId: ctx.buildingId }).orderBy((s) => s.name.asc()).all()).filter(
    (s) => isSpaceKind(s.kind) && available.some((a) => a.kind === s.kind),
  );

  type Card = { key: string; kind: AmenityKind; name: string; blurb: string; href: string };
  const cards: Card[] = [];
  for (const a of available) {
    if (a.kind === 'laundry' || a.kind === 'sauna' || a.kind === 'parking') {
      cards.push({ key: a.kind, kind: a.kind, name: t.kinds[a.kind].name, blurb: t.kinds[a.kind].blurb.replace('{n}', String(a.count)), href: `/${a.kind}` });
    }
  }
  for (const s of spaces) {
    if (!isSpaceKind(s.kind)) continue;
    cards.push({
      key: s.id,
      kind: s.kind,
      name: s.name,
      blurb: s.description || t.kinds[s.kind].blurb,
      href: `/booking/space/${s.id}`,
    });
  }

  // Invitations and accepted group bookings.
  const participations = await db.orm.public.BookingParticipant.where({ tenantId: ctx.tenantId }).all();
  const active = participations.filter((p) => p.status !== 'declined');
  const saunaIds = active.filter((p) => p.kind === 'sauna').map((p) => p.bookingId);
  const spaceIds = active.filter((p) => p.kind === 'space').map((p) => p.bookingId);
  const joinedSauna = saunaIds.length
    ? await db.orm.public.SaunaBooking.where((b) => b.id.in(saunaIds)).include('slot', (s) => s).include('tenant', (x) => x).all()
    : [];
  const joinedSpace = spaceIds.length
    ? await db.orm.public.SpaceBooking.where((b) => b.id.in(spaceIds)).include('space', (s) => s).include('tenant', (x) => x).all()
    : [];
  const statusOf = (kind: string, id: string) => active.find((p) => p.kind === kind && p.bookingId === id)?.status;

  type Invite = { key: string; kind: 'sauna' | 'space'; bookingId: string; title: string; when: string; by: string; at: number };
  const invites: Invite[] = [];
  const items: Item[] = [];

  for (const b of joinedSauna) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const at = new Date(b.startsAt).getTime();
    if (statusOf('sauna', b.id) === 'invited') {
      invites.push({ key: `sauna-${b.id}`, kind: 'sauna', bookingId: b.id, title: b.slot!.label, when: fmt(b.startsAt), by: b.tenant!.name, at });
    } else {
      items.push({ key: `sauna-j-${b.id}`, at, title: b.slot!.label, when: fmt(b.startsAt), meta: `${t.organiser}: ${b.tenant!.name}`, href: '/sauna', action: { kind: 'leave', bookingKind: 'sauna', bookingId: b.id } });
    }
  }
  for (const b of joinedSpace) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const at = new Date(b.startsAt).getTime();
    if (statusOf('space', b.id) === 'invited') {
      invites.push({ key: `space-${b.id}`, kind: 'space', bookingId: b.id, title: b.space!.name, when: fmt(b.startsAt), by: b.tenant!.name, at });
    } else {
      items.push({ key: `space-j-${b.id}`, at, title: b.space!.name, when: fmt(b.startsAt), meta: `${t.organiser}: ${b.tenant!.name}`, href: `/booking/space/${b.spaceId}`, action: { kind: 'leave', bookingKind: 'space', bookingId: b.id } });
    }
  }

  // My own bookings.
  const groupRows = await db.orm.public.BookingParticipant.all();
  const groupSize = (kind: string, id: string) => groupRows.filter((p) => p.kind === kind && p.bookingId === id && p.status !== 'declined').length;

  const myLaundry = await db.orm.public.LaundryBooking.where({ tenantId: ctx.tenantId }).include('machine', (m) => m).all();
  for (const b of myLaundry) {
    if (new Date(b.endsAt).getTime() < now) continue;
    items.push({ key: `laundry-${b.id}`, at: new Date(b.startsAt).getTime(), title: `${t.kinds.laundry.name}: ${b.machine!.label}`, when: fmt(b.startsAt), meta: t.you, href: '/laundry' });
  }
  const mySauna = await db.orm.public.SaunaBooking.where({ tenantId: ctx.tenantId }).include('slot', (s) => s).all();
  for (const b of mySauna) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const n = groupSize('sauna', b.id);
    items.push({ key: `sauna-${b.id}`, at: new Date(b.startsAt).getTime(), title: b.slot!.label, when: fmt(b.startsAt), meta: n > 0 ? t.withCount.replace('{n}', String(n)) : t.you, href: '/sauna' });
  }
  const mySpaces = await db.orm.public.SpaceBooking.where({ tenantId: ctx.tenantId }).include('space', (s) => s).all();
  for (const b of mySpaces) {
    if (new Date(b.endsAt).getTime() < now) continue;
    const n = groupSize('space', b.id);
    items.push({
      key: `space-${b.id}`,
      at: new Date(b.startsAt).getTime(),
      title: b.space!.name,
      when: fmt(b.startsAt),
      meta: n > 0 ? t.withCount.replace('{n}', String(n)) : t.you,
      href: `/booking/space/${b.spaceId}`,
      action: { kind: 'cancel', bookingId: b.id, spaceId: b.spaceId },
    });
  }
  const spot = await db.orm.public.ParkingSpot.where({ tenantId: ctx.tenantId }).first();
  items.sort((a, b) => a.at - b.at);

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.content}>
        <p className={styles.lede}>{t.lede}</p>

        {invites.length > 0 && (
          <section>
            <h2 className={styles.heading}>{t.invitesHeading}</h2>
            <div className={styles.list}>
              {invites.sort((a, b) => a.at - b.at).map((inv) => (
                <div key={inv.key} className={`${styles.row} ${styles.invite}`}>
                  <div className={styles.rowText}>
                    <span className={styles.rowTitle}>{inv.title}</span>
                    <span className={styles.rowMeta}>
                      {inv.by} {t.invitedBy} {inv.when}
                    </span>
                  </div>
                  <form action={respondToInviteAction} className={styles.rowActions}>
                    <input type="hidden" name="kind" value={inv.kind} />
                    <input type="hidden" name="bookingId" value={inv.bookingId} />
                    <button type="submit" name="decision" value="accept" className={styles.btn}>
                      {t.accept}
                    </button>
                    <button type="submit" name="decision" value="decline" className={`${styles.btn} ${styles.btnGhost}`}>
                      {t.decline}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className={styles.heading}>{t.availableHeading}</h2>
          {cards.length === 0 ? (
            <div className={styles.empty}>{t.nothing}</div>
          ) : (
            <div className={styles.cards}>
              {cards.map((c) => (
                <Link key={c.key} href={c.href} className={styles.card}>
                  <span className={styles.cardIcon}>
                    <KindIcon kind={c.kind} />
                  </span>
                  <span className={styles.cardName}>{c.name}</span>
                  <span className={styles.cardBlurb}>{c.blurb}</span>
                  <span className={styles.cardOpen}>{t.open} &rsaquo;</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className={styles.heading}>{t.upcomingHeading}</h2>
          {items.length === 0 && !spot ? (
            <div className={styles.empty}>{t.noUpcoming}</div>
          ) : (
            <div className={styles.list}>
              {spot && (
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <span className={styles.rowTitle}>
                      {t.parkingHeld}: {spot.label}
                    </span>
                    <span className={styles.rowMeta}>{t.you}</span>
                  </div>
                  <Link href="/parking" className={`${styles.btn} ${styles.btnGhost}`}>
                    {t.manage}
                  </Link>
                </div>
              )}
              {items.map((item) => (
                <div key={item.key} className={styles.row}>
                  <div className={styles.rowText}>
                    <span className={styles.rowTitle}>{item.title}</span>
                    <span className={styles.rowMeta}>
                      {item.when} &middot; {item.meta}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Link href={item.href} className={`${styles.btn} ${styles.btnGhost}`}>
                      {t.manage}
                    </Link>
                    {item.action?.kind === 'leave' && (
                      <form action={respondToInviteAction}>
                        <input type="hidden" name="kind" value={item.action.bookingKind} />
                        <input type="hidden" name="bookingId" value={item.action.bookingId} />
                        <button type="submit" name="decision" value="decline" className={`${styles.btn} ${styles.btnGhost}`}>
                          {t.leave}
                        </button>
                      </form>
                    )}
                    {item.action?.kind === 'cancel' && (
                      <form action={cancelSpaceBookingAction}>
                        <input type="hidden" name="bookingId" value={item.action.bookingId} />
                        <input type="hidden" name="spaceId" value={item.action.spaceId} />
                        <input type="hidden" name="week" value="" />
                        <input type="hidden" name="returnTo" value="hub" />
                        <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                          {t.cancel}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
