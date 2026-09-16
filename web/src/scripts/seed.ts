import { db } from '../prisma/db';
import { createUnit } from '../lib/units';

const existing = await db.orm.public.Building.where({ name: 'Sarkiniementie 30' }).first();
if (existing) {
  console.log('Already seeded, skipping.');
  await db.close();
  process.exit(0);
}

const building = await db.orm.public.Building.create({
  name: 'Sarkiniementie 30',
  address: 'Sarkiniementie 30, Kuopio',
});

const stairwellA = await db.orm.public.Stairwell.create({ buildingId: building.id, label: 'A' });
const stairwellB = await db.orm.public.Stairwell.create({ buildingId: building.id, label: 'B' });

for (const code of ['100', '101', '102']) {
  await createUnit({ stairwellId: stairwellA.id, code });
}
for (const code of ['300', '315']) {
  await createUnit({ stairwellId: stairwellB.id, code });
}

console.log('Seeded Sarkiniementie 30 with stairwells A (100-102) and B (300, 315).');
await db.close();
