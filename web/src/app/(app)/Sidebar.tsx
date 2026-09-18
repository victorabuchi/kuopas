'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './app-shell.module.css';
import type { getDictionary } from '../../lib/dictionary';

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
        <path d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 4v-4h-1A2.5 2.5 0 0 1 4 13.5v-7A2.5 2.5 0 0 1 6.5 4Z" />
        <path d="M8.5 10.2h.01M12 10.2h.01M15.5 10.2h.01" />
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
];

type NavDict = ReturnType<typeof getDictionary>['nav'];
type SettingsDict = ReturnType<typeof getDictionary>['settings'];

export default function Sidebar({
  nav,
  back,
  settings,
}: {
  nav: NavDict;
  back: string;
  settings: SettingsDict;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname.startsWith('/settings')) {
    const category = searchParams.get('category') === 'language' ? 'language' : 'general';
    return (
      <nav className={styles.rail}>
        <div className={styles.railTop}>
          <Link href="/home" title={back} className={styles.railLink}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link
            href="/settings?category=general"
            title={settings.generalCategory}
            className={`${styles.railLink} ${category === 'general' ? styles.railLinkActive : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5 19.5a7 7 0 0 1 14 0" />
            </svg>
          </Link>
          <Link
            href="/settings?category=language"
            title={settings.languageCategory}
            className={`${styles.railLink} ${category === 'language' ? styles.railLinkActive : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M3.5 12h17" />
              <path d="M12 3.5a13 13 0 0 1 3.5 8.5A13 13 0 0 1 12 20.5 13 13 0 0 1 8.5 12 13 13 0 0 1 12 3.5Z" />
            </svg>
          </Link>
        </div>
      </nav>
    );
  }

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
        <Link href="/settings" title={nav.settings} className={styles.railLink}>
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
