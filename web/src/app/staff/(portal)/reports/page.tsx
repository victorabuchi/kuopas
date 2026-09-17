import type { Metadata } from 'next';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/dictionary';
import {
  resolveReportAction,
  deleteReportedPostAction,
  deleteReportedCommentAction,
  blockTenantFromNoticeboardAction,
} from '../../../../lib/building-post-actions';

export const metadata: Metadata = {
  title: 'Reports - Kuopas staff',
};

export default async function StaffReportsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.staff;

  const reports = await db.orm.public.BuildingPostReport.where({ status: 'open' })
    .include('reporter', (r) => r)
    .include('post', (p) => p.include('authorTenant', (a) => a))
    .include('comment', (c) => c.include('author', (a) => a))
    .orderBy((r) => r.createdAt.desc())
    .limit(100)
    .all();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.reportsInbox}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.reportsLede}</p>

      <div className={styles.list}>
        {reports.length === 0 && <div className={styles.empty}>{t.noReportsYet}</div>}
        {reports.map((report) => {
          const content = report.post?.content ?? report.comment?.content ?? '';
          const author = report.post?.authorTenant ?? report.comment?.author ?? null;
          return (
            <div key={report.id} className={styles.card} style={{ marginBottom: 0 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{t.reportedContent}</p>
              <p style={{ margin: '6px 0' }}>{content || '(deleted)'}</p>
              {author && (
                <p style={{ margin: '0 0 6px', color: '#767676', fontSize: 13 }}>
                  {t.writtenBy}: {author.name} ({author.email})
                </p>
              )}
              {report.reason && (
                <p style={{ margin: '0 0 6px', color: '#767676', fontSize: 13 }}>
                  {t.reportReason}: {report.reason}
                </p>
              )}
              <p style={{ margin: '0 0 12px', color: '#767676', fontSize: 13 }}>
                {t.reportedBy}: {report.reporter!.name} &middot; {new Date(report.createdAt).toLocaleString()}
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <form action={resolveReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="status" value="dismissed" />
                  <button type="submit" className={styles.inlineSubmit}>
                    {t.dismiss}
                  </button>
                </form>

                {report.post && (
                  <form action={deleteReportedPostAction}>
                    <input type="hidden" name="postId" value={report.post.id} />
                    <button type="submit" className={styles.inlineSubmit}>
                      {t.deleteContent}
                    </button>
                  </form>
                )}
                {report.comment && (
                  <form action={deleteReportedCommentAction}>
                    <input type="hidden" name="commentId" value={report.comment.id} />
                    <button type="submit" className={styles.inlineSubmit}>
                      {t.deleteContent}
                    </button>
                  </form>
                )}

                {author && (
                  <form action={blockTenantFromNoticeboardAction}>
                    <input type="hidden" name="tenantId" value={author.id} />
                    <input type="hidden" name="blocked" value={author.blockedFromNoticeboard ? 'false' : 'true'} />
                    <button type="submit" className={styles.inlineSubmit}>
                      {author.blockedFromNoticeboard ? t.unblockTenant : t.blockTenant}
                    </button>
                  </form>
                )}

                <form action={resolveReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="status" value="actioned" />
                  <button type="submit" className={styles.inlineSubmit}>
                    {t.statusActioned}
                  </button>
                </form>
              </div>
              {report.comment && (
                <p style={{ marginTop: 8, fontSize: 12, color: '#767676' }}>({dict.feedBoard.reportComment})</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
