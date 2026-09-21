import { NextResponse, type NextRequest } from 'next/server';
import { db } from '../../../../prisma/db';
import { sendPushToTenant } from '../../../../lib/push';
import { getSetting, setSetting } from '../../../../lib/settings';
import { checklistCompletion, weekKey } from '../../../../lib/flat';

const LEAD_MS = 90 * 60 * 1000;

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('fi-FI', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit' });
}

// Run this every hour (a Render Cron Job or any scheduler) with
// Authorization: Bearer $CRON_SECRET.
//  - Sends a push about 30-90 minutes before every laundry, sauna and space
//    booking, to the booker and to everyone who accepted a group invitation.
//  - On Thursdays and Fridays nudges flats whose cleaning checklist is mostly
//    undone, once per week per flat.
export async function GET(request: NextRequest) {
  const secret = process.env['CRON_SECRET'];
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Not authorized', { status: 401 });
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let reminded = 0;

  const accepted = await db.orm.public.BookingParticipant.where({ status: 'accepted' }).all();
  const guestsOf = (kind: string, id: string) => accepted.filter((p) => p.kind === kind && p.bookingId === id).map((p) => p.tenantId);
  const due = (b: { startsAt: string; reminderSentAt: string | null }) =>
    !b.reminderSentAt && new Date(b.startsAt).getTime() - now <= LEAD_MS;

  const laundry = await db.orm.public.LaundryBooking.where((b) => b.startsAt.gte(nowIso)).include('machine', (m) => m).all();
  for (const b of laundry.filter(due)) {
    await sendPushToTenant(b.tenantId, {
      title: 'Kuopas',
      body: `Laundry ${b.machine?.label ?? ''} at ${clock(b.startsAt)} / Pesutupa klo ${clock(b.startsAt)}`.replace('  ', ' '),
      url: '/booking',
    }).catch(() => undefined);
    await db.orm.public.LaundryBooking.where({ id: b.id }).update({ reminderSentAt: nowIso });
    reminded += 1;
  }

  const sauna = await db.orm.public.SaunaBooking.where((b) => b.startsAt.gte(nowIso)).include('slot', (s) => s).all();
  for (const b of sauna.filter(due)) {
    for (const id of [b.tenantId, ...guestsOf('sauna', b.id)]) {
      await sendPushToTenant(id, {
        title: 'Kuopas',
        body: `${b.slot?.label ?? 'Sauna'} at ${clock(b.startsAt)} / klo ${clock(b.startsAt)}`,
        url: '/booking',
      }).catch(() => undefined);
    }
    await db.orm.public.SaunaBooking.where({ id: b.id }).update({ reminderSentAt: nowIso });
    reminded += 1;
  }

  const spaces = await db.orm.public.SpaceBooking.where((b) => b.startsAt.gte(nowIso)).include('space', (s) => s).all();
  for (const b of spaces.filter(due)) {
    for (const id of [b.tenantId, ...guestsOf('space', b.id)]) {
      await sendPushToTenant(id, {
        title: 'Kuopas',
        body: `${b.space?.name ?? 'Booking'} at ${clock(b.startsAt)} / klo ${clock(b.startsAt)}`,
        url: '/booking',
      }).catch(() => undefined);
    }
    await db.orm.public.SpaceBooking.where({ id: b.id }).update({ reminderSentAt: nowIso });
    reminded += 1;
  }

  // Cleaning checklist nudge.
  let nudged = 0;
  const weekday = new Date(now).toLocaleDateString('en-US', { timeZone: 'Europe/Helsinki', weekday: 'short' });
  if (weekday === 'Thu' || weekday === 'Fri') {
    const week = weekKey(new Date(now));
    const items = await db.orm.public.CleaningItem.where({ active: true }).all();
    for (const unitId of [...new Set(items.map((i) => i.unitId))]) {
      const key = `cleaning-nudge:${unitId}`;
      if ((await getSetting(key)) === week) continue;
      const rate = await checklistCompletion(unitId, 1, new Date(now));
      if (rate === null || rate >= 50) continue;
      const residents = await db.orm.public.Tenant.where({ unitId }).all();
      for (const r of residents) {
        await sendPushToTenant(r.id, { title: 'Kuopas', body: 'The cleaning checklist is mostly undone this week / Siivouslista on suurelta osin tekemättä', url: '/household?tab=cleaning' }).catch(() => undefined);
      }
      await setSetting(key, week);
      nudged += 1;
    }
  }

  return NextResponse.json({ reminded, nudged });
}
