#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c4da3a4fa02d9ba030e4162e424d07b06926a8447dd4723a6009ea55e72d92c0/contract';
import endContract from '../../snapshots/c4da3a4fa02d9ba030e4162e424d07b06926a8447dd4723a6009ea55e72d92c0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/da0a4d8f79a3407df625730165d45184478c4e7dfa236234290e4d275f800250/contract';
import startContract from '../../snapshots/da0a4d8f79a3407df625730165d45184478c4e7dfa236234290e4d275f800250/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('suomiFiPersonId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'tenant',
        constraint: 'tenant_suomiFiPersonId_key',
        columns: ['suomiFiPersonId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
