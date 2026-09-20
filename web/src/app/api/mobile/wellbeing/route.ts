import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

const CATEGORIES = ['mental_health', 'financial', 'behavioral', 'safety', 'other'];
const SEVERITIES = ['concern', 'urgent'];

// Mirrors the case list in src/app/(app)/wellbeing/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const cases = await db.orm.public.WellbeingCase.where({ tenantId: session.tenantId })
    .orderBy((c) => c.createdAt.desc())
    .all();

  return Response.json(
    cases.map((c) => ({
      id: c.id,
      category: c.category,
      status: c.status,
      createdAt: c.createdAt,
      escalatedTo: c.escalatedTo,
    })),
  );
}

// Mirrors submitWellbeingCaseAction in src/lib/wellbeing-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const category = String(body?.category ?? '');
  const severity = String(body?.severity ?? '');
  const description = String(body?.description ?? '').trim();
  if (!CATEGORIES.includes(category) || !SEVERITIES.includes(severity) || !description) {
    return new Response('Fill in every field', { status: 400 });
  }

  const created = await db.orm.public.WellbeingCase.create({
    tenantId: session.tenantId,
    category,
    severity,
    description: description.slice(0, 4000),
    consentToShare: body?.consent === true,
    origin: 'self',
  });
  await db.orm.public.WellbeingEvent.create({ caseId: created.id, actor: 'Resident', action: 'created', detail: null });

  return Response.json({ id: created.id }, { status: 201 });
}
