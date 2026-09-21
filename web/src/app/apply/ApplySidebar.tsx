'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../(app)/app-shell.module.css';
import { logoutAction } from '../../lib/auth-actions';

type Labels = { overview: string; verify: string; profile: string; pods: string; homes: string; exchange: string; signOut: string };

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ITEMS: { href: string; key: keyof Labels; icon: React.ReactNode }[] = [
  {
    href: '/apply',
    key: 'overview',
    icon: (
      <Svg>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
      </Svg>
    ),
  },
  {
    href: '/apply/verify',
    key: 'verify',
    icon: (
      <Svg>
        <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </Svg>
    ),
  },
  {
    href: '/apply/roommates',
    key: 'profile',
    icon: (
      <Svg>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 19.5a7 7 0 0 1 14 0" />
      </Svg>
    ),
  },
  {
    href: '/apply/pods',
    key: 'pods',
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
    href: '/apply/homes',
    key: 'homes',
    icon: (
      <Svg>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-9" />
      </Svg>
    ),
  },
  {
    href: '/apply/exchange',
    key: 'exchange',
    icon: (
      <Svg>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" />
        <path d="M12 3.5a13 13 0 0 1 3.5 8.5A13 13 0 0 1 12 20.5 13 13 0 0 1 8.5 12 13 13 0 0 1 12 3.5Z" />
      </Svg>
    ),
  },
];

export default function ApplySidebar({ labels }: { labels: Labels }) {
  const pathname = usePathname();
  return (
    <nav className={styles.rail}>
      <div className={styles.railTop}>
        {ITEMS.map((item) => {
          const active = item.href === '/apply' ? pathname === '/apply' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} title={labels[item.key]} className={`${styles.railLink} ${active ? styles.railLinkActive : ''}`}>
              {item.icon}
              <span className={styles.railLabel}>{labels[item.key]}</span>
            </Link>
          );
        })}
      </div>
      <div className={styles.railBottom}>
        <form action={logoutAction}>
          <button type="submit" title={labels.signOut} className={styles.railLink} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
            <Svg>
              <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
              <path d="m16 8 4 4-4 4M20 12H9" />
            </Svg>
            <span className={styles.railLabel}>{labels.signOut}</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
