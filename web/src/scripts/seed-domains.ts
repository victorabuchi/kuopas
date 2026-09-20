import { db } from '../prisma/db';

// Kuopio's two higher education institutions. A domain also covers its
// subdomains, so uef.fi matches student.uef.fi. Edit the list in the admin area.
const domains = [
  { domain: 'uef.fi', institution: 'University of Eastern Finland' },
  { domain: 'savonia.fi', institution: 'Savonia University of Applied Sciences' },
];

let created = 0;
for (const d of domains) {
  const existing = await db.orm.public.VerifiedDomain.where({ domain: d.domain }).first();
  if (existing) continue;
  await db.orm.public.VerifiedDomain.create(d);
  created++;
}
console.log(`Seeded ${created} verified domains.`);
await db.close();
