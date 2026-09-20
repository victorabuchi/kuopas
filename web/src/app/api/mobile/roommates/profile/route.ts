import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { DIMENSIONS, parseDealbreakers } from '../../../../../lib/matching';
import { isVerified } from '../../../../../lib/verification';

// Mirrors saveMatchProfileAction in src/lib/matching-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const tenantId = session.tenantId;
  if (!(await isVerified(tenantId))) return new Response('Verify your identity first', { status: 403 });

  const body = await request.json().catch(() => null);
  const values: Record<string, string> = {};
  for (const dim of DIMENSIONS) {
    const value = String(body?.answers?.[dim.key] ?? '');
    if (!(dim.options as readonly string[]).includes(value)) {
      return new Response(`Answer every question (${dim.key})`, { status: 400 });
    }
    values[dim.key] = value;
  }
  const dealbreakers = parseDealbreakers(
    (Array.isArray(body?.dealbreakers) ? body.dealbreakers : []).map(String).join(','),
  ).join(',');

  const data = {
    active: body?.active !== false,
    sleepSchedule: values['sleepSchedule']!,
    cleanliness: Number(values['cleanliness']),
    noiseTolerance: Number(values['noiseTolerance']),
    studyHabit: values['studyHabit']!,
    guestPolicy: values['guestPolicy']!,
    smoking: values['smoking']!,
    alcohol: values['alcohol']!,
    cooking: values['cooking']!,
    bio: String(body?.bio ?? '').trim().slice(0, 300),
    dealbreakers,
    updatedAt: new Date().toISOString(),
  };

  const existing = await db.orm.public.MatchProfile.where({ tenantId }).first();
  if (existing) await db.orm.public.MatchProfile.where({ tenantId }).update(data);
  else await db.orm.public.MatchProfile.create({ tenantId, ...data });

  return new Response(null, { status: 204 });
}
