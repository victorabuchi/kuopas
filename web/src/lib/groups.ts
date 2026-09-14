import { db } from '../prisma/db';
import { floorFromUnitCode } from './units';
import { generatePseudonym } from './names';

type DbOrTx = Pick<typeof db, 'orm'>;

async function getOrCreateUnitChatGroup(
  tx: DbOrTx,
  unitId: string,
  buildingName: string,
  stairwellLabel: string,
  unitCode: string,
) {
  const existing = await tx.orm.public.ChatGroup.where({ unitId }).first();
  if (existing) return existing;
  return tx.orm.public.ChatGroup.create({
    name: `${buildingName} ${stairwellLabel}${unitCode}`,
    scope: 'unit',
    unitId,
  });
}

async function getOrCreateBuildingChatGroup(tx: DbOrTx, buildingId: string, buildingName: string) {
  const existing = await tx.orm.public.ChatGroup.where({ buildingId }).first();
  if (existing) return existing;
  return tx.orm.public.ChatGroup.create({
    name: buildingName,
    scope: 'building',
    buildingId,
  });
}

async function getOrCreateStairwellChatGroup(
  tx: DbOrTx,
  stairwellId: string,
  buildingName: string,
  stairwellLabel: string,
) {
  const existing = await tx.orm.public.ChatGroup.where({ stairwellId }).first();
  if (existing) return existing;
  return tx.orm.public.ChatGroup.create({
    name: `${buildingName} ${stairwellLabel}`,
    scope: 'stairwell',
    stairwellId,
  });
}

async function getOrCreateFloorGroup(tx: DbOrTx, stairwellId: string, floor: number) {
  const existing = await tx.orm.public.FloorGroup.where({ stairwellId, floor }).first();
  if (existing) return existing;
  return tx.orm.public.FloorGroup.create({ stairwellId, floor });
}

async function getOrCreateFloorChatGroup(
  tx: DbOrTx,
  floorGroupId: string,
  buildingName: string,
  stairwellLabel: string,
  floor: number,
) {
  const existing = await tx.orm.public.ChatGroup.where({ floorGroupId }).first();
  if (existing) return existing;
  return tx.orm.public.ChatGroup.create({
    name: `${buildingName} ${stairwellLabel}, floor ${floor}`,
    scope: 'floor',
    floorGroupId,
  });
}

async function ensureMembership(tx: DbOrTx, tenantId: string, chatGroupId: string) {
  const existing = await tx.orm.public.ChatGroupMember.where({ tenantId, chatGroupId }).first();
  if (existing) return existing;
  return tx.orm.public.ChatGroupMember.create({ tenantId, chatGroupId });
}

// Walks Unit -> Stairwell -> Building for the given tenant, finds or creates
// the building/stairwell/floor chat groups, and joins the tenant to all three.
export async function assignTenantToChatGroups(tenantId: string, tx: DbOrTx = db) {
  const tenant = await tx.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  const unit = await tx.orm.public.Unit.where({ id: tenant.unitId }).first();
  if (!unit) throw new Error(`Unit ${tenant.unitId} not found`);

  const stairwell = await tx.orm.public.Stairwell.where({ id: unit.stairwellId }).first();
  if (!stairwell) throw new Error(`Stairwell ${unit.stairwellId} not found`);

  const building = await tx.orm.public.Building.where({ id: stairwell.buildingId }).first();
  if (!building) throw new Error(`Building ${stairwell.buildingId} not found`);

  const buildingGroup = await getOrCreateBuildingChatGroup(tx, building.id, building.name);
  const stairwellGroup = await getOrCreateStairwellChatGroup(
    tx,
    stairwell.id,
    building.name,
    stairwell.label,
  );
  const floorGroup = await getOrCreateFloorGroup(tx, stairwell.id, unit.floor);
  const floorChatGroup = await getOrCreateFloorChatGroup(
    tx,
    floorGroup.id,
    building.name,
    stairwell.label,
    unit.floor,
  );
  // The apartment chat: automatic on day one, already populated with
  // whichever flatmates have already registered under this unit.
  const unitChatGroup = await getOrCreateUnitChatGroup(
    tx,
    unit.id,
    building.name,
    stairwell.label,
    unit.code,
  );

  await ensureMembership(tx, tenantId, buildingGroup.id);
  await ensureMembership(tx, tenantId, stairwellGroup.id);
  await ensureMembership(tx, tenantId, floorChatGroup.id);
  await ensureMembership(tx, tenantId, unitChatGroup.id);

  return { buildingGroup, stairwellGroup, floorChatGroup, unitChatGroup };
}

// Creates a tenant under the given unit and immediately joins them to their
// building, stairwell, floor, and apartment chat groups, all in one
// transaction. The apartment chat already has their flatmates in it, and
// they land in it too, no setup required.
export async function createTenantWithGroups(input: {
  name: string;
  email: string;
  unitId: string;
  passwordHash?: string;
}) {
  return db.transaction(async (tx) => {
    const pseudonym = await generatePseudonym(tx);
    const tenant = await tx.orm.public.Tenant.create({ ...input, pseudonym });
    const groups = await assignTenantToChatGroups(tenant.id, tx);
    return { tenant, ...groups };
  });
}

export { floorFromUnitCode };
