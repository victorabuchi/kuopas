import type { Metadata } from 'next';
import styles from '../staff.module.css';
import { db } from '../../../prisma/db';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { createAnnouncementAction } from '../../../lib/building-post-actions';
import { sendDirectNoticeAction, sendRentReminderAction } from '../../../lib/direct-notice-actions';

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

  const recentAnnouncements = await db.orm.public.BuildingPost.where({ type: 'announcement' })
    .include('reads', (r) => r)
    .orderBy((p) => p.createdAt.desc())
    .limit(5)
    .all();
  const buildingMemberCounts = new Map<string, number>();
  for (const post of recentAnnouncements) {
    if (buildingMemberCounts.has(post.buildingId)) continue;
    const group = await db.orm.public.ChatGroup.where({ buildingId: post.buildingId }).first();
    const count = group
      ? (await db.orm.public.ChatGroupMember.where({ chatGroupId: group.id }).all()).length
      : 0;
    buildingMemberCounts.set(post.buildingId, count);
  }

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
            <label htmlFor="title">{t.titleFi}</label>
            <input id="title" name="title" type="text" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="content">{t.contentFi}</label>
            <textarea id="content" name="content" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="titleEn">{t.titleEn}</label>
            <input id="titleEn" name="titleEn" type="text" />
          </div>
          <div className={styles.field}>
            <label htmlFor="contentEn">{t.contentEn}</label>
            <textarea id="contentEn" name="contentEn" />
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

      {recentAnnouncements.length > 0 && (
        <div className={styles.card}>
          <h2>{t.readReceipts}</h2>
          <div className={styles.list}>
            {recentAnnouncements.map((post) => {
              const total = buildingMemberCounts.get(post.buildingId) ?? 0;
              const opened = post.reads.length;
              const pct = total > 0 ? Math.round((opened / total) * 100) : 0;
              return (
                <div key={post.id} className={styles.row}>
                  <div className={styles.rowText}>
                    <span className={styles.rowCategory}>{post.title}</span>
                    <span className={styles.rowMeta}>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={styles.rowMeta}>
                    {opened} / {total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      <div className={styles.card}>
        <h2>{t.rentReminder}</h2>
        <p style={{ color: '#767676', marginTop: '-6px' }}>{t.rentReminderLede}</p>
        <form action={sendRentReminderAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="rentContent">{t.rentReminderMessage}</label>
            <textarea id="rentContent" name="content" defaultValue={t.rentReminderDefault} required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.sendToEveryone}
          </button>
        </form>
      </div>
    </>
  );
}
