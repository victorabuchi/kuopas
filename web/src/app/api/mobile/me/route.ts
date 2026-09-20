import { getMobileSession } from '../../../../lib/mobile-auth';
import { getTenantWithBuilding } from '../../../../lib/mobile-http';
import { serializeTenant } from '../../../../lib/mobile-serializers';

// Mirrors the tenant/unit/stairwell/building lookup in src/app/(app)/settings/page.tsx,
// plus hasSeenMoveInGuide from the home page's welcome overlay check.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const found = await getTenantWithBuilding(session.tenantId);
  if (!found) return new Response('Tenant not found', { status: 404 });
  const { tenant, unit, stairwell, building } = found;

  return Response.json({
    ...serializeTenant(tenant),
    hasSeenMoveInGuide: tenant.hasSeenMoveInGuide,
    building: { id: building.id, name: building.name },
    stairwell: { id: stairwell.id, label: stairwell.label },
    unit: { id: unit.id, code: unit.code, floor: unit.floor },
  });
}
