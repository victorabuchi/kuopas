import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import { createSavedReplyAction, deleteSavedReplyAction } from '../../../../lib/saved-reply-actions';

export const metadata: Metadata = {
  title: 'Saved replies - Kuopas staff',
};

export default async function SavedRepliesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.staff;

  const replies = await db.orm.public.SavedReply.orderBy((r) => r.createdAt.desc()).all();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.savedReplies}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.savedRepliesLede}</p>

      <div className={styles.card}>
        <h2>{t.newSavedReply}</h2>
        <form action={createSavedReplyAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="title">{t.savedReplyTitle}</label>
            <input id="title" name="title" type="text" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="content">{t.savedReplyContent}</label>
            <textarea id="content" name="content" required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.submit}
          </button>
        </form>
      </div>

      <div className={styles.list}>
        {replies.length === 0 && <div className={styles.empty}>{t.noSavedRepliesYet}</div>}
        {replies.map((reply) => (
          <div key={reply.id} className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>{reply.title}</span>
              <span className={styles.rowMeta}>{reply.content}</span>
            </div>
            <form action={deleteSavedReplyAction}>
              <input type="hidden" name="id" value={reply.id} />
              <button type="submit" className={styles.inlineSubmit}>
                {dict.common.cancel}
              </button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
