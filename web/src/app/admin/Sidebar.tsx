'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';

type Labels = { roles: string; domains: string; wellbeing: string; settings: string };

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export default function Sidebar({ labels }: { labels: Labels }) {
  const pathname = usePathname();
  const items = [
    {
      href: '/admin',
      label: labels.roles,
      exact: true,
      icon: (
        <Svg>
          <circle cx="9" cy="8" r="3" />
          <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
          <path d="M16 8.5a3 3 0 1 1 3.5 2.96" />
          <path d="M16.5 13.2c2.6.4 4.5 2.4 4.9 5.3" />
        </Svg>
      ),
    },
    {
      href: '/admin/verification',
      label: labels.domains,
      exact: false,
      icon: (
        <Svg>
          <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </Svg>
      ),
    },
    {
      href: '/admin/wellbeing',
      label: labels.wellbeing,
      exact: false,
      icon: (
        <Svg>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </Svg>
      ),
    },
    {
      href: '/admin/settings',
      label: labels.settings,
      exact: false,
      icon: (
        <Svg>
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </Svg>
      ),
    },
  ];

  return (
    <nav className={styles.rail}>
      <div className={styles.railTop}>
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} title={item.label} className={`${styles.railLink} ${active ? styles.railLinkActive : ''}`}>
              {item.icon}
              <span className={styles.railLabel}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
