import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './parking.module.css';
import TopBar from '../TopBar';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import { claimParkingSpotAction, releaseParkingSpotAction } from '../../../lib/parking-actions';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';

export const metadata: Metadata = {
  title: 'Parking - Kuopas',
};

export default async function ParkingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .first();
  if (!tenant) redirect('/login');

  const building = tenant.unit!.stairwell!.building!;

  const spots = await db.orm.public.ParkingSpot.where({ buildingId: building.id })
    .include('tenant', (t) => t)
    .orderBy((s) => s.label.asc())
    .all();

  return (
    <div className={styles.page}>
      <TopBar title={dict.parking.title} />

      {error && <div className={styles.error}>{error}</div>}

      <p className={styles.rules}>{dict.parking.rules}</p>

      {spots.length === 0 ? (
        <div className={styles.rules}>
          {dict.parking.noneSetUp} {building.name}.
        </div>
      ) : (
        <div className={styles.grid}>
          {spots.map((spot) => {
            const isMine = spot.tenantId === session.tenantId;
            const isTaken = Boolean(spot.tenantId);
            return (
              <div
                key={spot.id}
                className={`${styles.spot} ${isMine ? styles.spotMine : isTaken ? styles.spotTaken : styles.spotFree}`}
              >
                <span className={styles.spotLabel}>{spot.label}</span>
                <span className={styles.spotStatus}>
                  {isMine
                    ? dict.parking.yourSpot
                    : isTaken
                      ? `${dict.parking.takenBy} ${spot.tenant!.name}`
                      : dict.parking.free}
                </span>
                {isMine && (
                  <form action={releaseParkingSpotAction}>
                    <input type="hidden" name="spotId" value={spot.id} />
                    <button type="submit" className={`${styles.spotButton} ${styles.spotButtonRelease}`}>
                      {dict.parking.release}
                    </button>
                  </form>
                )}
                {!isMine && !isTaken && (
                  <form action={claimParkingSpotAction}>
                    <input type="hidden" name="spotId" value={spot.id} />
                    <button type="submit" className={styles.spotButton}>
                      {dict.parking.claim}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
