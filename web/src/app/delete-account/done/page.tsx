import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../../auth.module.css';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Account deleted - Kuopas',
  robots: { index: false },
};

export default async function AccountDeletedPage() {
  const t = getLiving(await getLocale()).account;
  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <Link href="/" className={styles.logoLink}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={160} height={66} className={styles.logoImg} priority />
        <h1>{t.doneTitle}</h1>
      </Link>
      <div className={styles.card}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{t.doneBody}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>{t.contact}</p>
        <Link href="/">{t.back}</Link>
      </div>
    </div>
  );
}
