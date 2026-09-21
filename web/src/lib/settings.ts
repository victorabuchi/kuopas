import { db } from '../prisma/db';

// Small key/value settings admins can change without a deploy.
export async function getSetting(key: string): Promise<string | null> {
  const row = await db.orm.public.AppSetting.where({ key }).first();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const row = await db.orm.public.AppSetting.where({ key }).first();
  if (row) await db.orm.public.AppSetting.where({ key }).update({ value });
  else await db.orm.public.AppSetting.create({ key, value });
}
