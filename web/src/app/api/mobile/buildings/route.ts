import { db } from '../../../../prisma/db';
import { serializeBuilding } from '../../../../lib/mobile-serializers';

// Public (matches the same unauthenticated building/unit query the web
// register page runs). Mirrors the query in src/app/register/page.tsx.
export async function GET() {
  const buildings = await db.orm.public.Building.include('stairwells', (stairwells) =>
    stairwells.include('units', (units) => units.orderBy((u) => u.code.asc())),
  ).all();

  return Response.json(buildings.map(serializeBuilding));
}
