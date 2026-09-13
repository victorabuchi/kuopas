import Image from 'next/image';
import styles from './top-bar.module.css';
import LanguageSwitcher from './LanguageSwitcher';
import { getLocale } from '../../lib/i18n';

export default async function TopBar({ title }: { title: string }) {
  const locale = await getLocale();

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={92} height={38} className={styles.logo} priority />
        <span className={styles.title}>{title}</span>
        <div className={styles.spacer} />
        <LanguageSwitcher locale={locale} />
      </div>
      <div className={styles.accent} />
    </div>
  );
}
