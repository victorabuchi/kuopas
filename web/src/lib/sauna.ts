export { getWeekStart, addDays, formatWeekParam, parseWeekParam, slotDate } from './booking-grid';

// Sauna turns run in 2-hour evening blocks rather than laundry's hourly slots.
export const SLOT_START_HOURS = [16, 18, 20]; // 16-18, 18-20, 20-22
export const SLOT_LENGTH_HOURS = 2;
export const MAX_HOURS_PER_WEEK = 4;
export const MAX_DAYS_IN_ADVANCE = 7;
