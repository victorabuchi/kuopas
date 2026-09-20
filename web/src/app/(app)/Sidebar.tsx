'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './app-shell.module.css';
import type { getDictionary } from '../../lib/dictionary';

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const NAV_ITEMS = [
  {
    href: '/home',
    key: 'feed' as const,
    icon: (
      <Svg>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      </Svg>
    ),
  },
  {
    href: '/chats',
    key: 'chats' as const,
    icon: (
      <Svg>
        <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" />
        <path d="M9.3 8.6c.2-.4.6-.5.9-.3l.9.5c.3.2.4.5.2.8l-.4.8a5.6 5.6 0 0 0 2.3 2.3l.8-.4c.3-.2.6-.1.8.2l.5.9c.2.3.1.7-.3.9-1 .6-2.3.4-3.7-.5-1.4-.9-2.4-2.2-2.7-3.7-.1-.7.1-1.2.7-1.5Z" />
      </Svg>
    ),
  },
  {
    href: '/communities',
    key: 'communities' as const,
    icon: (
      <Svg>
        <circle cx="12" cy="7.5" r="2.7" />
        <circle cx="5.2" cy="10.8" r="2.1" />
        <circle cx="18.8" cy="10.8" r="2.1" />
        <path d="M7.6 19a4.4 4.4 0 0 1 8.8 0" />
        <path d="M1.8 17.6a3.4 3.4 0 0 1 4.6-2.9M22.2 17.6a3.4 3.4 0 0 0-4.6-2.9" />
      </Svg>
    ),
  },
  {
    href: '/messages',
    key: 'messages' as const,
    icon: (
      <Svg>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </Svg>
    ),
  },
  {
    href: '/calls',
    key: 'calls' as const,
    icon: (
      <Svg>
        <path d="M4 5c0 8.284 6.716 15 15 15h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.76-.97l-4.13-1.03a1 1 0 0 0-1.05.36l-1.13 1.5a12.05 12.05 0 0 1-5.5-5.5l1.5-1.13a1 1 0 0 0 .36-1.05L9.25 3.76A1 1 0 0 0 8.28 3H5a1 1 0 0 0-1 1Z" />
      </Svg>
    ),
  },
  {
    href: '/roommates',
    key: 'roommates' as const,
    icon: (
      <Svg>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19a6 6 0 0 1 12 0" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M16 14.2a4.6 4.6 0 0 1 5 4.3" />
      </Svg>
    ),
  },
  {
    href: '/household',
    key: 'household' as const,
    icon: (
      <Svg>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-9" />
      </Svg>
    ),
  },
  {
    href: '/lease',
    key: 'lease' as const,
    icon: (
      <Svg>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </Svg>
    ),
  },
  {
    href: '/laundry',
    key: 'laundry' as const,
    icon: (
      <Svg>
        <rect x="4" y="3.5" width="16" height="17" rx="3" />
        <circle cx="12" cy="13" r="5" />
        <circle cx="12" cy="13" r="1.6" />
        <path d="M8 6.5h1M11.5 6.5h1" />
      </Svg>
    ),
  },
  {
    href: '/sauna',
    key: 'sauna' as const,
    icon: (
      <Svg>
        <path d="M8 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <path d="M12 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <path d="M16 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <rect x="3.5" y="13" width="17" height="8" rx="1.5" />
      </Svg>
    ),
  },
  {
    href: '/parking',
    key: 'parking' as const,
    icon: (
      <Svg>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        <path d="M9.5 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
      </Svg>
    ),
  },
];

const GEAR = (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
);

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
            <Svg>
              <path d="m15 18-6-6 6-6" />
            </Svg>
            <span className={styles.railLabel}>{back}</span>
          </Link>
          <Link
            href="/settings?category=general"
            title={settings.generalCategory}
            className={`${styles.railLink} ${category === 'general' ? styles.railLinkActive : ''}`}
          >
            <Svg>
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5 19.5a7 7 0 0 1 14 0" />
            </Svg>
            <span className={styles.railLabel}>{settings.generalCategory}</span>
          </Link>
          <Link
            href="/settings?category=language"
            title={settings.languageCategory}
            className={`${styles.railLink} ${category === 'language' ? styles.railLinkActive : ''}`}
          >
            <Svg>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M3.5 12h17" />
              <path d="M12 3.5a13 13 0 0 1 3.5 8.5A13 13 0 0 1 12 20.5 13 13 0 0 1 8.5 12 13 13 0 0 1 12 3.5Z" />
            </Svg>
            <span className={styles.railLabel}>{settings.languageCategory}</span>
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
              <span className={styles.railLabel}>{nav[item.key]}</span>
            </Link>
          );
        })}
      </div>
      <div className={styles.railBottom}>
        <Link href="/settings" title={nav.settings} className={styles.railLink}>
          {GEAR}
          <span className={styles.railLabel}>{nav.settings}</span>
        </Link>
      </div>
    </nav>
  );
}
