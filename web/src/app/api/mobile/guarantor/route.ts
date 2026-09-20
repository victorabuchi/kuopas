import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

// Mirrors requestGuarantorAction in src/lib/guarantor-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const institutionId = String(body?.institutionId ?? '').trim();

  const open = await db.orm.public.GuarantorRequest.where({ tenantId: session.tenantId, status: 'pending' }).first();
  if (open) return new Response(null, { status: 204 });

  if (institutionId) {
    const institution = await db.orm.public.GuarantorInstitution.where({ id: institutionId }).first();
    if (!institution || !institution.active) return new Response('Institution not available', { status: 400 });
    await db.orm.public.GuarantorRequest.create({ tenantId: session.tenantId, kind: 'institution', institutionId });
  } else {
    const guarantorName = String(body?.guarantorName ?? '').trim();
    const guarantorEmail = String(body?.guarantorEmail ?? '').trim();
    const guarantorPhone = String(body?.guarantorPhone ?? '').trim();
    if (!guarantorName || (!guarantorEmail && !guarantorPhone)) {
      return new Response('A guarantor name and an email or phone are required', { status: 400 });
    }
    await db.orm.public.GuarantorRequest.create({
      tenantId: session.tenantId,
      kind: 'personal',
      guarantorName,
      guarantorEmail: guarantorEmail || null,
      guarantorPhone: guarantorPhone || null,
    });
  }

  return new Response(null, { status: 204 });
}
