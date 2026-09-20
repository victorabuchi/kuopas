// Roommate compatibility scoring. Every answer is on an ordered scale, so
// closeness is measured by distance along that scale.

export const DIMENSIONS = [
  { key: 'sleepSchedule', options: ['early', 'regular', 'late'], weight: 3 },
  { key: 'cleanliness', options: ['1', '2', '3', '4', '5'], weight: 3 },
  { key: 'noiseTolerance', options: ['1', '2', '3', '4', '5'], weight: 2 },
  { key: 'studyHabit', options: ['library', 'mixed', 'home'], weight: 1.5 },
  { key: 'guestPolicy', options: ['rarely', 'sometimes', 'often'], weight: 2 },
  { key: 'smoking', options: ['none', 'outside', 'any'], weight: 3 },
  { key: 'alcohol', options: ['none', 'social', 'often'], weight: 1.5 },
  { key: 'cooking', options: ['rarely', 'sometimes', 'often'], weight: 1 },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]['key'];

export type Answers = {
  sleepSchedule: string;
  cleanliness: number | string;
  noiseTolerance: number | string;
  studyHabit: string;
  guestPolicy: string;
  smoking: string;
  alcohol: string;
  cooking: string;
};

// A dealbreaker is broken when the two answers are at opposite ends.
const DEALBREAKER_BELOW = 0.3;

export function similarity(key: DimensionKey, a: string | number, b: string | number): number {
  const dim = DIMENSIONS.find((d) => d.key === key)!;
  const options = dim.options as readonly string[];
  const ia = options.indexOf(String(a));
  const ib = options.indexOf(String(b));
  if (ia < 0 || ib < 0) return 0;
  const span = options.length - 1;
  return 1 - Math.abs(ia - ib) / span;
}

export function parseDealbreakers(value: string): DimensionKey[] {
  const keys = new Set(DIMENSIONS.map((d) => d.key as string));
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is DimensionKey => keys.has(s));
}

export type MatchResult = {
  score: number;
  blocked: boolean;
  best: DimensionKey[];
  differences: DimensionKey[];
};

export function compare(
  mine: Answers,
  myDealbreakers: DimensionKey[],
  theirs: Answers,
  theirDealbreakers: DimensionKey[],
): MatchResult {
  let weighted = 0;
  let totalWeight = 0;
  let blocked = false;
  const scored: { key: DimensionKey; sim: number }[] = [];

  for (const dim of DIMENSIONS) {
    const sim = similarity(dim.key, mine[dim.key], theirs[dim.key]);
    weighted += sim * dim.weight;
    totalWeight += dim.weight;
    scored.push({ key: dim.key, sim });
    if (sim < DEALBREAKER_BELOW && (myDealbreakers.includes(dim.key) || theirDealbreakers.includes(dim.key))) {
      blocked = true;
    }
  }

  return {
    score: Math.round((weighted / totalWeight) * 100),
    blocked,
    best: scored.filter((s) => s.sim >= 0.9).map((s) => s.key),
    differences: scored.filter((s) => s.sim < 0.5).map((s) => s.key),
  };
}
