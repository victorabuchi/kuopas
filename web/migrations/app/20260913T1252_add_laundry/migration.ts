#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0940b7af6e5a88c372f5f26437266f52f1ddd1c0e080e74f979f2d179f87a19c/contract';
import startContract from '../../snapshots/0940b7af6e5a88c372f5f26437266f52f1ddd1c0e080e74f979f2d179f87a19c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bb3eea7ee9fad5024539bebd0158c2dfc6f536e09bb93955fbc34de457656702/contract';
import endContract from '../../snapshots/bb3eea7ee9fad5024539bebd0158c2dfc6f536e09bb93955fbc34de457656702/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'laundry_booking',
        columns: [
          col('endsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('machineId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('startsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'laundry_machine',
        columns: [
          col('buildingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'laundry_booking',
        constraint: 'laundry_booking_machineId_startsAt_key',
        columns: ['machineId', 'startsAt'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'laundry_machine',
        constraint: 'laundry_machine_buildingId_label_key',
        columns: ['buildingId', 'label'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'laundry_booking',
        index: 'laundry_booking_machineId_idx_285fc70b',
        columns: ['machineId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'laundry_booking',
        index: 'laundry_booking_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'laundry_machine',
        index: 'laundry_machine_buildingId_idx_c40fd7b4',
        columns: ['buildingId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'laundry_booking',
        foreignKey: {
          name: 'laundry_booking_machineId_fkey',
          columns: ['machineId'],
          references: { schema: 'public', table: 'laundry_machine', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'laundry_booking',
        foreignKey: {
          name: 'laundry_booking_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'laundry_machine',
        foreignKey: {
          name: 'laundry_machine_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
