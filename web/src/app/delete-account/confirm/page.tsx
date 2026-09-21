import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../../auth.module.css';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { readDeletionToken } from '../../../lib/account-deletion';
import { confirmAccountDeletionAction } from '../../../lib/account-actions';
import { redirect } from 'next/navigation';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Confirm deletion - Kuopas',
  robots: { index: false },
};

// Opening the emailed link only shows this page. Deleting needs the button,
// so mail scanners that pre-open links cannot delete anyone's account.
export default async function ConfirmDeletionPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token || !readDeletionToken(token)) redirect('/delete-account?error=token');
  const t = getLiving(await getLocale()).account;

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <Link href="/" className={styles.logoLink}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={160} height={66} className={styles.logoImg} priority />
        <h1>{t.confirmTitle}</h1>
      </Link>
      <form action={confirmAccountDeletionAction} className={styles.card}>
        <input type="hidden" name="token" value={token} />
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{t.confirmBody}</p>
        <button type="submit" className={styles.submit} style={{ background: '#b3261e' }}>
          {t.confirmButton}
        </button>
        <Link href="/" style={{ fontSize: 14 }}>
          {t.cancel}
        </Link>
      </form>
    </div>
  );
}
