import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './move-in-guide.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import TopBar from '../TopBar';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { toggleChecklistItemAction } from '../../../lib/move-in-guide-actions';

export const metadata: Metadata = {
  title: 'Move-in guide - Kuopas',
};

const ITEM_KEYS = ['keys', 'internet', 'waste', 'laundry', 'mailbox', 'contacts'] as const;

export default async function MoveInGuidePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.moveInGuide;

  const itemLabel: Record<(typeof ITEM_KEYS)[number], string> = {
    keys: t.itemKeys,
    internet: t.itemInternet,
    waste: t.itemWaste,
    laundry: t.itemLaundry,
    mailbox: t.itemMailbox,
    contacts: t.itemContacts,
  };

  const completed = await db.orm.public.MoveInChecklistItem.where({ tenantId: session.tenantId }).all();
  const completedKeys = new Set(completed.map((c) => c.itemKey));

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <p className={styles.lede}>{t.lede}</p>

      <div className={styles.list}>
        {ITEM_KEYS.map((key) => {
          const isDone = completedKeys.has(key);
          return (
            <form key={key} action={toggleChecklistItemAction} className={styles.item}>
              <input type="hidden" name="itemKey" value={key} />
              <button type="submit" className={`${styles.checkbox} ${isDone ? styles.checkboxDone : ''}`}>
                {isDone && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`${styles.label} ${isDone ? styles.labelDone : ''}`}>{itemLabel[key]}</span>
            </form>
          );
        })}
      </div>
    </div>
  );
}
