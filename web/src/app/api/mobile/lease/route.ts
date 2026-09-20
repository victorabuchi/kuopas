import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { isVerified } from '../../../../lib/verification';

// Mirrors the four tabs of LeasePage in src/app/(app)/lease/page.tsx
// (lease, guarantor, verify and room) in one response.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });

  const leases = await db.orm.public.Lease.where({ tenantId: tenant.id })
    .include('charges', (c) => c.orderBy((x) => x.periodStart.asc()))
    .include('unit', (u) => u)
    .orderBy((l) => l.startDate.desc())
    .all();

  const guarantorRequests = await db.orm.public.GuarantorRequest.where({ tenantId: tenant.id })
    .include('institution', (i) => i)
    .orderBy((r) => r.createdAt.desc())
    .all();
  const institutions = await db.orm.public.GuarantorInstitution.where({ active: true }).all();

  const records = await db.orm.public.IdentityVerification.where({ tenantId: tenant.id })
    .orderBy((r) => r.createdAt.desc())
    .all();
  const approved = records.find((r) => r.status === 'approved');

  const media = await db.orm.public.UnitMedia.where({ unitId: tenant.unitId }).orderBy((m) => m.createdAt.asc()).all();
  const roommates = (await db.orm.public.Tenant.where({ unitId: tenant.unitId }).all()).filter((r) => r.id !== tenant.id);
  const verifiedIds = new Set(
    (await db.orm.public.IdentityVerification.where({ status: 'approved' }).all()).map((r) => r.tenantId),
  );
  const profiles = await db.orm.public.MatchProfile.all();
  const bio = new Map(profiles.map((p) => [p.tenantId, p.bio]));

  return Response.json({
    leases: leases.map((l) => ({
      id: l.id,
      kind: l.kind,
      status: l.status,
      startDate: l.startDate,
      endDate: l.endDate,
      unitCode: l.unit?.code ?? '',
      monthlyRentCents: l.monthlyRentCents,
      depositCents: l.depositCents,
      upfrontMonths: l.upfrontMonths,
      charges: l.charges.map((c) => ({
        id: c.id,
        periodStart: c.periodStart,
        periodEnd: c.periodEnd,
        amountCents: c.amountCents,
        prorated: c.prorated,
        dueDate: c.dueDate,
        paidAt: c.paidAt,
      })),
    })),
    guarantor: {
      requests: guarantorRequests.map((r) => ({ id: r.id, status: r.status, staffNote: r.staffNote })),
      institutions: institutions.map((i) => ({ id: i.id, name: i.name, description: i.description })),
    },
    verification: {
      verified: await isVerified(tenant.id),
      approvedMethod: approved?.method ?? null,
      approvedInstitution: approved?.institution ?? null,
      records: records.map((r) => ({ id: r.id, method: r.method, status: r.status, createdAt: r.createdAt })),
    },
    room: {
      media: media.map((m) => ({ id: m.id, url: m.url, kind: m.kind, caption: m.caption })),
      roommates: roommates.map((r) => ({ id: r.id, name: r.name, bio: bio.get(r.id) ?? null, verified: verifiedIds.has(r.id) })),
    },
  });
}
