#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/073b129011c640b68c51ea1fbe4e6295a585bb0d0269fc2b74bf150233bab553/contract';
import endContract from '../../snapshots/073b129011c640b68c51ea1fbe4e6295a585bb0d0269fc2b74bf150233bab553/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c4da3a4fa02d9ba030e4162e424d07b06926a8447dd4723a6009ea55e72d92c0/contract';
import startContract from '../../snapshots/c4da3a4fa02d9ba030e4162e424d07b06926a8447dd4723a6009ea55e72d92c0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'news_post',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('publishedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('sourceUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('summary', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
