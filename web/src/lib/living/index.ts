import type { Locale } from '../i18n';
import { verify } from './verify';
import { lease } from './lease';
import { staff } from './staff';
import { admin } from './admin';
import { household } from './household';
import { roommates } from './roommates';
import { market } from './market';
import { maintenance } from './maintenance';
import { wellbeing } from './wellbeing';
import { booking } from './booking';

function pick<T>(section: { en: T; fi: T }, locale: Locale): T {
  return locale === 'fi' ? section.fi : section.en;
}

export function getLiving(locale: Locale) {
  return {
    verify: pick(verify, locale),
    lease: pick(lease, locale),
    staff: pick(staff, locale),
    admin: pick(admin, locale),
    household: pick(household, locale),
    roommates: pick(roommates, locale),
    market: pick(market, locale),
    maintenance: pick(maintenance, locale),
    wellbeing: pick(wellbeing, locale),
    booking: pick(booking, locale),
  };
}
