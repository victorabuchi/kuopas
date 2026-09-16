'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Item = { path: string; label: string };

const MENU_WIDTH = 200;
const MARGIN = 8;

// Admin-only dropdown that jumps between the resident app and the staff
// portal, matching the "PagesMenu" pattern: a small button that opens a
// positioned menu, current page highlighted and disabled.
export default function RoleSwitcher({ items, label }: { items: Item[]; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggleOpen() {
    setOpen((o) => {
      const next = !o;
      if (next && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const idealLeft = r.right - MENU_WIDTH;
        const maxLeft = window.innerWidth - MENU_WIDTH - MARGIN;
        const left = Math.min(Math.max(idealLeft, MARGIN), Math.max(maxLeft, MARGIN));
        setMenuPos({ top: r.bottom + 6, left });
      }
      return next;
    });
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: open ? '#f0f7f0' : '#fff',
          border: '1px solid #046a38',
          borderRadius: '6px',
          fontSize: '13px',
          cursor: 'pointer',
          color: '#046a38',
          fontWeight: 600,
          fontFamily: 'inherit',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#046a38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        <span>{label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#046a38"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && menuPos && (
        <div
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            width: `${MENU_WIDTH}px`,
            maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
            overflow: 'hidden',
            zIndex: 200,
          }}
        >
          {items.map((item) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <button
                key={item.path}
                role="menuitem"
                disabled={active}
                onClick={() => {
                  setOpen(false);
                  router.push(item.path);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  fontWeight: active ? 700 : 500,
                  background: active ? '#f0f7f0' : '#fff',
                  color: active ? '#046a38' : '#333',
                  border: 'none',
                  borderBottom: '1px solid #f2f2f2',
                  cursor: active ? 'default' : 'pointer',
                }}
              >
                {item.label}
                {active && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#046a38', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
