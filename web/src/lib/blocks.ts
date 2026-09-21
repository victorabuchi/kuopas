import { db } from '../prisma/db';

// People this resident has blocked.
export async function blockedByMe(tenantId: string): Promise<Set<string>> {
  const rows = await db.orm.public.UserBlock.where({ blockerId: tenantId }).all();
  return new Set(rows.map((r) => r.blockedId));
}

// True when either person has blocked the other.
export async function blockedEitherWay(a: string, b: string): Promise<boolean> {
  const rows = await db.orm.public.UserBlock.where((x) => x.blockerId.in([a, b])).all();
  return rows.some((r) => (r.blockerId === a && r.blockedId === b) || (r.blockerId === b && r.blockedId === a));
}
