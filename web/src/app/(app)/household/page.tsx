import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../features.module.css';
import { db } from '../../../prisma/db';
import { getSession } from '../../../lib/session';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { nowMs } from '../../../lib/time';
import { allowedCategories, getSplitterConfig } from '../../../lib/splitter';
import {
  completeChoreTaskAction,
  createChoreAction,
  deleteBillAction,
  deleteChoreAction,
  setSharePaidAction,
} from '../../../lib/household-actions';
import TopBar from '../TopBar';
import SplitForm from './SplitForm';
import { AgreementTab, CleaningTab, TransferTab } from './FlatTabs';
import { LedgerTab } from './LedgerTab';
import { bankMode } from '../../../lib/openbanking';
import ChoreWheel from './ChoreWheel';

export const metadata: Metadata = {
  title: 'Household - Kuopas',
};

const ALL_TABS = ['bills', 'ledger', 'chores', 'cleaning', 'agreement', 'transfer', 'chat'] as const;
type Tab = (typeof ALL_TABS)[number];

export default async function HouseholdPage({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string; sent?: string; err?: string; synced?: string; connected?: string; disconnected?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const q = await searchParams;
  const locale = await getLocale();
  const L = getLiving(locale);
  const t = L.household;

  const me = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!me) redirect('/login');
  const members = (await db.orm.public.Tenant.where({ unitId: me.unitId }).all()).sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = new Map(members.map((m) => [m.id, m.id === me.id ? t.you : m.name]));
  // The agreement and cleaning list only make sense when people share a flat.
  const shared = members.length >= 2;
  const bankOn = bankMode() !== 'off' || Boolean(await db.orm.public.BankConnection.where({ tenantId: me.id }).first());
  const TABS = ALL_TABS.filter((key) => (shared || (key !== 'cleaning' && key !== 'agreement')) && (bankOn || key !== 'ledger'));
  const tab: Tab = (TABS as readonly string[]).includes(q.tab ?? '') ? (q.tab as Tab) : 'bills';
  const tabLabels: Record<Tab, string> = {
    bills: t.tabBills,
    ledger: L.bank.tab,
    chores: t.tabChores,
    cleaning: L.flat.tabs.cleaning,
    agreement: L.flat.tabs.agreement,
    transfer: L.flat.tabs.transfer,
    chat: t.tabChat,
  };

  return (
    <div className={styles.page}>
      <TopBar title={t.title} />
      <div className={styles.tabs}>
        {TABS.map((key) => (
          <Link key={key} href={`/household?tab=${key}`} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}>
            {tabLabels[key]}
          </Link>
        ))}
      </div>
      <div className={styles.content}>
        {tab === 'bills' && <BillsTab unitId={me.unitId!} meId={me.id} members={members} nameOf={nameOf} t={t} locale={locale} />}
        {tab === 'ledger' && <LedgerTab meId={me.id} members={members} locale={locale === 'fi' ? 'fi' : 'en'} q={q} />}
        {tab === 'chores' && <ChoresTab unitId={me.unitId!} members={members} nameOf={nameOf} t={t} locale={locale} />}
        {tab === 'cleaning' && <CleaningTab unitId={me.unitId!} meId={me.id} members={members} f={L.flat.cleaning} />}
        {tab === 'agreement' && <AgreementTab unitId={me.unitId!} meId={me.id} members={members} f={L.flat.agreement} error={q.error} />}
        {tab === 'transfer' && <TransferTab unitId={me.unitId!} meId={me.id} f={L.flat.transfer} sent={q.sent === '1'} error={q.error} />}
        {tab === 'chat' && <ChatTab unitId={me.unitId!} members={members} t={t} />}
      </div>
    </div>
  );
}

type T = ReturnType<typeof getLiving>['household'];
type Member = { id: string; name: string };

