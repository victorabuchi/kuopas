import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from '../../(app)/features.module.css';
import TopBar from '../../(app)/TopBar';
import VerifyTab, { type VerifySearch } from '../../(app)/lease/VerifyTab';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';

export const metadata: Metadata = {
  title: 'Verify - Kuopas',
};

export default async function ApplyVerifyPage({ searchParams }: { searchParams: Promise<VerifySearch> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const q = await searchParams;
  const v = getLiving(await getLocale()).verify;

  return (
    <div className={styles.page}>
      <TopBar title={v.title} />
      <div className={styles.content}>
        <VerifyTab tenantId={session.tenantId} v={v} q={q} />
      </div>
    </div>
  );
}
