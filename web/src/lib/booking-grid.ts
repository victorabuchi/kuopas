// Shared week-grid math reused by every hourly-slot booking feature (laundry, sauna, ...).

// Monday-based week start, at local midnight, for the week containing `date`.
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Local calendar date, not UTC: parseWeekParam reads it back as local midnight,
// so a UTC conversion would land on the previous day in any timezone ahead of UTC.
export function formatWeekParam(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseWeekParam(value: string | undefined): Date {
  if (!value) return getWeekStart(new Date());
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return getWeekStart(new Date());
  return getWeekStart(parsed);
}

export function slotDate(weekStart: Date, dayOffset: number, hour: number): Date {
  const d = addDays(weekStart, dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}
