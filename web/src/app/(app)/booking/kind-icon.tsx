import type { AmenityKind } from '../../../lib/booking';

const PATHS: Record<AmenityKind, React.ReactNode> = {
  laundry: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="3" />
      <circle cx="12" cy="13" r="5" />
      <circle cx="12" cy="13" r="1.6" />
      <path d="M8 6.5h1M11.5 6.5h1" />
    </>
  ),
  sauna: (
    <>
      <path d="M8 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
      <path d="M12 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
      <path d="M16 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
      <rect x="3.5" y="13" width="17" height="8" rx="1.5" />
    </>
  ),
  parking: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M9.5 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
    </>
  ),
  common_room: (
    <>
      <path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
      <path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z" />
      <path d="M6 18v2M18 18v2" />
    </>
  ),
  gym: (
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </>
  ),
  study_room: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </>
  ),
  grill: (
    <>
      <path d="M12 3c1.5 2 3 3.4 3 5.5a3 3 0 0 1-6 0c0-.9.4-1.6 1-2.2.3 1 .8 1.2 1.2 1.2C11.6 6.4 11 4.8 12 3Z" />
      <path d="M5 14h14l-1.2 3.2A4 4 0 0 1 14 20h-4a4 4 0 0 1-3.8-2.8z" />
      <path d="M9 20l-1 2M15 20l1 2" />
    </>
  ),
};

export default function KindIcon({ kind, size = 22 }: { kind: AmenityKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[kind]}
    </svg>
  );
}
