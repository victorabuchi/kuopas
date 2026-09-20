import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../../staff.module.css';
import { db } from '../../../../prisma/db';
import { getLocale } from '../../../../lib/i18n';
import { getLiving } from '../../../../lib/living';
import { LEASE_KINDS, formatDay, formatMoney, parseDay } from '../../../../lib/lease';
import {
  addUnitMediaAction,
  createLeaseAction,
  createTermAction,
  deleteTermAction,
  markChargePaidAction,
  setLeaseStatusAction,
} from '../../../../lib/lease-actions';

export const metadata: Metadata = {
  title: 'Leases - Kuopas staff',
};

const TABS = ['leases', 'terms', 'turnaround', 'media'] as const;
type Tab = (typeof TABS)[number];

export default async function StaffLeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const q = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(q.tab ?? '') ? (q.tab as Tab) : 'leases';
  const locale = await getLocale();
  const t = getLiving(locale).staff.leases;
  const kindLabel = (k: string) => (t.kinds as Record<string, string>)[k] ?? k;
  const tabLabels: Record<Tab, string> = {
    leases: t.tabLeases,
    terms: t.tabTerms,
    turnaround: t.tabTurnaround,
    media: t.tabMedia,
  };

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: '6px', marginBottom: '24px' }}>{t.lede}</p>

      <div className={styles.tabs}>
        {TABS.map((key) => (
          <Link key={key} href={`/staff/leases?tab=${key}`} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}>
            {tabLabels[key]}
          </Link>
        ))}
      </div>

      {tab === 'leases' && <LeasesTab t={t} kindLabel={kindLabel} locale={locale} />}
      {tab === 'terms' && <TermsTab t={t} kindLabel={kindLabel} />}
      {tab === 'turnaround' && <TurnaroundTab t={t} from={q.from} to={q.to} />}
      {tab === 'media' && <MediaTab t={t} />}
    </>
  );
}

type T = ReturnType<typeof getLiving>['staff']['leases'];

