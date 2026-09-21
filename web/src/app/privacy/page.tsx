import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import styles from '../legal.module.css';

const mulish = Mulish({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-mulish' });

export const metadata: Metadata = {
  title: 'Privacy policy - Kuopas',
};

export default function PrivacyPage() {
  return (
    <div className={`${styles.page} ${mulish.variable}`}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.logoLink}>
          <Image src="/Kuopas-logo.png" alt="Kuopas" width={200} height={83} className={styles.logo} priority />
        </Link>
      </div>

      <div className={styles.content}>
        <h1>Privacy policy</h1>
        <p className={styles.updated}>Last updated: September 2026</p>

        <p>
          This describes what Kuopas (Kuopion opiskelija-asunnot Oy) collects through the app and why. Kuopas
          is the data controller for the information described here.
        </p>

        <h2>1. What we collect</h2>
        <ul>
          <li>Account details: name, email, unit (building, stairwell, apartment).</li>
          <li>Content you create: chat messages, noticeboard posts, complaints, and photos you attach to them.</li>
          <li>Booking activity: laundry, sauna, and parking reservations.</li>
          <li>Basic technical data needed to run the app, such as your session and, if you enable them, push notification subscriptions.</li>
        </ul>

        <h2>2. Why we collect it</h2>
        <p>
          To run the building chats, noticeboard, bookings, and complaints features; to let Kuopas staff
          respond to you; and to keep the app secure. We do not use your data for advertising.
        </p>

        <h2>3. Who can see what</h2>
        <p>
          Building- and floor-level chats and the noticeboard show a pseudonym instead of your real name.
          Your apartment chat, and Kuopas staff handling a complaint or a report, see your real or chosen
          name. Kuopas staff can see the real identity behind a reported noticeboard post.
        </p>

        <h2>4. How long we keep it</h2>
        <p>
          We keep account and tenancy data for as long as your account is active, and for a reasonable period
          after you move out for record-keeping. You can ask us to delete your account and associated content at any time, without logging in,
          at <a href="/delete-account">kuopas.com/delete-account</a>.
        </p>

        <h2>5. Your rights</h2>
        <p>
          Under Finnish and EU data protection law, you can ask to see the data we hold about you, ask us to
          correct it, or ask us to delete it, subject to any legal obligation we have to keep it.
        </p>

        <h2>6. Contact</h2>
        <p>
          For any privacy question or request, contact{' '}
          <a href="mailto:customerservice@kuopas.fi">customerservice@kuopas.fi</a>.
        </p>
      </div>
    </div>
  );
}
