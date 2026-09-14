import { randomInt } from 'crypto';
import { db } from '../prisma/db';

const ADJECTIVES = [
  'Sunny', 'Quiet', 'Swift', 'Bright', 'Cozy', 'Calm', 'Bold', 'Merry',
  'Frosty', 'Golden', 'Silver', 'Misty', 'Lucky', 'Gentle', 'Cheerful', 'Windy',
];

const NOUNS = [
  'Otter', 'Lynx', 'Sparrow', 'Fox', 'Hare', 'Heron', 'Reindeer', 'Owl',
  'Squirrel', 'Elk', 'Swan', 'Beaver', 'Falcon', 'Badger', 'Crane', 'Wolf',
];

type DbOrTx = Pick<typeof db, 'orm'>;

export async function generatePseudonym(tx: DbOrTx = db): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
    const noun = NOUNS[randomInt(NOUNS.length)];
    const suffix = randomInt(100);
    const candidate = `${adjective} ${noun} #${suffix}`;
    const existing = await tx.orm.public.Tenant.where({ pseudonym: candidate }).first();
    if (!existing) return candidate;
  }
  throw new Error('Could not generate a unique pseudonym after 30 attempts');
}

// Real/chosen name inside the apartment chat, pseudonym everywhere else
// (building, stairwell, floor scoped chats and the building feed).
export function displayNameFor(
  tenant: { name: string; pseudonym: string | null },
  scope: 'unit' | 'building' | 'stairwell' | 'floor',
): string {
  if (scope === 'unit') return tenant.name;
  return tenant.pseudonym ?? tenant.name;
}
