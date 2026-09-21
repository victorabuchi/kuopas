'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../staff.module.css';
import type { getDictionary } from '../../../lib/dictionary';

type StaffDict = ReturnType<typeof getDictionary>['staff'];
type Extra = { verifications: string; guarantors: string; leases: string; maintenance: string; market: string; facilities: string; homes: string; applications: string; exchange: string; inspections: string };

function icon(children: React.ReactNode) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const EXTRA_ITEMS: { href: string; key: keyof Extra; icon: React.ReactNode }[] = [
  {
    href: '/staff/verifications',
    key: 'verifications',
    icon: icon(
      <>
        <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>,
    ),
  },
  {
    href: '/staff/guarantors',
    key: 'guarantors',
    icon: icon(
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19a6 6 0 0 1 12 0" />
        <path d="m16 11 2 2 4-4" />
      </>,
    ),
  },
  {
    href: '/staff/maintenance',
    key: 'maintenance',
    icon: icon(
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>,
    ),
  },
  {
    href: '/staff/market',
    key: 'market',
    icon: icon(
      <>
        <path d="M4 9h16l-1.4 10.2a1.5 1.5 0 0 1-1.5 1.3H6.9a1.5 1.5 0 0 1-1.5-1.3L4 9Z" />
        <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      </>,
    ),
  },
  {
    href: '/staff/homes',
    key: 'homes',
    icon: icon(
      <>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-9" />
      </>,
    ),
  },
  {
    href: '/staff/applications',
    key: 'applications',
    icon: icon(
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
      </>,
    ),
  },
  {
    href: '/staff/exchange',
    key: 'exchange',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" />
        <path d="M12 3.5a13 13 0 0 1 3.5 8.5A13 13 0 0 1 12 20.5 13 13 0 0 1 8.5 12 13 13 0 0 1 12 3.5Z" />
      </>,
    ),
  },
  {
    href: '/staff/inspections',
    key: 'inspections',
    icon: icon(
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="m9 13 2 2 4-4" />
        <path d="M9 4h6v3H9z" />
      </>,
    ),
  },
  {
    href: '/staff/facilities',
    key: 'facilities',
    icon: icon(
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
        <path d="m9 15 2 2 4-4" />
      </>,
    ),
  },
  {
    href: '/staff/leases',
    key: 'leases',
    icon: icon(
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>,
    ),
  },
];

const NAV_ITEMS = [
  {
    href: '/staff',
    key: 'railDashboard' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    href: '/staff/complaints',
    key: 'railComplaints' as const,
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
    key: 'railReplies' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-3.5L6 21V4.5a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
];

export default function Sidebar({ dict, extra }: { dict: StaffDict; extra: Extra }) {
  const pathname = usePathname();

  return (
    <nav className={styles.rail}>
      <div className={styles.railTop}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/staff' ? pathname === '/staff' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={dict[item.key]}
              className={`${styles.railLink} ${active ? styles.railLinkActive : ''}`}
            >
              {item.icon}
              <span className={styles.railLabel}>{dict[item.key]}</span>
            </Link>
          );
        })}
        {EXTRA_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={extra[item.key]}
              className={`${styles.railLink} ${active ? styles.railLinkActive : ''}`}
            >
              {item.icon}
              <span className={styles.railLabel}>{extra[item.key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
