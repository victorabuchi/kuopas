// The full set of Kuopas properties across Kuopio, sourced from kuopas.fi.
// Sarkiniementie 30 is seeded separately by seed.ts; skip it here.
import { db } from '../prisma/db';
import { createUnit } from '../lib/units';

const BUILDINGS: { name: string; address: string }[] = [
  // City Centre (Keskusta)
  { name: 'Hallikatu 13', address: 'Hallikatu 13, Kuopio' },
  { name: 'Satamakatu 24', address: 'Satamakatu 24, Kuopio' },
  { name: 'Satamakatu 26', address: 'Satamakatu 26, Kuopio' },
  { name: 'Suokatu 14', address: 'Suokatu 14, Kuopio' },
  { name: 'Torikatu 15-17', address: 'Torikatu 15-17, Kuopio' },
  // Haapaniemi
  { name: 'Haapaniementie 11', address: 'Haapaniementie 11, Kuopio' },
  { name: 'Haapaniementie 24', address: 'Haapaniementie 24, Kuopio' },
  { name: 'Hermannin aukio 1', address: 'Hermannin aukio 1, Kuopio' },
  { name: 'Lehtoniemenkatu 7', address: 'Lehtoniemenkatu 7, Kuopio' },
  // Puijonlaakso
  { name: 'Ahkiotie 8', address: 'Ahkiotie 8, Kuopio' },
  { name: 'Kuntokuja 2', address: 'Kuntokuja 2, Kuopio (Pankkola)' },
  { name: 'Samoilijantie 6', address: 'Samoilijantie 6, Kuopio' },
  { name: 'Taivaanpankontie 15', address: 'Taivaanpankontie 15, Kuopio' },
  // Neulamäki
  { name: 'Metsurintie 4', address: 'Metsurintie 4, Kuopio' },
  { name: 'Neulamäentie 3', address: 'Neulamäentie 3, Kuopio' },
  { name: 'Petkelkuja 1', address: 'Petkelkuja 1, Kuopio' },
  { name: 'Petkelkuja 3', address: 'Petkelkuja 3, Kuopio' },
  { name: 'Rosokuja 3', address: 'Rosokuja 3, Kuopio' },
  // Savilahti (Campus Area)
  { name: 'Yliopistonranta 13', address: 'Yliopistonranta 13, Kuopio' },
  { name: 'Yliopistonranta 17', address: 'Yliopistonranta 17, Kuopio' },
  { name: 'Kampus Ankkuri', address: 'Yliopistonranta, Kuopio' },
  { name: 'Kampus Masto', address: 'Yliopistonranta, Kuopio' },
  // Niirala
  { name: 'Niiralankatu 23', address: 'Niiralankatu 23, Kuopio' },
  { name: 'Pyöräkatu 7', address: 'Pyöräkatu 7, Kuopio' },
  { name: 'Pyöräkatu 9', address: 'Pyöräkatu 9, Kuopio' },
  { name: 'Pyöräkatu 11', address: 'Pyöräkatu 11, Kuopio' },
  // Särkiniemi & Särkilahti (Sarkiniementie 30 seeded separately)
  { name: 'Rimpitie 1', address: 'Rimpitie 1, Kuopio' },
  { name: 'Särkiniementie 18', address: 'Särkiniementie 18, Kuopio' },
  { name: 'Hauenkoukku 8', address: 'Hauenkoukku 8, Kuopio (Särkilahti)' },
  // Rauhalahti
  { name: 'Katiskaniementie 6', address: 'Katiskaniementie 6, Kuopio (Katiska, furnished exchange housing)' },
  // Levänen
  { name: 'Myllärintie 32', address: 'Myllärintie 32, Kuopio' },
  { name: 'Myllärintie 57', address: 'Myllärintie 57, Kuopio' },
];

let created = 0;
let skipped = 0;

for (const def of BUILDINGS) {
  const existing = await db.orm.public.Building.where({ name: def.name }).first();
  if (existing) {
    skipped++;
    continue;
  }

  const building = await db.orm.public.Building.create({ name: def.name, address: def.address });
  const stairwell = await db.orm.public.Stairwell.create({ buildingId: building.id, label: 'A' });
  await createUnit({ stairwellId: stairwell.id, code: '101' });
  await createUnit({ stairwellId: stairwell.id, code: '102' });
  created++;
}

console.log(`Seeded ${created} buildings, skipped ${skipped} already present.`);
await db.close();
