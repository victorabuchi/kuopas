'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';
import type { getDictionary } from '../../lib/dictionary';

type StaffDict = ReturnType<typeof getDictionary>['staff'];

export default function Sidebar({ dict }: { dict: StaffDict }) {
  const pathname = usePathname();
  const active = pathname === '/admin';

  return (
    <nav className={styles.rail}>
      <div className={styles.railTop}>
        <Link href="/admin" title={dict.manageRoles} className={`${styles.railLink} ${active ? styles.railLinkActive : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
            <path d="M16 8.5a3 3 0 1 1 3.5 2.96" />
            <path d="M16.5 13.2c2.6.4 4.5 2.4 4.9 5.3" />
          </svg>
          <span className={styles.railLabel}>{dict.manageRoles}</span>
        </Link>
      </div>
    </nav>
  );
}
