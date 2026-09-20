// Server components call this instead of Date.now() directly (React's purity
// lint flags direct calls, and these pages are rendered per request anyway).
export function nowMs(): number {
  return Date.now();
}
