import type { Metadata } from 'next';
import styles from '../staff.module.css';
import { db } from '../../../prisma/db';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { createAnnouncementAction } from '../../../lib/building-post-actions';
import { sendDirectNoticeAction } from '../../../lib/direct-notice-actions';

export const metadata: Metadata = {
  title: 'Staff dashboard - Kuopas',
};

export default async function StaffDashboardPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.staff;

  const buildings = await db.orm.public.Building.orderBy((b) => b.name.asc()).all();
  const tenants = await db.orm.public.Tenant.include('unit', (unit) =>
    unit.include('stairwell', (s) => s.include('building', (b) => b)),
  )
    .orderBy((tn) => tn.name.asc())
    .all();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.dashboardTitle}</h1>

      <div className={styles.card}>
        <h2>{t.composeAnnouncement}</h2>
        <form action={createAnnouncementAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="buildingId">{t.selectBuilding}</label>
            <select id="buildingId" name="buildingId" required defaultValue="">
              <option value="" disabled>
                {t.selectBuilding}
              </option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="title">{t.postTitle}</label>
            <input id="title" name="title" type="text" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="content">{t.postContent}</label>
            <textarea id="content" name="content" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="photo">{dict.feedBoard.photo}</label>
            <input id="photo" name="photo" type="file" accept="image/*" />
          </div>
          <button type="submit" className={styles.submit}>
            {t.post}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2>{t.sendDirectNotice}</h2>
        <form action={sendDirectNoticeAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="tenantId">{t.selectStudent}</label>
            <select id="tenantId" name="tenantId" required defaultValue="">
              <option value="" disabled>
                {t.selectStudent}
              </option>
              {tenants.map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name} &middot; {tn.unit!.stairwell!.building!.name} {tn.unit!.stairwell!.label}
                  {tn.unit!.code}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="content">{t.postContent}</label>
            <textarea id="content" name="content" required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.send}
          </button>
        </form>
      </div>
    </>
  );
}
