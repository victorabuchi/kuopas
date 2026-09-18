#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/434851822af20684c655f72bfd644ca5d71e2b296358985a10934cd8a40a3c1b/contract';
import endContract from '../../snapshots/434851822af20684c655f72bfd644ca5d71e2b296358985a10934cd8a40a3c1b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b295b72c76c7437375bbda018884a0b9874f5f3778fc0de3ab8e523c0831899e/contract';
import startContract from '../../snapshots/b295b72c76c7437375bbda018884a0b9874f5f3778fc0de3ab8e523c0831899e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('hasSeenMoveInGuide', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