async function BillsTab({
  unitId,
  meId,
  members,
  nameOf,
  t,
  locale,
}: {
  unitId: string;
  meId: string;
  members: Member[];
  nameOf: Map<string, string>;
  t: T;
  locale: string;
}) {
  const bills = await db.orm.public.SharedBill.where({ unitId })
    .include('shares', (s) => s)
    .orderBy((b) => b.createdAt.desc())
    .limit(50)
    .all();
  const money = (cents: number) =>
    new Intl.NumberFormat(locale === 'fi' ? 'fi-FI' : 'en-FI', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const splitter = await getSplitterConfig();
  const allowed = allowedCategories(splitter);
  const formCategories = Object.fromEntries(allowed.map((k) => [k, (t.categories as Record<string, string>)[k] ?? k]));

  // Net balances: what each other person owes the payer of each unpaid share.
  const owed = new Map<string, number>();
  for (const bill of bills) {
    for (const share of bill.shares) {
      if (share.paidAt || share.tenantId === bill.paidById) continue;
      const key = `${share.tenantId}>${bill.paidById}`;
      owed.set(key, (owed.get(key) ?? 0) + share.amountCents);
    }
  }
  const lines: string[] = [];
  const done = new Set<string>();
  for (const [key, cents] of owed) {
    const [debtor, creditor] = key.split('>') as [string, string];
    if (done.has(key)) continue;
    const reverse = owed.get(`${creditor}>${debtor}`) ?? 0;
    done.add(key);
    done.add(`${creditor}>${debtor}`);
    const net = cents - reverse;
    if (net === 0) continue;
    const [from, to] = net > 0 ? [debtor, creditor] : [creditor, debtor];
    const label =
      from === meId
        ? `${t.youOwe} ${nameOf.get(to)}: ${money(Math.abs(net))}`
        : to === meId
          ? `${nameOf.get(from)} ${t.owesYou}: ${money(Math.abs(net))}`
          : `${nameOf.get(from)} ${t.owes} ${nameOf.get(to)}: ${money(Math.abs(net))}`;
    lines.push(label);
  }

  const open = bills.filter((b) => b.shares.some((s) => !s.paidAt));
  const settled = bills.filter((b) => b.shares.every((s) => s.paidAt));

  function BillRow({ bill }: { bill: (typeof bills)[number] }) {
    return (
      <div className={styles.card}>
        <div className={styles.item} style={{ padding: 0, border: 'none' }}>
          <div className={styles.itemMain}>
            <span className={styles.itemTitle}>{bill.title}</span>
            <span className={styles.itemMeta}>
              {(t.categories as Record<string, string>)[bill.category] ?? bill.category} · {money(bill.totalCents)} · {t.paidByName}{' '}
              {nameOf.get(bill.paidById)}
            </span>
          </div>
          {bill.paidById === meId && (
            <form action={deleteBillAction}>
              <input type="hidden" name="billId" value={bill.id} />
              <button type="submit" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}>
                {t.delete}
              </button>
            </form>
          )}
        </div>
        {bill.shares.map((share) => (
          <div key={share.id} className={styles.kv}>
            <span>
              {nameOf.get(share.tenantId)} · {money(share.amountCents)}
            </span>
            <span className={styles.itemActions}>
              <span className={`${styles.badge} ${share.paidAt ? styles.badgeOk : styles.badgeWarn}`}>{share.paidAt ? t.paid : t.pending}</span>
              {(share.tenantId === meId || bill.paidById === meId) && share.tenantId !== bill.paidById && (
                <form action={setSharePaidAction}>
                  <input type="hidden" name="shareId" value={share.id} />
                  <input type="hidden" name="paid" value={share.paidAt ? '0' : '1'} />
                  <button type="submit" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                    {share.paidAt ? t.markUnpaid : t.markPaid}
                  </button>
                </form>
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t.balanceHeading}</h2>
        {lines.length === 0 ? <div className={styles.lede}>{t.allSettled}</div> : lines.map((l) => <div key={l} className={styles.kv}>{l}</div>)}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t.billsHeading}</h2>
        <p className={styles.lede}>{t.billsLede}</p>
        {splitter.mode === 'micro' && <p className={styles.lede}>{t.microNote.replace('{limit}', money(splitter.microLimitCents))}</p>}
      </div>
      <SplitForm
        members={members.map((m) => ({ id: m.id, name: nameOf.get(m.id) ?? m.name }))}
        meId={meId}
        labels={{
          title: t.title_,
          titlePlaceholder: t.titlePlaceholder,
          category: t.category,
          categories: formCategories,
          total: t.total,
          paidBy: t.paidBy,
          dueDate: t.dueDate,
          splitBetween: t.splitBetween,
          weight: t.weight,
          weightHint: t.weightHint,
          preview: t.preview,
          saveBill: t.saveBill,
        }}
      />

      <div className={styles.sectionHeading}>{t.openBills}</div>
      {open.length === 0 && <div className={styles.empty}>{t.noBills}</div>}
      {open.map((b) => (
        <BillRow key={b.id} bill={b} />
      ))}
      {settled.length > 0 && <div className={styles.sectionHeading}>{t.settledBills}</div>}
      {settled.map((b) => (
        <BillRow key={b.id} bill={b} />
      ))}
    </>
  );
}

async function ChoresTab({
  unitId,
  members,
  nameOf,
  t,
  locale,
}: {
  unitId: string;
  members: Member[];
  nameOf: Map<string, string>;
  t: T;
  locale: string;
}) {
  const chores = await db.orm.public.Chore.where({ unitId })
    .include('tasks', (tk) => tk.orderBy((x) => x.dueDate.desc()))
    .orderBy((c) => c.createdAt.asc())
    .all();
  const now = nowMs();
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-GB');
  const names = members.map((m) => nameOf.get(m.id) ?? m.name);

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t.choresHeading}</h2>
        <p className={styles.lede}>{t.choresLede}</p>
      </div>

      {chores.length === 0 && <div className={styles.empty}>{t.noChores}</div>}
      {chores.map((chore) => {
        const current = chore.tasks.find((task) => !task.doneAt);
        const idx = Math.max(members.findIndex((m) => m.id === current?.assignedToId), 0);
        const overdue = current ? new Date(current.dueDate).getTime() < now : false;
        return (
          <div key={chore.id} className={styles.card}>
            <div className={styles.item} style={{ padding: 0, border: 'none', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0 }}>
                <ChoreWheel names={names} currentIndex={idx} />
              </div>
              <div className={styles.itemMain} style={{ paddingTop: 8 }}>
                <span className={styles.cardTitle}>{chore.title}</span>
                <span className={styles.itemMeta}>
                  {t.every} {chore.everyDays} {t.days}
                </span>
                {current && (
                  <>
                    <span className={styles.itemTitle}>
                      {t.upNext}: {nameOf.get(current.assignedToId)}
                    </span>
                    <span className={`${styles.badge} ${overdue ? styles.badgeBad : ''}`} style={{ alignSelf: 'flex-start' }}>
                      {overdue ? t.overdue : t.due} {dateFmt(current.dueDate)}
                    </span>
                    <form action={completeChoreTaskAction}>
                      <input type="hidden" name="taskId" value={current.id} />
                      <button type="submit" className={`${styles.btn} ${styles.btnSmall}`}>
                        {t.markDone}
                      </button>
                    </form>
                  </>
                )}
                <form action={deleteChoreAction}>
                  <input type="hidden" name="choreId" value={chore.id} />
                  <button type="submit" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}>
                    {t.removeChore}
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })}

      <form action={createChoreAction} className={`${styles.card} ${styles.form}`}>
        <h3 className={styles.cardTitle}>{t.newChore}</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="title">{t.choreName}</label>
            <input id="title" name="title" required placeholder={t.choreNamePlaceholder} />
          </div>
          <div className={styles.field}>
            <label htmlFor="everyDays">{t.every}</label>
            <input id="everyDays" name="everyDays" type="number" min={1} max={60} defaultValue={7} />
          </div>
        </div>
        <button type="submit" className={styles.btn}>
          {t.addChore}
        </button>
      </form>
    </>
  );
}

async function ChatTab({ unitId, members, t }: { unitId: string; members: Member[]; t: T }) {
  const group = await db.orm.public.ChatGroup.where({ unitId }).first();
  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t.boardHeading}</h2>
        <p className={styles.lede}>{t.boardLede}</p>
        {group ? (
          <Link href={`/chat/${group.id}`} className={styles.btn}>
            {t.openChat}
          </Link>
        ) : (
          <div className={styles.notice}>{t.noApartment}</div>
        )}
      </div>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{t.rules}</h3>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          {t.rulesList.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <div className={styles.sectionHeading}>{t.members}</div>
      {members.map((m) => (
        <div key={m.id} className={styles.item}>
          <span className={styles.itemTitle}>{m.name}</span>
        </div>
      ))}
    </>
  );
}
