import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

// @ts-expect-error — contract.d.ts omits `nullable` on every to-one relation
// descriptor (known bug in @prisma/orm-postgres@8.0.0-rc.10's TS emitter;
// contract.json, which the runtime actually validates against, has it
// correctly). Drop this once the emitter is fixed upstream.
export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
