import type { Metadata } from 'next';
import styles from '../admin.module.css';
import { getLocale } from '../../../lib/i18n';
import { getLiving } from '../../../lib/living';
import { getSplitterConfig } from '../../../lib/splitter';
import { saveSplitterSettingsAction } from '../../../lib/admin-settings-actions';
import { bankMode } from '../../../lib/openbanking';

export const metadata: Metadata = {
  title: 'Settings - Kuopas admin',
};

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const q = await searchParams;
  const t = getLiving(await getLocale()).bank.admin;
  const config = await getSplitterConfig();
  const mode = bankMode();

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: '#767676', marginTop: 6, marginBottom: 24 }}>{t.lede}</p>
      {q.saved === '1' && <div className={styles.card}>{t.saved}</div>}

      <div className={styles.card}>
        <h2>{t.splitterHeading}</h2>
        <form action={saveSplitterSettingsAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="mode">{t.mode}</label>
            <select id="mode" name="mode" defaultValue={config.mode}>
              <option value="micro">{t.modeMicro}</option>
              <option value="all">{t.modeAll}</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="limit">{t.limit}</label>
            <input id="limit" name="limit" inputMode="decimal" defaultValue={(config.microLimitCents / 100).toFixed(2)} />
          </div>
          <div>
            <button type="submit" className={styles.submit}>
              {t.save}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.card}>
        <h2>{t.bankHeading}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <strong style={{ fontSize: 14 }}>{t.bankMode}</strong>
          <span style={{ color: '#767676', fontSize: 13 }}>{t.bankStates[mode]}</span>
        </div>
      </div>
    </>
  );
}
