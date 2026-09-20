import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { DIMENSIONS, compare, parseDealbreakers, type Answers } from '../../../../lib/matching';
import { isVerified } from '../../../../lib/verification';

function answersOf(p: {
  sleepSchedule: string;
  cleanliness: number;
  noiseTolerance: number;
  studyHabit: string;
  guestPolicy: string;
  smoking: string;
  alcohol: string;
  cooking: string;
}): Answers {
  return { ...p };
}

const firstName = (name: string | undefined | null) => (name ?? '').split(' ')[0] ?? '';

// Mirrors RoommatesPage in src/app/(app)/roommates/page.tsx. Compatibility is
// scored here with the web app's own matching code so both apps agree.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const tenantId = session.tenantId;

  const verified = await isVerified(tenantId);
  const mine = await db.orm.public.MatchProfile.where({ tenantId }).first();

  const profile = mine
    ? {
        answers: Object.fromEntries(DIMENSIONS.map((d) => [d.key, String((mine as unknown as Record<string, string | number>)[d.key])])),
        dealbreakers: parseDealbreakers(mine.dealbreakers),
        bio: mine.bio ?? '',
        active: mine.active,
      }
    : null;

  if (!verified) return Response.json({ verified, profile, matches: [], connections: { incoming: [], outgoing: [], connected: [] } });

  const connections = await db.orm.public.MatchConnection.include('from', (x) => x).include('to', (x) => x).all();

  let matches: {
    tenantId: string;
    firstName: string;
    institution: string | null;
    bio: string;
    score: number;
    best: string[];
    differences: string[];
    status: 'accepted' | 'requested' | 'incoming' | null;
  }[] = [];

  if (mine) {
    const others = await db.orm.public.MatchProfile.where({ active: true }).include('tenant', (x) => x).all();
    const verifications = await db.orm.public.IdentityVerification.where({ status: 'approved' }).all();
    const institutionOf = new Map(verifications.map((v) => [v.tenantId, v.institution]));
    const myAnswers = answersOf(mine);
    const myBreakers = parseDealbreakers(mine.dealbreakers);

    matches = others
      .filter((o) => o.tenantId !== tenantId && institutionOf.has(o.tenantId))
      .map((o) => ({ o, r: compare(myAnswers, myBreakers, answersOf(o), parseDealbreakers(o.dealbreakers)) }))
      .filter(({ r }) => !r.blocked)
      .sort((a, b) => b.r.score - a.r.score)
      .map(({ o, r }) => {
        const c = connections.find(
          (x) => (x.fromId === tenantId && x.toId === o.tenantId) || (x.fromId === o.tenantId && x.toId === tenantId),
        );
        const status = !c ? null : c.status === 'accepted' ? 'accepted' : c.fromId === tenantId ? 'requested' : 'incoming';
        return {
          tenantId: o.tenantId,
          firstName: firstName(o.tenant?.name),
          institution: institutionOf.get(o.tenantId) ?? null,
          bio: o.bio ?? '',
          score: r.score,
          best: r.best as string[],
          differences: r.differences as string[],
          status,
        };
      });
  }

  const mineOnly = connections.filter((c) => c.fromId === tenantId || c.toId === tenantId);
  return Response.json({
    verified,
    profile,
    matches,
    connections: {
      incoming: mineOnly.filter((c) => c.toId === tenantId && c.status === 'pending').map((c) => ({ id: c.id, name: firstName(c.from?.name) })),
      outgoing: mineOnly.filter((c) => c.fromId === tenantId && c.status === 'pending').map((c) => ({ id: c.id, name: firstName(c.to?.name) })),
      connected: mineOnly
        .filter((c) => c.status === 'accepted')
        .map((c) => {
          const other = c.fromId === tenantId ? c.to : c.from;
          return { id: c.id, tenantId: other?.id ?? '', name: firstName(other?.name) };
        }),
    },
  });
}
