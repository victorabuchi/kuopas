'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { setLocaleAction } from '../../lib/i18n-actions';
import type { Locale } from '../../lib/i18n';
import styles from './language-switcher.module.css';

const LABELS: Record<Locale, string> = { en: 'English', fi: 'Suomi' };

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setLocaleAction} className={styles.switcher}>
      <input type="hidden" name="redirectTo" value={pathname} />
      <select
        name="locale"
        defaultValue={locale}
        onChange={() => formRef.current?.requestSubmit()}
        className={styles.select}
        aria-label={LABELS[locale]}
      >
        {(Object.keys(LABELS) as Locale[]).map((value) => (
          <option key={value} value={value}>
            {LABELS[value]}
          </option>
        ))}
      </select>
    </form>
  );
}
