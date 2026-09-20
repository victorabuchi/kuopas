import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { splitCents } from '../../../../../lib/split';

// Mirrors createBillAction in src/lib/household-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });
  const members = await db.orm.public.Tenant.where({ unitId: tenant.unitId }).all();
  const memberIds = new Set(members.map((m) => m.id));

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? '').trim();
  const category = String(body?.category ?? 'other');
  const totalCents = Math.round(Number(String(body?.total ?? '0').replace(',', '.')) * 100);
  if (!title || !Number.isFinite(totalCents) || totalCents <= 0) {
    return new Response('A title and a positive amount are required', { status: 400 });
  }

  const participants: { id: string; weight: number }[] = (Array.isArray(body?.participants) ? body.participants : [])
    .map((p: { id?: unknown; weight?: unknown }) => ({ id: String(p?.id ?? ''), weight: Number(p?.weight) }))
    .filter((p: { id: string }) => memberIds.has(p.id));
  if (participants.length === 0) return new Response('Choose at least one person to split with', { status: 400 });

  const weights = participants.map((p) => (Number.isFinite(p.weight) && p.weight > 0 ? p.weight : 1));
  const amounts = splitCents(totalCents, weights);

  const requestedPayer = String(body?.paidById ?? '');
  const paidById = memberIds.has(requestedPayer) ? requestedPayer : tenant.id;
  const due = String(body?.dueDate ?? '').trim();

  const bill = await db.orm.public.SharedBill.create({
    unitId: tenant.unitId,
    title,
    category,
    totalCents,
    paidById,
    dueDate: due ? new Date(due).toISOString() : null,
    note: String(body?.note ?? '').trim() || null,
  });

  const now = new Date().toISOString();
  for (let i = 0; i < participants.length; i++) {
    const id = participants[i]!.id;
    await db.orm.public.BillShare.create({
      billId: bill.id,
      tenantId: id,
      amountCents: amounts[i]!,
      paidAt: id === paidById ? now : null,
    });
  }

  return Response.json({ id: bill.id }, { status: 201 });
}
