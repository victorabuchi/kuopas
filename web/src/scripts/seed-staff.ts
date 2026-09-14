import { hash } from 'bcryptjs';
import { db } from '../prisma/db';

const BCRYPT_ROUNDS = 12;

const email = 'staff@kuopas.fi';
const existing = await db.orm.public.Staff.where({ email }).first();
if (existing) {
  console.log('Staff account already exists:', email);
} else {
  const passwordHash = await hash('kuopas-staff-demo', BCRYPT_ROUNDS);
  await db.orm.public.Staff.create({ name: 'Kuopas Staff', email, passwordHash });
  console.log('Created staff account:', email, '/ password: kuopas-staff-demo');
}

await db.close();
