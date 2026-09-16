import Link from 'next/link';
import Image from 'next/image';
import { Mulish } from 'next/font/google';
import styles from './page.module.css';
import { getLocale } from '../lib/i18n';
import { getDictionary } from '../lib/dictionary';
import LanguageSwitcher from './(app)/LanguageSwitcher';
import AnimatedTenantDemo from './AnimatedTenantDemo';
import AnimatedStaffDemo from './AnimatedStaffDemo';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default async function Home() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.landing;

  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <nav className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navRow}`}>
          <div className={styles.logo}>
            <Image src="/Kuopas-logo.png" alt="Kuopas" width={140} height={58} className={styles.logoImg} priority />
          </div>
          <div className={styles.navLinks}>
            <a href="#chat">{dict.nav.chats}</a>
            <a href="#feed">{dict.nav.feed}</a>
            <a href="#laundry">{dict.nav.laundry}</a>
            <a href="#support">{dict.nav.support}</a>
          </div>
          <div className={styles.navActions}>
            <LanguageSwitcher locale={locale} />
            <Link href="/login" className={styles.btnPrimary}>
              {dict.common.logIn}
            </Link>
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroGlowA} />
        <div className={styles.heroGlowB} />
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div className={`${styles.heroEyebrow} ${styles.fadeUp}`}>{t.eyebrow}</div>
          <h1 className={styles.fadeUp}>
            {t.heroLine1}
            <br />
            <em>{t.heroEmphasis}</em>
          </h1>
          <p className={`${styles.lede} ${styles.fadeUp}`}>{t.heroLede}</p>
          <div className={`${styles.heroCta} ${styles.fadeUp}`}>
            <Link href="/login" className={styles.btnPrimary}>
              {t.heroCta}
            </Link>
            <span className={styles.heroCtaNote}>{t.heroNote}</span>
          </div>

          <div className={styles.heroIcons}>
            {[
              { href: '#chat', label: t.chatTitle, path: 'M20 12a7 7 0 0 1-7 7H8l-4 3 1-4.5A7 7 0 1 1 20 12Z' },
              { href: '#feed', label: t.feedTitle, path: 'M3.5 4.5h17v15h-17zM7.5 9h9M7.5 12.5h9M7.5 16h5.5' },
              { href: '#laundry', label: t.laundryTitle, path: 'M4 3.5h16v17H4zM12 13m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M12 13m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0' },
              { href: '#support', label: t.supportTitle, path: 'M4 13v-1a8 8 0 0 1 16 0v1M2.5 13h5v6h-5zM16.5 13h5v6h-5zM20 19v1a3 3 0 0 1-3 3h-3' },
            ].map((icon) => (
              <a key={icon.href} href={icon.href} className={styles.heroIcon} aria-label={icon.label} title={icon.label}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className={`${styles.wrap} ${styles.heroDemo}`}>
          <AnimatedTenantDemo />
        </div>
      </header>

      <section id="staff" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <h2>{t.staffHeading}</h2>
            <p>{t.staffLede}</p>
          </div>
          <AnimatedStaffDemo />
        </div>
      </section>

      <section id="chat" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <h2>{t.featuresHeading}</h2>
            <p>{t.featuresLede}</p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureCard}>
              <div className={styles.featureTop}>
                <div className={styles.featureIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 12a7 7 0 0 1-7 7H8l-4 3 1-4.5A7 7 0 1 1 20 12Z" />
                  </svg>
                </div>
                <span className={styles.tag}>{t.liveNow}</span>
              </div>
              <h3>{t.chatTitle}</h3>
              <p>{t.chatBody}</p>
            </div>

            <div className={styles.featureCard} id="feed">
              <div className={styles.featureTop}>
                <div className={styles.featureIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                    <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5.5" />
                  </svg>
                </div>
                <span className={styles.tag}>{t.liveNow}</span>
              </div>
              <h3>{t.feedTitle}</h3>
              <p>{t.feedBody}</p>
            </div>

            <div className={styles.featureCard} id="laundry">
              <div className={styles.featureTop}>
                <div className={styles.featureIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="3.5" width="16" height="17" rx="3" />
                    <circle cx="12" cy="13" r="5" />
                    <circle cx="12" cy="13" r="1.6" />
                    <path d="M8 6.5h1M11.5 6.5h1" />
                  </svg>
                </div>
                <span className={styles.tag}>{t.liveNow}</span>
              </div>
              <h3>{t.laundryTitle}</h3>
              <p>{t.laundryBody}</p>
            </div>

            <div className={styles.featureCard} id="support">
              <div className={styles.featureTop}>
                <div className={styles.featureIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
                    <rect x="2.5" y="13" width="5" height="6" rx="2" />
                    <rect x="16.5" y="13" width="5" height="6" rx="2" />
                    <path d="M20 19v1a3 3 0 0 1-3 3h-3" />
                  </svg>
                </div>
                <span className={styles.tag}>{t.liveNow}</span>
              </div>
              <h3>{t.supportTitle}</h3>
              <p>{t.supportBody}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsSection}>
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <h2>{t.statsHeading}</h2>
            <p>{t.statsLede}</p>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.num}>~3,000</div>
              <div className={styles.label}>{t.statStudents}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.num}>30</div>
              <div className={styles.label}>{t.statBuildings}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.num}>1</div>
              <div className={styles.label}>{t.statApp}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.ctaBand}>
            <span className={styles.tag}>{t.ctaTag}</span>
            <h2>{t.ctaHeading}</h2>
            <p>{t.ctaBody}</p>
            <Link href="/login" className={styles.btnPrimary}>
              {t.heroCta}
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerRow}>
            <div className={styles.logo}>
              <span className={styles.logoDot} />
              Kuopas
            </div>
            <div className={styles.footerLinks}>
              <a href="#chat">{dict.nav.chats}</a>
              <a href="#feed">{dict.nav.feed}</a>
              <a href="#laundry">{dict.nav.laundry}</a>
              <a href="#support">{dict.nav.support}</a>
              <span>kuopas.fi</span>
            </div>
          </div>
          <p className={styles.footerFine}>Kuopas, Kuopion opiskelija-asunnot Oy &middot; owned by the City of Kuopio.</p>
        </div>
      </footer>
    </div>
  );
}
