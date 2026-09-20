import Link from 'next/link';
import styles from './booking.module.css';
import type { Resident } from '../../../lib/booking';
import type { getLiving } from '../../../lib/living';

type T = ReturnType<typeof getLiving>['booking'];

export default function BookingPanel({
  action,
  hidden,
  whenLabel,
  hoursOptions,
  capacity,
  roommates,
  others,
  cancelHref,
  withNote,
  t,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  whenLabel: string;
  hoursOptions: number[];
  capacity: number;
  roommates: Resident[];
  others: Resident[];
  cancelHref: string;
  withNote: boolean;
  t: T;
}) {
  return (
    <form action={action} className={styles.panel}>
      <h2 className={styles.panelTitle}>{t.panelHeading}</h2>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className={styles.rowMeta}>
        {t.selected}: <strong>{whenLabel}</strong>
      </div>

      {hoursOptions.length > 1 && (
        <label className={styles.field}>
          {t.length}
          <select name="hours" className={styles.select} defaultValue={hoursOptions[0]}>
            {hoursOptions.map((n) => (
              <option key={n} value={n}>
                {t.hoursOption.replace('{n}', String(n))}
              </option>
            ))}
          </select>
        </label>
      )}
      {withNote && (
        <label className={styles.field}>
          {t.note}
          <input name="note" maxLength={200} placeholder={t.notePlaceholder} className={styles.input} />
        </label>
      )}

      <div className={styles.group}>
        <span className={styles.groupTitle}>{t.groupHeading}</span>
        <span className={styles.hint}>
          {t.groupLede} {t.capacity.replace('{n}', String(capacity))}
        </span>
        {roommates.length > 0 && (
          <>
            <label className={styles.check}>
              <input type="checkbox" name="inviteApartment" value="1" />
              {t.inviteApartment}
            </label>
            <div className={styles.people}>
              <span className={styles.hint}>{t.yourApartment}</span>
              {roommates.map((r) => (
                <label key={r.id} className={styles.check}>
                  <input type="checkbox" name="participants" value={r.id} />
                  {r.name}
                </label>
              ))}
            </div>
          </>
        )}
        {others.length > 0 && (
          <details className={styles.details}>
            <summary>{t.otherResidents}</summary>
            <div className={styles.people}>
              {others.map((r) => (
                <label key={r.id} className={styles.check}>
                  <input type="checkbox" name="participants" value={r.id} />
                  {r.name} <span className={styles.hint}>{t.apartmentShort} {r.unitCode}</span>
                </label>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className={styles.panelActions}>
        <button type="submit" className={styles.btn}>
          {t.confirm}
        </button>
        <Link href={cancelHref} className={`${styles.btn} ${styles.btnGhost}`}>
          {t.cancelPanel}
        </Link>
      </div>
    </form>
  );
}
