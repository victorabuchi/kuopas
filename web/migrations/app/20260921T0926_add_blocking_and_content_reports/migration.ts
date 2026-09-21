#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0823d9bb702aff1fc1342e189b31b00057368ce2c200df80183f3317ce972a19/contract';
import endContract from '../../snapshots/0823d9bb702aff1fc1342e189b31b00057368ce2c200df80183f3317ce972a19/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e37ffa2aa4cee6404522e8bbbf757db30198a2e44d6e27e38022aa9252a93363/contract';
import startContract from '../../snapshots/e37ffa2aa4cee6404522e8bbbf757db30198a2e44d6e27e38022aa9252a93363/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'content_report',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reportedUserId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('reporterId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('snapshot', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('targetId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user_block',
        columns: [
          col('blockedId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('blockerId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'community_message',
        column: col('removedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'direct_message',
        column: col('removedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'user_block',
        constraint: 'user_block_blockerId_blockedId_key',
        columns: ['blockerId', 'blockedId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'content_report',
        index: 'content_report_reporterId_idx_aa245831',
        columns: ['reporterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'content_report',
        index: 'content_report_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_block',
        index: 'user_block_blockedId_idx_e3047657',
        columns: ['blockedId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_block',
        index: 'user_block_blockerId_idx_a25bd35c',
        columns: ['blockerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'content_report',
        foreignKey: {
          name: 'content_report_reporterId_fkey',
          columns: ['reporterId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_block',
        foreignKey: {
          name: 'user_block_blockerId_fkey',
          columns: ['blockerId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_block',
        foreignKey: {
          name: 'user_block_blockedId_fkey',
          columns: ['blockedId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
