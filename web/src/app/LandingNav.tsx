'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './LandingNav.module.css';

export type MenuLink = { label: string; href: string };
export type MenuItem = { title: string; desc: string; href: string; icon: string };
export type MenuColumn = { heading: string; items: MenuItem[] };
export type Menu = {
  id: string;
  label: string;
  columns: MenuColumn[];
  explore: { heading: string; links: MenuLink[] };
  footer: MenuLink;
};

type Labels = {
  search: string;
  searchPlaceholder: string;
  searchEmpty: string;
  logIn: string;
  signUp: string;
};

const ICONS: Record<string, string[]> = {
  chat: ['M20 12a7 7 0 0 1-7 7H8l-4 3 1-4.5A7 7 0 1 1 20 12Z'],
  mail: ['M3 5h18v14H3z', 'm4 7 8 6 8-6'],
  feed: ['M3.5 4.5h17v15h-17z', 'M7.5 9h9M7.5 12.5h9M7.5 16h5.5'],
  laundry: ['M4 3.5h16v17H4z', 'M17 13a5 5 0 1 1-10 0 5 5 0 0 1 10 0z', 'M8 6.5h1M11.5 6.5h1'],
  sauna: [
    'M8 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4',
    'M12 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4',
    'M16 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4',
    'M3.5 13h17v8h-17z',
  ],
  parking: ['M3.5 3.5h17v17h-17z', 'M9.5 16V8h3a2.5 2.5 0 0 1 0 5h-3'],
  alert: [
    'M12 9v4',
    'M12 16.5h.01',
    'M10.3 4.4 2.9 17.5a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.7 4.4a1.6 1.6 0 0 0-2.8 0Z',
  ],
  flag: ['M5 21V4', 'M5 4h11l-2 4 2 4H5'],
  bookmark: ['M7 3.5h10a1 1 0 0 1 1 1V21l-6-3.5L6 21V4.5a1 1 0 0 1 1-1Z'],
  check: ['M4 4h16v16H4z', 'M9 11.5 11 13.5 15.5 9'],
  help: ['M4 13v-1a8 8 0 0 1 16 0v1', 'M2.5 13h5v6h-5z', 'M16.5 13h5v6h-5z', 'M20 19v1a3 3 0 0 1-3 3h-3'],
  book: ['M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z', 'M4 5v16'],
  doc: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 13h6M9 17h6'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(ICONS[name] ?? ICONS['doc']!).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function NavLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}

export default function LandingNav({
  menus,
  plainLinks,
  labels,
  actions,
}: {
  menus: Menu[];
  plainLinks: MenuLink[];
  labels: Labels;
  actions: ReactNode;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const closeTimer = useRef<number | undefined>(undefined);

  const activeMenu = menus.find((m) => m.id === openId) ?? null;

  const index = useMemo(() => {
    const seen = new Set<string>();
    const entries: { title: string; desc: string; href: string; icon: string }[] = [];
    function add(entry: { title: string; desc: string; href: string; icon: string }) {
      const key = `${entry.title}|${entry.href}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push(entry);
    }
    for (const menu of menus) {
      for (const column of menu.columns) for (const item of column.items) add(item);
      for (const link of menu.explore.links) add({ title: link.label, desc: menu.label, href: link.href, icon: 'doc' });
    }
    for (const link of plainLinks) add({ title: link.label, desc: '', href: link.href, icon: 'help' });
    return entries;
  }, [menus, plainLinks]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 8);
    return index.filter((entry) => `${entry.title} ${entry.desc}`.toLowerCase().includes(q));
  }, [index, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenId(null);
        setSearchOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function openMenu(id: string) {
    window.clearTimeout(closeTimer.current);
    setOpenId(id);
  }
  function scheduleClose() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenId(null), 140);
  }
  function closeAll() {
    setOpenId(null);
    setSearchOpen(false);
    setQuery('');
    setActiveIndex(0);
  }
  function go(href: string) {
    closeAll();
    if (href.startsWith('/')) router.push(href);
    else if (href.startsWith('http')) window.open(href, '_blank', 'noopener,noreferrer');
    else window.location.hash = href;
  }

  return (
    <nav className={styles.nav} onMouseLeave={scheduleClose}>
      <div className={`${styles.wrap} ${styles.row}`}>
        <Link href="/" className={styles.logo} aria-label="Kuopas">
          <Image src="/Kuopas-logo.png" alt="Kuopas" width={140} height={58} className={styles.logoImg} priority />
        </Link>

        <ul className={styles.links}>
          {menus.map((menu) => (
            <li key={menu.id}>
              <button
                type="button"
                className={`${styles.trigger} ${openId === menu.id ? styles.triggerOpen : ''}`}
                aria-haspopup="true"
                aria-expanded={openId === menu.id}
                onMouseEnter={() => openMenu(menu.id)}
                onClick={() => (openId === menu.id ? setOpenId(null) : openMenu(menu.id))}
              >
                {menu.label}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </li>
          ))}
          {plainLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={styles.plain} onMouseEnter={() => setOpenId(null)}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.actions} onMouseEnter={() => setOpenId(null)}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={labels.search}
            title={labels.search}
            onClick={() => {
              setOpenId(null);
              setSearchOpen(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          {actions}
          <Link href="/login" className={styles.btn}>
            {labels.logIn}
          </Link>
          <Link href="/register" className={`${styles.btn} ${styles.btnSolid}`}>
            {labels.signUp}
          </Link>
        </div>
      </div>

      {activeMenu && (
        <div className={styles.panelWrap}>
          <div className={styles.panel} role="menu">
            <div
              className={styles.panelGrid}
              style={{ gridTemplateColumns: `repeat(${activeMenu.columns.length}, minmax(0, 1fr)) 220px` }}
            >
              {activeMenu.columns.map((column) => (
                <div key={column.heading} className={styles.col}>
                  <div className={styles.colHeading}>{column.heading}</div>
                  {column.items.map((item) => (
                    <NavLink key={item.title} href={item.href} className={styles.item} onClick={closeAll}>
                      <span className={styles.itemTitle}>
                        <Icon name={item.icon} />
                        {item.title}
                      </span>
                      <span className={styles.itemDesc}>{item.desc}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
              <div className={`${styles.col} ${styles.explore}`}>
                <div className={styles.colHeading}>{activeMenu.explore.heading}</div>
                {activeMenu.explore.links.map((link) => (
                  <NavLink key={link.href} href={link.href} className={styles.exploreLink} onClick={closeAll}>
                    {link.label}
                    {link.href.startsWith('http') && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
                      </svg>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
            <NavLink href={activeMenu.footer.href} className={styles.panelFooter} onClick={closeAll}>
              {activeMenu.footer.label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </NavLink>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className={styles.backdrop} onMouseDown={closeAll}>
          <div className={styles.searchCard} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label={labels.search}>
            <div className={styles.searchRow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                autoFocus
                type="text"
                value={query}
                placeholder={labels.searchPlaceholder}
                className={styles.searchInput}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  } else if (event.key === 'Enter') {
                    const target = results[activeIndex];
                    if (target) go(target.href);
                  }
                }}
              />
            </div>
            <div className={styles.results}>
              {results.length === 0 && <div className={styles.empty}>{labels.searchEmpty}</div>}
              {results.map((entry, i) => (
                <button
                  key={`${entry.title}|${entry.href}`}
                  type="button"
                  className={`${styles.result} ${i === activeIndex ? styles.resultActive : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(entry.href)}
                >
                  <Icon name={entry.icon} />
                  <span className={styles.resultText}>
                    <span className={styles.resultTitle}>{entry.title}</span>
                    {entry.desc && <span className={styles.resultDesc}>{entry.desc}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
