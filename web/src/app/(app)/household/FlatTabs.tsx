import Link from 'next/link';
import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getLiving } from '../../../lib/living';
import { CLAUSES, CLEANING_AREAS, checklistCompletion, currentAgreement, parseClauses, weekKey } from '../../../lib/flat';
import { addDays } from '../../../lib/booking-grid';
import { nowMs } from '../../../lib/time';
import {
  addCleaningItemAction,
  proposeAgreementAction,
  removeCleaningItemAction,
  requestTransferAction,
  setupCleaningAction,
  signAgreementAction,
  toggleCleaningAction,
  withdrawTransferAction,
} from '../../../lib/flat-actions';

type F = ReturnType<typeof getLiving>['flat'];
type Member = { id: string; name: string };

export async function CleaningTab({ unitId, meId, members, f }: { unitId: string; meId: string; members: Member[]; f: F['cleaning'] }) {
  const now = new Date(nowMs());
  const items = await db.orm.public.CleaningItem.where({ unitId, active: true }).orderBy((i) => i.createdAt.asc()).all();
  const nameOf = new Map(members.map((m) => [m.id, m.name.split(' ')[0]]));

  if (items.length === 0) {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{f.title}</h2>
        <p className={styles.lede}>{f.lede}</p>
        <p className={styles.lede}>{f.setupBody}</p>
        <form action={setupCleaningAction}>
          <button type="submit" className={styles.btn}>
            {f.setup}
          </button>
        </form>
      </div>
    );
  }

  const logs = await db.orm.public.CleaningLog.where((l) => l.itemId.in(items.map((i) => i.id))).all();
  const thisWeek = weekKey(now);
  const doneNow = new Map(logs.filter((l) => new Date(l.weekStart).toISOString() === thisWeek).map((l) => [l.itemId, l]));
  const last4 = Array.from({ length: 4 }, (_, i) => weekKey(addDays(now, -7 * i)));
  const perPerson = new Map<string, number>();
  for (const l of logs) if (last4.includes(new Date(l.weekStart).toISOString())) perPerson.set(l.tenantId, (perPerson.get(l.tenantId) ?? 0) + 1);
  const rate = await checklistCompletion(unitId, 4, now);

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{f.title}</h2>
        <p className={styles.lede}>{f.lede}</p>
        <div className={styles.kv}>
          <span className={styles.kvLabel}>{f.thisWeek}</span>
          <span className={styles.kvValue}>{f.done.replace('{n}', String(doneNow.size)).replace('{m}', String(items.length))}</span>
        </div>
      </div>

      {CLEANING_AREAS.map((area) => {
        const rows = items.filter((i) => i.area === area);
        if (rows.length === 0) return null;
        return (
          <div key={area}>
            <div className={styles.sectionHeading}>{f.areas[area]}</div>
            {rows.map((item) => {
              const log = doneNow.get(item.id);
              return (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemTitle} style={{ textDecoration: log ? 'line-through' : 'none' }}>
                      {item.label}
                    </span>
                    {log && (
                      <span className={styles.itemMeta}>
                        {f.doneBy} {log.tenantId === meId ? '✓' : nameOf.get(log.tenantId)}
                      </span>
                    )}
                  </div>
                  <form action={toggleCleaningAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className={log ? `${styles.btn} ${styles.btnGhost}` : styles.btn} disabled={Boolean(log) && log?.tenantId !== meId}>
                      {log ? f.undo : f.mark}
                    </button>
                  </form>
                  <form action={removeCleaningItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                      {f.remove}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className={styles.sectionHeading}>{f.last4}</div>
      <div className={styles.card}>
        {rate !== null && <span className={styles.itemTitle}>{rate}%</span>}
        {members.map((m) => (
          <div key={m.id} className={styles.kv}>
            <span className={styles.kvLabel}>{m.name}</span>
            <span className={styles.kvValue}>
              {perPerson.get(m.id) ?? 0} {f.contribution}
            </span>
          </div>
        ))}
      </div>

      <form action={addCleaningItemAction} className={`${styles.card} ${styles.form}`}>
        <h3 className={styles.cardTitle}>{f.addHeading}</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <select name="area" defaultValue="kitchen">
              {CLEANING_AREAS.map((a) => (
                <option key={a} value={a}>
                  {f.areas[a]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <input name="label" required maxLength={80} placeholder={f.taskPlaceholder} />
          </div>
        </div>
        <div>
          <button type="submit" className={styles.btn}>
            {f.add}
          </button>
        </div>
      </form>
    </>
  );
}

export async function AgreementTab({ unitId, meId, members, f, error }: { unitId: string; meId: string; members: Member[]; f: F['agreement']; error?: string }) {
  if (members.length < 2) return <div className={styles.card}>{f.onlyShared}</div>;
  const { active, draft } = await currentAgreement(unitId);
  const shown = draft ?? active;
  const values = shown ? parseClauses(shown.clauses) : {};
  const signedIds = new Set((shown?.signatures ?? []).map((s) => s.tenantId));
  const missing = members.filter((m) => !signedIds.has(m.id));

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{f.title}</h2>
        <p className={styles.lede}>{f.lede}</p>
        {error === 'incomplete' && <div className={`${styles.notice} ${styles.noticeErr}`}>{f.incomplete}</div>}
        {shown ? (
          <div className={styles.kv}>
            <span className={styles.kvLabel}>
              {f.version} {shown.version}
            </span>
            <span className={`${styles.badge} ${shown.status === 'active' ? styles.badgeOk : styles.badgeWarn}`}>{shown.status === 'active' ? f.active : f.draft}</span>
          </div>
        ) : (
          <span className={styles.lede}>{f.none}</span>
        )}
      </div>

      {shown && (
        <div className={styles.card}>
          {CLAUSES.map((clause) => (
            <div key={clause.key} className={styles.kv}>
              <span className={styles.kvLabel}>{f.clauses[clause.key].title}</span>
              <span className={styles.kvValue}>{(f.clauses[clause.key].options as Record<string, string>)[values[clause.key] ?? ''] ?? ''}</span>
            </div>
          ))}
          {values['extra'] && <span className={styles.lede}>{values['extra']}</span>}
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{f.signedBy}</span>
            <span className={styles.kvValue}>{members.filter((m) => signedIds.has(m.id)).map((m) => (m.id === meId ? f.you : m.name)).join(', ') || '-'}</span>
          </div>
          {missing.length > 0 && (
            <div className={styles.kv}>
              <span className={styles.kvLabel}>{f.waitingFor}</span>
              <span className={styles.kvValue}>{missing.map((m) => (m.id === meId ? f.you : m.name)).join(', ')}</span>
            </div>
          )}
          {shown.status === 'active' && missing.length > 0 && <span className={styles.itemMeta}>{f.needsSignature}</span>}
          {!signedIds.has(meId) && (
            <form action={signAgreementAction}>
              <input type="hidden" name="id" value={shown.id} />
              <button type="submit" className={styles.btn}>
                {f.sign}
              </button>
            </form>
          )}
        </div>
      )}

      <form action={proposeAgreementAction} className={`${styles.card} ${styles.form}`}>
        <h3 className={styles.cardTitle}>{shown ? f.change : f.propose}</h3>
        <p className={styles.lede}>{f.proposeLede}</p>
        {CLAUSES.map((clause) => (
          <div key={clause.key} className={styles.field}>
            <label htmlFor={`c-${clause.key}`}>{f.clauses[clause.key].title}</label>
            <select id={`c-${clause.key}`} name={clause.key} defaultValue={values[clause.key] ?? clause.options[0]}>
              {clause.options.map((o) => (
                <option key={o} value={o}>
                  {(f.clauses[clause.key].options as Record<string, string>)[o]}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className={styles.field}>
          <label htmlFor="extra">{f.extra}</label>
          <input id="extra" name="extra" maxLength={300} defaultValue={values['extra'] ?? ''} />
        </div>
        <div>
          <button type="submit" className={styles.btn}>
            {f.submit}
          </button>
        </div>
      </form>
    </>
  );
}

export async function TransferTab({ unitId, meId, f, sent, error }: { unitId: string; meId: string; f: F['transfer']; sent: boolean; error?: string }) {
  const { active } = await currentAgreement(unitId);
  const rate = await checklistCompletion(unitId, 4, new Date(nowMs()));
  const requests = await db.orm.public.TransferRequest.where({ tenantId: meId }).orderBy((r) => r.createdAt.desc()).all();
  const current = requests.find((r) => ['open', 'mediation'].includes(r.status));
  const latest = requests[0];

  let position: number | null = null;
  if (current && current.wants !== 'other_shared') {
    const waiting = (await db.orm.public.TransferRequest.all()).filter((r) => ['open', 'mediation'].includes(r.status) && r.wants !== 'other_shared');
    position = waiting.filter((r) => new Date(r.createdAt).getTime() <= new Date(current.createdAt).getTime()).length;
  }

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{f.title}</h2>
        <p className={styles.lede}>{f.lede}</p>
        <div className={`${styles.notice} ${styles.noticeWarn}`}>{f.safetyNote}</div>
        {sent && <div className={`${styles.notice} ${styles.noticeOk}`}>{f.sent}</div>}
        {error === 'incomplete' && <div className={`${styles.notice} ${styles.noticeErr}`}>{f.incomplete}</div>}
      </div>

      <div className={styles.sectionHeading}>{f.triedHeading}</div>
      <div className={styles.item}>
        <div className={styles.itemMain}>
          <span className={styles.itemTitle}>{f.agreementStep}</span>
          <span className={styles.itemMeta}>{active ? f.agreementDone : f.agreementTodo}</span>
        </div>
        <span className={`${styles.badge} ${active ? styles.badgeOk : styles.badgeWarn}`}>{active ? '✓' : '·'}</span>
        <Link href="/household?tab=agreement" className={`${styles.btn} ${styles.btnGhost}`}>
          {f.open}
        </Link>
      </div>
      <div className={styles.item}>
        <div className={styles.itemMain}>
          <span className={styles.itemTitle}>{f.cleaningStep}</span>
          <span className={styles.itemMeta}>{rate === null ? f.cleaningNone : `${rate}% ${f.cleaningRate}`}</span>
        </div>
        <span className={`${styles.badge} ${rate !== null && rate >= 60 ? styles.badgeOk : styles.badgeWarn}`}>{rate !== null && rate >= 60 ? '✓' : '·'}</span>
        <Link href="/household?tab=cleaning" className={`${styles.btn} ${styles.btnGhost}`}>
          {f.open}
        </Link>
      </div>

      {current ? (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{f.yourRequest}</h3>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{f.reasons[current.reason as keyof typeof f.reasons]}</span>
            <span className={`${styles.badge} ${styles.badgeWarn}`}>{f.status[current.status as keyof typeof f.status]}</span>
          </div>
          {position !== null && (
            <div className={styles.kv}>
              <span className={styles.kvLabel}>{f.position}</span>
              <span className={styles.kvValue}>{position}</span>
            </div>
          )}
          <form action={withdrawTransferAction}>
            <input type="hidden" name="id" value={current.id} />
            <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
              {f.withdraw}
            </button>
          </form>
        </div>
      ) : (
        <form action={requestTransferAction} className={`${styles.card} ${styles.form}`}>
          <h3 className={styles.cardTitle}>{f.requestHeading}</h3>
          <div className={styles.field}>
            <label htmlFor="reason">{f.reason}</label>
            <select id="reason" name="reason" defaultValue="dirty_kitchen">
              {(Object.keys(f.reasons) as (keyof typeof f.reasons)[]).map((k) => (
                <option key={k} value={k}>
                  {f.reasons[k]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="wants">{f.wants}</label>
            <select id="wants" name="wants" defaultValue="studio">
              {(Object.keys(f.wantsOptions) as (keyof typeof f.wantsOptions)[]).map((k) => (
                <option key={k} value={k}>
                  {f.wantsOptions[k]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="description">{f.description}</label>
            <textarea id="description" name="description" rows={4} maxLength={600} required />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" name="mediation" value="1" className={`${styles.btn} ${styles.btnGhost}`}>
              {f.askMediation}
            </button>
            <button type="submit" className={styles.btn}>
              {f.submit}
            </button>
          </div>
          <span className={styles.itemMeta}>{f.mediationBody}</span>
        </form>
      )}

      {latest && !current && (
        <div className={styles.item}>
          <div className={styles.itemMain}>
            <span className={styles.itemTitle}>{f.yourRequest}</span>
            {latest.staffNote && (
              <span className={styles.itemMeta}>
                {f.staffNote}: {latest.staffNote}
              </span>
            )}
          </div>
          <span className={styles.badge}>{f.status[latest.status as keyof typeof f.status]}</span>
        </div>
      )}
    </>
  );
}
