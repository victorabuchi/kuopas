import { db } from '../prisma/db';

// Unit codes encode their floor in the hundreds digit: 100-120 -> floor 1,
// 200-220 -> floor 2, etc.
export function floorFromUnitCode(code: string): number {
  const numeric = Number.parseInt(code, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`Unit code "${code}" is not a valid floor-encoding number`);
  }
  return Math.floor(numeric / 100);
}

export async function createUnit(input: { stairwellId: string; code: string }) {
  return db.orm.public.Unit.create({
    stairwellId: input.stairwellId,
    code: input.code,
    floor: floorFromUnitCode(input.code),
  });
}
