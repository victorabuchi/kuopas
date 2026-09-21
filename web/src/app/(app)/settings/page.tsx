import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './settings.module.css';
import { getSession } from '../../../lib/session';
import { db } from '../../../prisma/db';
import TopBar from '../TopBar';
import LanguageSwitcher from '../LanguageSwitcher';
import { getLocale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/dictionary';
import { logoutAction } from '../../../lib/auth-actions';
import { getLiving } from '../../../lib/living';

export const metadata: Metadata = {
  title: 'Settings - Kuopas',
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .first();
  if (!tenant) redirect('/login');

  const unit = tenant.unit!;
  const stairwell = unit.stairwell!;
  const building = stairwell.building!;

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const { category: rawCategory } = await searchParams;
  const category = rawCategory === 'language' ? 'language' : 'general';

  return (
    <div className={styles.page}>
      <TopBar title={dict.settings.title} />

      <div className={styles.content}>
        <div className={styles.panel}>
          {category === 'general' ? (
            <div className={styles.card}>
              <h2>{dict.settings.generalCategory}</h2>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{dict.settings.name}</span>
                <span className={styles.rowValue}>{tenant.name}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{dict.settings.email}</span>
                <span className={styles.rowValue}>{tenant.email}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{dict.profile.building}</span>
                <span className={styles.rowValue}>{building.name}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{dict.profile.stairwell}</span>
                <span className={styles.rowValue}>{stairwell.label}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{dict.profile.unit}</span>
                <span className={styles.rowValue}>{unit.code}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{dict.profile.floor}</span>
                <span className={styles.rowValue}>{unit.floor}</span>
              </div>
            </div>
          ) : null}
          {category === 'general' && (
            <div className={styles.card}>
              <form action={logoutAction}>
                <button type="submit" className={styles.signOut}>
                  {dict.profile.logOut}
                </button>
              </form>
              <a href="/delete-account" style={{ fontSize: 13.5, color: '#b3261e', fontWeight: 700 }}>
                {getLiving(locale).account.settingsLink}
              </a>
            </div>
          )}
          {category === 'language' && (
            <div className={styles.card}>
              <h2>{dict.settings.languageCategory}</h2>
              <p className={styles.lede}>{dict.settings.languageLede}</p>
              <LanguageSwitcher locale={locale} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
