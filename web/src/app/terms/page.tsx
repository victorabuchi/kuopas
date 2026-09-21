import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../legal.module.css';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Terms of service - Kuopas',
};

export default function TermsPage() {
  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.logoLink}>
          <Image src="/Kuopas-logo.png" alt="Kuopas" width={200} height={83} className={styles.logo} priority />
        </Link>
      </div>

      <div className={styles.content}>
        <h1>Terms of service</h1>
        <p className={styles.updated}>Last updated: September 2026</p>

        <p>
          These terms cover your use of the Kuopas app, run by Kuopas (Kuopion opiskelija-asunnot Oy), a
          student housing company owned by the City of Kuopio. By creating an account you agree to them.
        </p>

        <h2>1. Who can use the app</h2>
        <p>
          The app is for people who live, or will live, in a Kuopas building. Staff accounts are provisioned
          by Kuopas for its own employees and are subject to the same terms.
        </p>

        <h2>2. Your account</h2>
        <p>
          Keep your login details to yourself. You are responsible for what happens under your account, so
          tell us if you think someone else has access to it.
        </p>

        <h2>3. Using the noticeboard and chats</h2>
        <p>
          Building and apartment chats, and the noticeboard, are for residents to talk to each other and to
          Kuopas. Do not post anything abusive, illegal, or that targets another resident. Kuopas can remove
          content and, for repeated misuse, restrict an account from posting.
        </p>

        <h2>4. Bookings</h2>
        <p>
          Laundry, sauna, and parking bookings are subject to the limits shown in the app (hours per week,
          how far in advance you can book). Release a slot you no longer need so someone else can take it.
        </p>

        <h2>5. Complaints and reports</h2>
        <p>
          Complaints and faults reported through the app are handled by Kuopas staff. Reporting a fault does
          not guarantee a specific response time; urgent maintenance issues should still go through the
          emergency maintenance contact on the support page.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update these terms as the app changes. We will let you know about significant changes
          through the app.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about these terms can be sent to{' '}
          <a href="mailto:customerservice@kuopas.fi">customerservice@kuopas.fi</a>.
        </p>
      </div>
    </div>
  );
}
