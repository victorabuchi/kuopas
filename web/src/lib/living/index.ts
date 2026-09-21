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
import { apply } from './apply';
import { intake } from './intake';
import { inspection } from './inspection';
import { flat } from './flat';
import { account } from './account';
import { safety } from './safety';
import { signing } from './signing';

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
    apply: pick(apply, locale),
    intake: pick(intake, locale),
    inspection: pick(inspection, locale),
    flat: pick(flat, locale),
    account: pick(account, locale),
    safety: pick(safety, locale),
    signing: pick(signing, locale),
  };
}
