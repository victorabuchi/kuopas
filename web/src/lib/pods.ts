import { db } from '../prisma/db';
import { compare, parseDealbreakers, type Answers } from './matching';
import { isVerified } from './verification';

export const POD_MAX = 6;

type ProfileRow = {
  tenantId: string;
  active: boolean;
  sleepSchedule: string;
  cleanliness: number;
  noiseTolerance: number;
  studyHabit: string;
  guestPolicy: string;
  smoking: string;
  alcohol: string;
  cooking: string;
  dealbreakers: string;
  bio: string;
};

export type Fit = { score: number; blocked: boolean };

export function answersOf(p: ProfileRow): Answers {
  return {
    sleepSchedule: p.sleepSchedule,
    cleanliness: p.cleanliness,
    noiseTolerance: p.noiseTolerance,
    studyHabit: p.studyHabit,
    guestPolicy: p.guestPolicy,
    smoking: p.smoking,
    alcohol: p.alcohol,
    cooking: p.cooking,
  };
}

export function pairFit(a: ProfileRow, b: ProfileRow): Fit {
  const r = compare(answersOf(a), parseDealbreakers(a.dealbreakers), answersOf(b), parseDealbreakers(b.dealbreakers));
  return { score: r.score, blocked: r.blocked };
}

export async function loadProfiles(tenantIds: string[]): Promise<Map<string, ProfileRow>> {
  if (tenantIds.length === 0) return new Map();
  const rows = await db.orm.public.MatchProfile.where((p) => p.tenantId.in(tenantIds)).all();
  return new Map(rows.map((r) => [r.tenantId, r as ProfileRow]));
}

// How well a group fits together: mean and minimum over every pair, and
// whether any pair breaks a dealbreaker.
export function groupFit(memberIds: string[], profiles: Map<string, ProfileRow>) {
  const scores: number[] = [];
  let clash = false;
  for (let i = 0; i < memberIds.length; i += 1) {
    for (let j = i + 1; j < memberIds.length; j += 1) {
      const a = profiles.get(memberIds[i]!);
      const b = profiles.get(memberIds[j]!);
      if (!a || !b) continue;
      const fit = pairFit(a, b);
      scores.push(fit.score);
      if (fit.blocked) clash = true;
    }
  }
  if (scores.length === 0) return { average: null as number | null, lowest: null as number | null, clash };
  return {
    average: Math.round(scores.reduce((s, n) => s + n, 0) / scores.length),
    lowest: Math.min(...scores),
    clash,
  };
}

// A person is in at most one pod at a time: the one they have joined.
export async function joinedPodFor(tenantId: string) {
  const membership = await db.orm.public.PodMember.where({ tenantId, status: 'joined' }).first();
  if (!membership) return null;
  return db.orm.public.Pod.where({ id: membership.podId }).first();
}

export async function podMembers(podId: string) {
  return db.orm.public.PodMember.where({ podId }).include('tenant', (t) => t).all();
}

export async function eligibleApplicant(tenantId: string): Promise<boolean> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  return Boolean(tenant && !tenant.unitId && (await isVerified(tenantId)));
}

// Rooms still free in an apartment.
export async function freeRooms(unitId: string): Promise<number> {
  const unit = await db.orm.public.Unit.where({ id: unitId }).first();
  if (!unit) return 0;
  const residents = await db.orm.public.Tenant.where({ unitId }).all();
  return Math.max(0, unit.roomCount - residents.length);
}
