'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './app-shell.module.css';
import type { getDictionary } from '../../lib/dictionary';

type NavDict = ReturnType<typeof getDictionary>['nav'];

const NAV_ITEMS = [
  {
    href: '/home',
    key: 'feed' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    href: '/chats',
    key: 'chats' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12a7 7 0 0 1-7 7H8l-4 3 1-4.5A7 7 0 1 1 20 12Z" />
      </svg>
    ),
  },
  {
    href: '/messages',
    key: 'messages' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    href: '/feed',
    key: 'noticeboard' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
        <path d="M7.5 8h4M7.5 12h9M7.5 16h6" />
      </svg>
    ),
  },
  {
    href: '/complaints',
    key: 'complaints' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 16.5h.01" />
        <path d="M10.3 4.4 2.9 17.5a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.7 4.4a1.6 1.6 0 0 0-2.8 0Z" />
      </svg>
    ),
  },
  {
    href: '/move-in-guide',
    key: 'moveInGuide' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11.5 11 13.5 15.5 9" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </svg>
    ),
  },
  {
    href: '/laundry',
    key: 'laundry' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3.5" width="16" height="17" rx="3" />
        <circle cx="12" cy="13" r="5" />
        <circle cx="12" cy="13" r="1.6" />
        <path d="M8 6.5h1M11.5 6.5h1" />
      </svg>
    ),
  },
  {
    href: '/sauna',
    key: 'sauna' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <path d="M12 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <path d="M16 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <rect x="3.5" y="13" width="17" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/parking',
    key: 'parking' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        <path d="M9.5 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
      </svg>
    ),
  },
  {
    href: '/support',
    key: 'support' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <rect x="2.5" y="13" width="5" height="6" rx="2" />
        <rect x="16.5" y="13" width="5" height="6" rx="2" />
        <path d="M20 19v1a3 3 0 0 1-3 3h-3" />
      </svg>
    ),
  },
];

export default function Sidebar({ nav }: { nav: NavDict }) {
  const pathname = usePathname();

  return (
    <nav className={styles.rail}>
      <div className={styles.railTop}>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={nav[item.key]}
              className={`${styles.railLink} ${active ? styles.railLinkActive : ''}`}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>
      <div className={styles.railBottom}>
        <Link
          href="/settings"
          title={nav.settings}
          className={`${styles.railLink} ${pathname.startsWith('/settings') ? styles.railLinkActive : ''}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <circle cx="9" cy="6" r="2" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <circle cx="15" cy="12" r="2" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="9" cy="18" r="2" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
