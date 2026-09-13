import { db } from '../prisma/db';

const building = await db.orm.public.Building.where({ name: 'Sarkiniementie 30' }).first();
if (!building) {
  console.log('Seed the building first (npm run seed).');
  await db.close();
  process.exit(1);
}

for (const label of ['Washer 1', 'Washer 2']) {
  const existing = await db.orm.public.LaundryMachine.where({ buildingId: building.id, label }).first();
  if (existing) continue;
  await db.orm.public.LaundryMachine.create({ buildingId: building.id, label });
}

console.log('Seeded 2 laundry machines for Sarkiniementie 30 (skipping any already present).');
await db.close();
