import Link from 'next/link';
import { Mulish } from 'next/font/google';
import styles from './page.module.css';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export default function Home() {
  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <nav className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navRow}`}>
          <div className={styles.logo}>
            <span className={styles.logoDot} />
            Kuopas
          </div>
          <div className={styles.navLinks}>
            <a href="#chat">Chat</a>
            <a href="#feed">Feed</a>
            <a href="#laundry">Laundry</a>
            <a href="#support">Support</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.btnPrimary}>
              Log in
            </Link>
          </div>
        </div>
      </nav>

      <header className={`${styles.wrap} ${styles.hero}`}>
        <div>
          <div className={styles.heroEyebrow}>THE NEW KUOPAS APP</div>
          <h1>
            Your Kuopas life,
            <br />
            all in <em>one place</em>.
          </h1>
          <p className={styles.lede}>
            Chat with your housemates, catch every Kuopas update, book the laundry machine, and reach customer
            support, all without leaving one app.
          </p>
          <div className={styles.heroCta}>
            <Link href="/login" className={styles.btnPrimary}>
              Log in to Kuopas
            </Link>
            <span className={styles.heroCtaNote}>For residents across Kuopas&apos; buildings in Kuopio.</span>
          </div>
        </div>

        <div className={styles.mock}>
          <div className={styles.mockHead}>
            <div className={styles.mockAvatar}>PK</div>
            <div className={styles.mockHeadText}>
              <div className={styles.t1}>Puijonkatu 5 &middot; floor 3</div>
              <div className={styles.t2}>6 housemates</div>
            </div>
          </div>
          <div className={styles.mockBody}>
            <div className={styles.bubbleIn}>
              <div className={styles.bubbleName}>Aino</div>
              anyone free to grab the sauna slot tonight?
            </div>
            <div className={styles.bubbleOut}>yeah I&apos;ll book 8pm</div>
            <div className={styles.bubbleIn}>
              <div className={styles.bubbleName}>Eetu</div>
              Kuopas just posted a water shutoff notice for tmrw morning, saw it in the feed
            </div>
            <div className={styles.mockInput}>
              Message the floor&hellip;
              <span className={styles.mockSend}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 14-7-7 14-2-6z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </header>

      <section id="chat" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <h2>Everything you need as a Kuopas resident</h2>
            <p>One login, four things you actually use, starting with the one residents asked for most.</p>
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
                <span className={styles.tag}>Live now</span>
              </div>
              <h3>Chat with your housemates</h3>
              <p>
                Move in and you&apos;re automatically added to your building, stairwell, and floor group chats. No
                hunting down phone numbers or adding people by hand.
              </p>
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
                <span className={styles.tagMuted}>Coming soon</span>
              </div>
              <h3>Never miss a Kuopas update</h3>
              <p>
                Maintenance notices, sauna schedules, and news from Kuopas, collected in one feed instead of
                scattered across email and noticeboards.
              </p>
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
                <span className={styles.tag}>Live now</span>
              </div>
              <h3>Book the laundry machine</h3>
              <p>
                See which machines are free in your building and reserve a slot from your phone. No more walking
                down to check, or a slot that mysteriously stays &quot;taken.&quot;
              </p>
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
                <span className={styles.tagMuted}>Coming soon</span>
              </div>
              <h3>Reach support in seconds</h3>
              <p>
                Skip the phone queue and the contact form. Message Kuopas customer service directly and pick up
                right where you left off.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsSection}>
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <h2>Built for every Kuopas resident</h2>
            <p>
              Kuopas has housed students in Kuopio for over 50 years; this app is for everyone living in one of its
              buildings today.
            </p>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.num}>~3,000</div>
              <div className={styles.label}>students housed by Kuopas</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.num}>30</div>
              <div className={styles.label}>buildings across Kuopio</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.num}>1</div>
              <div className={styles.label}>app for all of it</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.ctaBand}>
            <span className={styles.tag}>It is good to be at home.</span>
            <h2>Log in and see your building&apos;s chat.</h2>
            <p>Your building, stairwell, and floor groups are already waiting, no setup needed.</p>
            <Link href="/login" className={styles.btnPrimary}>
              Log in to Kuopas
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
              <a href="#chat">Chat</a>
              <a href="#feed">Feed</a>
              <a href="#laundry">Laundry</a>
              <a href="#support">Support</a>
              <span>kuopas.fi</span>
            </div>
          </div>
          <p className={styles.footerFine}>Kuopas, Kuopion opiskelija-asunnot Oy &middot; owned by the City of Kuopio.</p>
        </div>
      </footer>
    </div>
  );
}
