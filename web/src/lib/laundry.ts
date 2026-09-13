export { getWeekStart, addDays, formatWeekParam, parseWeekParam, slotDate } from './booking-grid';

// Laundry room door hours: 07:00-22:00, one-hour machine slots.
export const SLOT_START_HOURS = Array.from({ length: 15 }, (_, i) => 7 + i); // 7..21
export const MAX_HOURS_PER_WEEK = 6;
export const MAX_DAYS_IN_ADVANCE = 7;
