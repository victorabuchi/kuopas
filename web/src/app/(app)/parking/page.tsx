import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './parking.module.css';
import TopBar from '../TopBar';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import { claimParkingSpotAction, releaseParkingSpotAction } from '../../../lib/parking-actions';

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
      <TopBar title="Parking" />

      {error && <div className={styles.error}>{error}</div>}

      <p className={styles.rules}>One spot per tenant. Release yours if you no longer need it.</p>

      {spots.length === 0 ? (
        <div className={styles.rules}>No parking spots are set up for {building.name} yet.</div>
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
                  {isMine ? 'Your spot' : isTaken ? `Taken by ${spot.tenant!.name}` : 'Free'}
                </span>
                {isMine && (
                  <form action={releaseParkingSpotAction}>
                    <input type="hidden" name="spotId" value={spot.id} />
                    <button type="submit" className={`${styles.spotButton} ${styles.spotButtonRelease}`}>
                      Release
                    </button>
                  </form>
                )}
                {!isMine && !isTaken && (
                  <form action={claimParkingSpotAction}>
                    <input type="hidden" name="spotId" value={spot.id} />
                    <button type="submit" className={styles.spotButton}>
                      Claim
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
