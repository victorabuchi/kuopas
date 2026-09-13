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
    href: '/groups',
    key: 'groups' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
        <path d="M16 8.5a3 3 0 1 1 3.5 2.96" />
        <path d="M16.5 13.2c2.6.4 4.5 2.4 4.9 5.3" />
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

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Sidebar({ tenantName, nav }: { tenantName: string; nav: NavDict }) {
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
          href="/profile"
          title={nav.profile}
          className={`${styles.railAvatar} ${pathname.startsWith('/profile') ? styles.railAvatarActive : ''}`}
        >
          {initials(tenantName)}
        </Link>
      </div>
    </nav>
  );
}
