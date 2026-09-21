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
import { resolveChatReportAction } from '../../../../lib/household-actions';
import { getLiving } from '../../../../lib/living';
import { resolveContentReportAction } from '../../../../lib/safety-actions';

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

  const chatReports = await db.orm.public.ChatMessageReport.where({ status: 'open' })
    .include('reporter', (r) => r)
    .include('message', (m) => m.include('sender', (x) => x).include('chatGroup', (g) => g))
    .orderBy((r) => r.createdAt.desc())
    .limit(100)
    .all();
  const c = getLiving(locale).staff.chatReports;
  const sf = getLiving(locale).safety;
  const contentReports = await db.orm.public.ContentReport.where({ status: 'open' })
    .include('reporter', (r) => r)
    .orderBy((r) => r.createdAt.desc())
    .limit(100)
    .all();
  const senderIds = [...new Set(contentReports.map((r) => r.reportedUserId).filter((x): x is string => Boolean(x)))];
  const senders = senderIds.length ? await db.orm.public.Tenant.where((tn) => tn.id.in(senderIds)).all() : [];
  const senderName = new Map(senders.map((tn) => [tn.id, `${tn.name} (${tn.email})`]));

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

      <h2 style={{ marginTop: 32 }}>{c.title}</h2>
      <div className={styles.list}>
        {chatReports.length === 0 && <div className={styles.empty}>{c.empty}</div>}
        {chatReports.map((report) => (
          <div key={report.id} className={styles.card}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>{report.message?.chatGroup?.name}</span>
              <span className={styles.rowMeta}>
                {c.sender}: {report.message?.sender?.name} ({report.message?.sender?.email}) · {c.reportedBy}: {report.reporter?.name}
              </span>
              <p style={{ margin: '8px 0 0' }}>{report.message?.content}</p>
              {report.reason && <span className={styles.rowMeta}>{report.reason}</span>}
            </div>
            <form action={resolveChatReportAction} className={styles.inlineForm} style={{ marginTop: 10 }}>
              <input type="hidden" name="reportId" value={report.id} />
              <button type="submit" name="decision" value="remove" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                {c.remove}
              </button>
              <button type="submit" name="decision" value="dismiss" className={styles.inlineSubmit}>
                {c.dismiss}
              </button>
            </form>
          </div>
        ))}
      </div>
    
      <h2 style={{ marginTop: 32 }}>{sf.staffHeading}</h2>
      <div className={styles.list}>
        {contentReports.length === 0 && <div className={styles.empty}>{sf.staffEmpty}</div>}
        {contentReports.map((report) => (
          <div key={report.id} className={styles.card}>
            <div className={styles.rowText}>
              <span className={styles.rowCategory}>{sf.kinds[report.kind as keyof typeof sf.kinds] ?? report.kind}</span>
              <span className={styles.rowMeta}>
                {sf.sender}: {report.reportedUserId ? senderName.get(report.reportedUserId) ?? '' : ''} &middot; {sf.reportedBy}: {report.reporter?.name}
              </span>
              <p style={{ margin: '8px 0 0' }}>{report.snapshot}</p>
              {report.reason && <span className={styles.rowMeta}>{report.reason}</span>}
            </div>
            <form action={resolveContentReportAction} className={styles.inlineForm} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={report.id} />
              <button type="submit" name="decision" value="remove" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                {sf.remove}
              </button>
              <button type="submit" name="decision" value="dismiss" className={styles.inlineSubmit}>
                {sf.dismiss}
              </button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
