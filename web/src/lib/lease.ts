// Academic-calendar lease maths. All dates are handled as UTC calendar days.

export type LeaseKind = 'academic_9m' | 'autumn' | 'spring' | 'summer' | 'rolling_12m' | 'custom';
export const LEASE_KINDS: LeaseKind[] = ['academic_9m', 'autumn', 'spring', 'summer', 'rolling_12m', 'custom'];

const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function parseDay(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return utcDay(y!, m! - 1, d!);
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Standard Finnish student terms: autumn Aug-Dec, spring Jan-May, summer Jun-Aug,
// and a 9-month academic year from September to May.
export function presetDates(kind: LeaseKind, startYear: number): { start: Date; end: Date } {
  switch (kind) {
    case 'academic_9m':
      return { start: utcDay(startYear, 8, 1), end: utcDay(startYear + 1, 4, 31) };
    case 'autumn':
      return { start: utcDay(startYear, 7, 1), end: utcDay(startYear, 11, 31) };
    case 'spring':
      return { start: utcDay(startYear, 0, 1), end: utcDay(startYear, 4, 31) };
    case 'summer':
      return { start: utcDay(startYear, 5, 1), end: utcDay(startYear, 7, 31) };
    case 'rolling_12m':
      return { start: utcDay(startYear, 8, 1), end: utcDay(startYear + 1, 7, 31) };
    default:
      return { start: utcDay(startYear, 8, 1), end: utcDay(startYear + 1, 4, 31) };
  }
}

export type PlannedCharge = {
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  prorated: boolean;
  dueDate: Date;
};

// One charge per calendar month the lease touches. Partial first and last
// months are prorated by day; rent is due on the first day of each period.
export function buildCharges(start: Date, end: Date, monthlyRentCents: number): PlannedCharge[] {
  if (end.getTime() < start.getTime()) return [];
  const charges: PlannedCharge[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();

  while (utcDay(year, month, 1).getTime() <= end.getTime()) {
    const monthStart = utcDay(year, month, 1);
    const monthEnd = utcDay(year, month, daysInMonth(year, month));
    const periodStart = start.getTime() > monthStart.getTime() ? start : monthStart;
    const periodEnd = end.getTime() < monthEnd.getTime() ? end : monthEnd;
    const days = Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS) + 1;
    const total = daysInMonth(year, month);
    const prorated = days < total;

    charges.push({
      periodStart,
      periodEnd,
      amountCents: prorated ? Math.round((monthlyRentCents * days) / total) : monthlyRentCents,
      prorated,
      dueDate: periodStart,
    });

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return charges;
}

export function formatMoney(cents: number, locale = 'en-FI'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
