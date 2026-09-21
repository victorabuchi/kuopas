import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getLiving } from '../../../lib/living';
import { bankAdapter, bankMode } from '../../../lib/openbanking';
import { MICRO_CATEGORIES, getSplitterConfig } from '../../../lib/splitter';
import { disconnectBankAction, ignoreEntryAction, matchCreditAction, shareEntryAction, syncBankAction } from '../../../lib/bank-actions';

type Member = { id: string; name: string };

export async function LedgerTab({
  meId,
  members,
  locale,
  q,
}: {
  meId: string;
  members: Member[];
  locale: 'en' | 'fi';
  q: { err?: string; synced?: string; connected?: string; disconnected?: string };
}) {
  const L = getLiving(locale);
  const b = L.bank;
  const cats = L.household.categories as Record<string, string>;
  const money = (cents: number) => new Intl.NumberFormat(locale === 'fi' ? 'fi-FI' : 'en-FI', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB');
  const mode = bankMode();
  const connection = await db.orm.public.BankConnection.where({ tenantId: meId }).first();
  const config = await getSplitterConfig();
  const errText: Record<string, string> = { ...b.errors, bank_expired: b.expired };

  const notices = (
    <>
      {q.err && <div className={`${styles.notice} ${styles.noticeErr}`}>{errText[q.err] ?? b.error}</div>}
      {q.synced !== undefined && <div className={`${styles.notice} ${styles.noticeOk}`}>{b.synced.replace('{n}', q.synced)}</div>}
      {q.disconnected === '1' && <div className={`${styles.notice} ${styles.noticeOk}`}>{b.disconnected}</div>}
    </>
  );

  if (!connection) {
    const banks = mode === 'off' ? [] : await (bankAdapter()?.banks() ?? Promise.resolve([])).catch(() => []);
    return (
      <>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{b.title}</h2>
          <p className={styles.lede}>{b.lede}</p>
          {notices}
          {mode === 'off' ? (
            <div className={`${styles.notice} ${styles.noticeWarn}`}>{b.off}</div>
          ) : (
            <form action="/api/bank/start" method="get" className={styles.form}>
              {banks.length > 1 && (
                <div className={styles.field}>
                  <label htmlFor="bank">{b.chooseBank}</label>
                  <select id="bank" name="bank" required defaultValue="">
                    <option value="" disabled>
                      {b.chooseBank}
                    </option>
                    {banks.map((x) => (
                      <option key={x.name} value={x.name}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {banks.length === 1 && <input type="hidden" name="bank" value={banks[0]!.name} />}
              <div>
                <button type="submit" className={styles.btn}>
                  {b.connect}
                </button>
              </div>
            </form>
          )}
        </div>
      </>
    );
  }

  const entries = (await db.orm.public.LedgerEntry.where({ connectionId: connection.id }).all()).sort((x, y) => new Date(y.bookedAt).getTime() - new Date(x.bookedAt).getTime());
  const purchases = entries.filter((e) => e.status === 'new' && e.amountCents < 0);
  const credits = entries.filter((e) => e.status === 'new' && e.amountCents > 0);
  const shared = entries.filter((e) => e.status === 'shared').slice(0, 10);

  // Unpaid shares other flatmates owe me, to match against incoming transfers.
  const bills = await db.orm.public.SharedBill.where({ paidById: meId }).include('shares', (s) => s).all();
  const owed = bills.flatMap((bill) => bill.shares.filter((s) => !s.paidAt && s.tenantId !== meId).map((s) => ({ share: s, bill })));
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  // Only suggest when the amount equals a share and every part of the
  // flatmate's name is in the sender, and exactly one share fits. Anything
  // ambiguous is left for the person to settle by hand.
  const suggestion = (creditCents: number, counterparty: string) => {
    const text = counterparty.toLowerCase();
    const matches = owed.filter(({ share }) => {
      const tokens = (nameOf.get(share.tenantId) ?? '').toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
      return share.amountCents === creditCents && tokens.length > 0 && tokens.every((t) => text.includes(t));
    });
    return matches.length === 1 ? matches[0] : undefined;
  };

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{b.title}</h2>
        <p className={styles.lede}>{b.lede}</p>
        {notices}
        <div className={styles.kv}>
          <span className={styles.kvLabel}>{b.connectedTo}</span>
          <span className={styles.kvValue}>
            {b.account} {connection.accountLabel}
          </span>
        </div>
        <div className={styles.kv}>
          <span className={styles.kvLabel}>{b.lastSync}</span>
          <span className={styles.kvValue}>{connection.lastSyncAt ? day(connection.lastSyncAt) : b.never}</span>
        </div>
        {connection.consentExpiresAt && (
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{b.consentEnds}</span>
            <span className={styles.kvValue}>{day(connection.consentExpiresAt)}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form action={syncBankAction}>
            <button type="submit" className={styles.btn}>
              {b.sync}
            </button>
          </form>
          <form action={disconnectBankAction}>
            <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
              {b.disconnect}
            </button>
          </form>
        </div>
      </div>

      <div className={styles.sectionHeading}>{b.purchasesHeading}</div>
      <p className={styles.lede}>{b.limitNote.replace('{limit}', money(config.microLimitCents))}</p>
      {purchases.length === 0 && <div className={styles.empty}>{b.noPurchases}</div>}
      {purchases.map((e) => (
        <div key={e.id} className={styles.card}>
          <div className={styles.item} style={{ padding: 0, border: 'none' }}>
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>{e.counterparty || '-'}</span>
              <span className={styles.itemMeta}>
                {day(e.bookedAt)} &middot; {e.description}
              </span>
            </div>
            <span className={styles.itemTitle}>{money(Math.abs(e.amountCents))}</span>
          </div>
          <form action={shareEntryAction} className={styles.form}>
            <input type="hidden" name="entryId" value={e.id} />
            <div className={styles.field}>
              <label htmlFor={`cat-${e.id}`}>{b.category}</label>
              <select id={`cat-${e.id}`} name="category" defaultValue="groceries">
                {MICRO_CATEGORIES.map((k) => (
                  <option key={k} value={k}>
                    {cats[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>{b.splitWith}</label>
              {members.map((m) => (
                <label key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                  <input type="checkbox" name="participant" value={m.id} defaultChecked />
                  {m.id === meId ? L.household.you : m.name}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className={styles.btn}>
                {b.share}
              </button>
              <button type="submit" formAction={ignoreEntryAction} className={`${styles.btn} ${styles.btnGhost}`}>
                {b.ignore}
              </button>
            </div>
          </form>
        </div>
      ))}

      <div className={styles.sectionHeading}>{b.creditsHeading}</div>
      <p className={styles.lede}>{b.creditsLede}</p>
      {credits.map((e) => ({ e, match: suggestion(e.amountCents, `${e.counterparty} ${e.description}`) })).filter((x) => x.match).length === 0 && (
        <div className={styles.empty}>{b.noCredits}</div>
      )}
      {credits.map((e) => {
        const match = suggestion(e.amountCents, `${e.counterparty} ${e.description}`);
        if (!match) return null;
        return (
          <div key={e.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>
                {money(e.amountCents)} {b.from} {e.counterparty}
              </span>
              <span className={styles.itemMeta}>{match.bill.title}</span>
            </div>
            <form action={matchCreditAction}>
              <input type="hidden" name="entryId" value={e.id} />
              <input type="hidden" name="shareId" value={match.share.id} />
              <button type="submit" className={styles.btn}>
                {b.markPaid.replace('{name}', (nameOf.get(match.share.tenantId) ?? '').split(' ')[0] ?? '')}
              </button>
            </form>
          </div>
        );
      })}

      {shared.length > 0 && (
        <>
          <div className={styles.sectionHeading}>{b.shared}</div>
          {shared.map((e) => (
            <div key={e.id} className={styles.item}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>{e.counterparty}</span>
                <span className={styles.itemMeta}>{day(e.bookedAt)}</span>
              </div>
              <span className={styles.itemTitle}>{money(Math.abs(e.amountCents))}</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}
