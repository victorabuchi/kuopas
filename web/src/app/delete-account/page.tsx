import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../auth.module.css';
import LanguageSwitcher from '../(app)/LanguageSwitcher';
import { getSession } from '../../lib/session';
import { getLocale } from '../../lib/i18n';
import { getLiving } from '../../lib/living';
import { db } from '../../prisma/db';
import { deleteMyAccountAction, requestAccountDeletionAction } from '../../lib/account-actions';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Delete account - Kuopas',
};

export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; devlink?: string }>;
}) {
  const q = await searchParams;
  const locale = await getLocale();
  const t = getLiving(locale).account;
  const session = await getSession();
  const tenant = session ? await db.orm.public.Tenant.where({ id: session.tenantId }).first() : null;
  const errorText = q.error ? (t.errors as Record<string, string>)[q.error] : null;

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <Link href="/" className={styles.logoLink}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={160} height={66} className={styles.logoImg} priority />
        <h1>{t.title}</h1>
      </Link>

      <div className={styles.card} style={{ maxWidth: 560 }}>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1.5 }}>{t.lede}</p>
        {errorText && <div className={styles.error}>{errorText}</div>}
        {q.sent === '1' && <div className={styles.error} style={{ background: 'color-mix(in srgb, #046a38 8%, white)', color: '#046a38' }}>{t.sent}</div>}
        {q.devlink && (
          <div className={styles.error} style={{ wordBreak: 'break-all' }}>
            {t.devLink} <a href={q.devlink}>{q.devlink}</a>
          </div>
        )}

        <div>
          <strong style={{ fontSize: 14 }}>{t.deletedHeading}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
            {t.deleted.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong style={{ fontSize: 14 }}>{t.keptHeading}</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5 }}>{t.kept}</p>
        </div>

        {tenant && (
          <form action={deleteMyAccountAction} className={styles.form}>
            <strong style={{ fontSize: 14 }}>{t.signedIn}</strong>
            <p style={{ margin: 0, fontSize: 14 }}>{t.signedInBody}</p>
            <div className={styles.field}>
              <label htmlFor="confirm">{t.confirmLabel}</label>
              <input id="confirm" name="confirm" type="email" autoComplete="off" placeholder={tenant.email} required />
            </div>
            <button type="submit" className={styles.submit} style={{ background: '#b3261e' }}>
              {t.deleteNow}
            </button>
          </form>
        )}

        <form action={requestAccountDeletionAction} className={styles.form}>
          <strong style={{ fontSize: 14 }}>{t.howHeading}</strong>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{t.how}</p>
          <div className={styles.field}>
            <label htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <button type="submit" className={styles.submit}>
            {t.send}
          </button>
        </form>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>{t.contact}</p>
      </div>

      <div className={styles.langRow}>
        <LanguageSwitcher locale={locale} />
      </div>
    </div>
  );
}
