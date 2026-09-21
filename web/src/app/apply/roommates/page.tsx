import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../../(app)/features.module.css';
import TopBar from '../../(app)/TopBar';
import { ProfileTab } from '../../(app)/roommates/ProfileTab';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { isVerified } from '../../../lib/verification';

export const metadata: Metadata = {
  title: 'Profile - Kuopas',
};

export default async function ApplyProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const L = getLiving(await getLocale());
  const verified = await isVerified(session.tenantId);
  const mine = await db.orm.public.MatchProfile.where({ tenantId: session.tenantId }).first();

  return (
    <div className={styles.page}>
      <TopBar title={L.roommates.wizardTitle} />
      <div className={styles.content}>
        {!verified ? (
          <div className={styles.card}>
            <p className={styles.lede}>{L.apply.profileNeedVerify}</p>
            <Link href="/apply/verify" className={styles.btn}>
              {L.apply.goVerify}
            </Link>
          </div>
        ) : (
          <ProfileTab mine={mine ?? null} t={L.roommates} />
        )}
      </div>
    </div>
  );
}
