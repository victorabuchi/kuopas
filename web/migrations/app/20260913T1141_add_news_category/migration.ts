#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/073b129011c640b68c51ea1fbe4e6295a585bb0d0269fc2b74bf150233bab553/contract';
import startContract from '../../snapshots/073b129011c640b68c51ea1fbe4e6295a585bb0d0269fc2b74bf150233bab553/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/0940b7af6e5a88c372f5f26437266f52f1ddd1c0e080e74f979f2d179f87a19c/contract';
import endContract from '../../snapshots/0940b7af6e5a88c372f5f26437266f52f1ddd1c0e080e74f979f2d179f87a19c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'news_post',
        column: col('category', 'text', {
          notNull: true,
          default: lit('news'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'news_post',
        constraint: 'news_post_category_check_92bcdf7d',
        expression: "\"category\" IN ('news', 'updates', 'promotions', 'discounts', 'events')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
