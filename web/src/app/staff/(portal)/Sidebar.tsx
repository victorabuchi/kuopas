'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../staff.module.css';
import type { getDictionary } from '../../../lib/dictionary';

type StaffDict = ReturnType<typeof getDictionary>['staff'];

const NAV_ITEMS = [
  {
    href: '/staff',
    key: 'dashboardTitle' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    href: '/staff/complaints',
    key: 'complaintsInbox' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 16.5h.01" />
        <path d="M10.3 4.4 2.9 17.5a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.7 4.4a1.6 1.6 0 0 0-2.8 0Z" />
      </svg>
    ),
  },
  {
    href: '/staff/reports',
    key: 'reportsInbox' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 21V4" />
        <path d="M5 4h11l-2 4 2 4H5" />
      </svg>
    ),
  },
  {
    href: '/staff/saved-replies',
    key: 'savedReplies' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-3.5L6 21V4.5a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
];

const ROLES_ITEM = {
  href: '/staff/roles',
  key: 'manageRoles' as const,
  icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
      <path d="M16 8.5a3 3 0 1 1 3.5 2.96" />
      <path d="M16.5 13.2c2.6.4 4.5 2.4 4.9 5.3" />
    </svg>
  ),
};

export default function Sidebar({ dict, isAdmin }: { dict: StaffDict; isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, ROLES_ITEM] : NAV_ITEMS;

  return (
    <nav className={styles.rail}>
      <div className={styles.railTop}>
        {items.map((item) => {
          const active = item.href === '/staff' ? pathname === '/staff' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={dict[item.key]}
              className={`${styles.railLink} ${active ? styles.railLinkActive : ''}`}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
