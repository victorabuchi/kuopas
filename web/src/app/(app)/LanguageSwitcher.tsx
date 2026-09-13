'use client';

import { usePathname } from 'next/navigation';
import { setLocaleAction } from '../../lib/i18n-actions';
import type { Locale } from '../../lib/i18n';
import styles from './language-switcher.module.css';

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <form action={setLocaleAction} className={styles.switcher}>
      <input type="hidden" name="redirectTo" value={pathname} />
      <button
        type="submit"
        name="locale"
        value="en"
        className={`${styles.option} ${locale === 'en' ? styles.optionActive : ''}`}
      >
        EN
      </button>
      <button
        type="submit"
        name="locale"
        value="fi"
        className={`${styles.option} ${locale === 'fi' ? styles.optionActive : ''}`}
      >
        FI
      </button>
    </form>
  );
}
