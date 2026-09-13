import { db } from '../prisma/db';

const building = await db.orm.public.Building.where({ name: 'Sarkiniementie 30' }).first();
if (!building) {
  console.log('Seed the building first (npm run seed).');
  await db.close();
  process.exit(1);
}

const existingSauna = await db.orm.public.SaunaSlot.where({ buildingId: building.id, label: 'Sauna' }).first();
if (!existingSauna) {
  await db.orm.public.SaunaSlot.create({ buildingId: building.id, label: 'Sauna' });
}

for (const label of ['P1', 'P2', 'P3', 'P4', 'P5']) {
  const existing = await db.orm.public.ParkingSpot.where({ buildingId: building.id, label }).first();
  if (existing) continue;
  await db.orm.public.ParkingSpot.create({ buildingId: building.id, label });
}

console.log('Seeded 1 sauna and 5 parking spots for Sarkiniementie 30 (skipping any already present).');
await db.close();