async function LeasesTab({ t, kindLabel, locale }: { t: T; kindLabel: (k: string) => string; locale: string }) {
  const tenants = await db.orm.public.Tenant.orderBy((x) => x.name.asc()).all();
  const leases = await db.orm.public.Lease.include('tenant', (x) => x)
    .include('unit', (u) => u)
    .include('charges', (c) => c.orderBy((x) => x.periodStart.asc()))
    .orderBy((l) => l.startDate.desc())
    .limit(100)
    .all();
  const money = (cents: number) => formatMoney(cents, locale === 'fi' ? 'fi-FI' : 'en-FI');
  const day = (iso: string) => formatDay(new Date(iso));
  const year = new Date().getUTCFullYear();

  return (
    <>
      <div className={styles.card}>
        <h2>{t.newLease}</h2>
        <form action={createLeaseAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="tenantId">{t.resident}</label>
            <select id="tenantId" name="tenantId" required defaultValue="">
              <option value="" disabled>
                {t.chooseResident}
              </option>
              {tenants.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.email})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="kind">{t.type}</label>
            <select id="kind" name="kind" defaultValue="academic_9m">
              {LEASE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="year">{t.year}</label>
            <input id="year" name="year" type="number" defaultValue={year} />
          </div>
          <div className={styles.field}>
            <label>{t.customDates}</label>
            <div className={styles.inlineForm}>
              <input name="startDate" type="date" aria-label={t.start} />
              <input name="endDate" type="date" aria-label={t.end} />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="rent">{t.rent}</label>
            <input id="rent" name="rent" inputMode="decimal" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="deposit">{t.deposit}</label>
            <input id="deposit" name="deposit" inputMode="decimal" defaultValue="0" />
          </div>
          <div className={styles.field}>
            <label htmlFor="upfrontMonths">{t.upfront}</label>
            <input id="upfrontMonths" name="upfrontMonths" type="number" min={0} max={12} defaultValue={0} />
          </div>
          <button type="submit" className={styles.submit}>
            {t.create}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2>{t.existing}</h2>
        {leases.length === 0 && <div className={styles.empty}>{t.empty}</div>}
        <div className={styles.list}>
          {leases.map((l) => (
            <div key={l.id} className={styles.row} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>
                  {l.tenant?.name} · {l.unit?.code} · {kindLabel(l.kind)}
                </span>
                <span className={styles.rowMeta}>
                  {day(l.startDate)} to {day(l.endDate)} · {money(l.monthlyRentCents)} · {l.status}
                </span>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{t.charges}</summary>
                {l.charges.map((c) => (
                  <form key={c.id} action={markChargePaidAction} className={styles.inlineForm} style={{ padding: '6px 0' }}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="paid" value={c.paidAt ? '0' : '1'} />
                    <span style={{ flex: 1, fontSize: 13 }}>
                      {day(c.periodStart)} to {day(c.periodEnd)} · {money(c.amountCents)}
                      {c.prorated ? ' *' : ''}
                    </span>
                    <button type="submit" className={styles.inlineSubmit}>
                      {c.paidAt ? t.markUnpaid : t.markPaid}
                    </button>
                  </form>
                ))}
              </details>
              <form action={setLeaseStatusAction} className={styles.inlineForm} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={l.id} />
                <button type="submit" name="status" value="ended" className={styles.inlineSubmit}>
                  {t.markEnded}
                </button>
                <button type="submit" name="status" value="cancelled" className={styles.inlineSubmit} style={{ background: '#b3261e' }}>
                  {t.cancel}
                </button>
                <button type="submit" name="status" value="active" className={styles.inlineSubmit}>
                  {t.reopen}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

async function TermsTab({ t, kindLabel }: { t: T; kindLabel: (k: string) => string }) {
  const terms = await db.orm.public.AcademicTerm.orderBy((x) => x.startDate.desc()).all();
  const day = (iso: string) => formatDay(new Date(iso));

  return (
    <>
      <div className={styles.card}>
        <h2>{t.termsHeading}</h2>
        <p style={{ color: '#767676', margin: '0 0 12px' }}>{t.termsLede}</p>
        {terms.length === 0 && <div className={styles.empty}>{t.noTerms}</div>}
        <div className={styles.list}>
          {terms.map((term) => (
            <div key={term.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowCategory}>
                  {term.name} · {kindLabel(term.kind)}
                </span>
                <span className={styles.rowMeta}>
                  {day(term.startDate)} to {day(term.endDate)} · {t.moveInFrom} {day(term.moveInFrom)} - {day(term.moveInTo)}
                </span>
              </div>
              <form action={deleteTermAction}>
                <input type="hidden" name="id" value={term.id} />
                <button type="submit" className={styles.inlineSubmit}>
                  {t.remove}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.card}>
        <h2>{t.addTerm}</h2>
        <form action={createTermAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="tname">{t.termName}</label>
            <input id="tname" name="name" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="tkind">{t.type}</label>
            <select id="tkind" name="kind" defaultValue="autumn">
              {LEASE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </div>
          {(['startDate', 'endDate', 'moveInFrom', 'moveInTo'] as const).map((key) => (
            <div key={key} className={styles.field}>
              <label htmlFor={key}>
                {key === 'startDate' ? t.start : key === 'endDate' ? t.end : key === 'moveInFrom' ? t.moveInFrom : t.moveInTo}
              </label>
              <input id={key} name={key} type="date" required />
            </div>
          ))}
          <button type="submit" className={styles.submit}>
            {t.addTerm}
          </button>
        </form>
      </div>
    </>
  );
}

async function TurnaroundTab({ t, from, to }: { t: T; from?: string; to?: string }) {
  const year = new Date().getUTCFullYear();
  const start = parseDay(from || `${year}-05-15`);
  const end = parseDay(to || `${year}-09-15`);

  const leases = await db.orm.public.Lease.where((l) => l.status.eq('active'))
    .include('unit', (u) => u.include('stairwell', (s) => s.include('building', (b) => b)))
    .include('tenant', (x) => x)
    .all();

  const inWindow = (iso: string) => {
    const d = new Date(iso).getTime();
    return d >= start.getTime() && d <= end.getTime();
  };
  const label = (l: (typeof leases)[number]) => `${l.unit?.stairwell?.building?.name ?? ''} ${l.unit?.code ?? ''}`.trim();

  const movingOut = leases.filter((l) => inWindow(l.endDate)).sort((a, b) => a.endDate.localeCompare(b.endDate));
  const movingIn = leases.filter((l) => inWindow(l.startDate)).sort((a, b) => a.startDate.localeCompare(b.startDate));

  const sameDay: { unit: string; date: string }[] = [];
  const vacant: { unit: string; from: string; until: string }[] = [];
  for (const out of movingOut) {
    const next = leases
      .filter((l) => l.unitId === out.unitId && new Date(l.startDate).getTime() > new Date(out.endDate).getTime() - 86_400_000)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    if (!next) continue;
    const gapDays = Math.round((new Date(next.startDate).getTime() - new Date(out.endDate).getTime()) / 86_400_000);
    if (gapDays <= 1) sameDay.push({ unit: label(out), date: formatDay(new Date(next.startDate)) });
    else vacant.push({ unit: label(out), from: formatDay(new Date(out.endDate)), until: formatDay(new Date(next.startDate)) });
  }

  const byDay = new Map<string, number>();
  for (const l of movingOut) byDay.set(formatDay(new Date(l.endDate)), (byDay.get(formatDay(new Date(l.endDate))) ?? 0) + 1);

  return (
    <>
      <div className={styles.card}>
        <h2>{t.turnaroundHeading}</h2>
        <p style={{ color: '#767676', margin: '0 0 12px' }}>{t.turnaroundLede}</p>
        <form method="get" className={styles.inlineForm}>
          <input type="hidden" name="tab" value="turnaround" />
          <input name="from" type="date" defaultValue={formatDay(start)} aria-label={t.from} />
          <input name="to" type="date" defaultValue={formatDay(end)} aria-label={t.to} />
          <button type="submit" className={styles.inlineSubmit}>
            {t.show}
          </button>
        </form>
      </div>

      <Section title={`${t.movingOut} (${movingOut.length})`} empty={t.noneInWindow}>
        {movingOut.map((l) => (
          <Row key={l.id} main={label(l)} meta={`${l.tenant?.name} · ${formatDay(new Date(l.endDate))} · ${byDay.get(formatDay(new Date(l.endDate)))} ${t.movingOut.toLowerCase()}`} />
        ))}
      </Section>
      <Section title={`${t.movingIn} (${movingIn.length})`} empty={t.noneInWindow}>
        {movingIn.map((l) => (
          <Row key={l.id} main={label(l)} meta={`${l.tenant?.name} · ${formatDay(new Date(l.startDate))}`} />
        ))}
      </Section>
      <Section title={`${t.sameDay} (${sameDay.length})`} empty={t.noneInWindow}>
        {sameDay.map((s) => (
          <Row key={`${s.unit}-${s.date}`} main={s.unit} meta={s.date} />
        ))}
      </Section>
      <Section title={`${t.vacant} (${vacant.length})`} empty={t.noneInWindow}>
        {vacant.map((s) => (
          <Row key={`${s.unit}-${s.from}`} main={s.unit} meta={`${s.from} - ${s.until}`} />
        ))}
      </Section>
    </>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className={styles.card}>
      <h2>{title}</h2>
      {children.length === 0 && <div className={styles.empty}>{empty}</div>}
      <div className={styles.list}>{children}</div>
    </div>
  );
}

function Row({ main, meta }: { main: string; meta: string }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowCategory}>{main}</span>
        <span className={styles.rowMeta}>{meta}</span>
      </div>
    </div>
  );
}

async function MediaTab({ t }: { t: T }) {
  const units = await db.orm.public.Unit.include('stairwell', (s) => s.include('building', (b) => b))
    .orderBy((u) => u.code.asc())
    .all();

  return (
    <div className={styles.card}>
      <h2>{t.mediaHeading}</h2>
      <p style={{ color: '#767676', margin: '0 0 12px' }}>{t.mediaLede}</p>
      <form action={addUnitMediaAction} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="unitId">{t.unit}</label>
          <select id="unitId" name="unitId" required defaultValue="">
            <option value="" disabled>
              {t.chooseUnit}
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.stairwell?.building?.name} {u.stairwell?.label}
                {u.code}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="file">{t.file}</label>
          <input id="file" name="file" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="caption">{t.caption}</label>
          <input id="caption" name="caption" />
        </div>
        <button type="submit" className={styles.submit}>
          {t.upload}
        </button>
      </form>
    </div>
  );
}
