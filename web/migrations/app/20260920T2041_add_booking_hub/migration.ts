#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/96eff3c652e7db3b75997b39ad22b2212ecfe414cc22fcbd80fa17035f705900/contract';
import endContract from '../../snapshots/96eff3c652e7db3b75997b39ad22b2212ecfe414cc22fcbd80fa17035f705900/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f434d4d71636ad048bfc86ab0c82a7ae0a4609c5ae5ff02ddc5c3db1d473d250/contract';
import startContract from '../../snapshots/f434d4d71636ad048bfc86ab0c82a7ae0a4609c5ae5ff02ddc5c3db1d473d250/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'bookable_space',
        columns: [
          col('advanceDays', 'int4', {
            notNull: true,
            default: lit(14),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('buildingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('capacity', 'int4', {
            notNull: true,
            default: lit(6),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('closeHour', 'int4', {
            notNull: true,
            default: lit(22),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxHoursPerBooking', 'int4', {
            notNull: true,
            default: lit(2),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('maxHoursPerWeek', 'int4', {
            notNull: true,
            default: lit(4),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openHour', 'int4', {
            notNull: true,
            default: lit(8),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'booking_participant',
        columns: [
          col('bookingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('invited'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'building_amenity',
        columns: [
          col('buildingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('enabled', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'space_booking',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('spaceId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
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
        table: 'unit_amenity',
        columns: [
          col('enabled', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'sauna_slot',
        column: col('capacity', 'int4', {
          notNull: true,
          default: lit(6),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'bookable_space',
        constraint: 'bookable_space_buildingId_name_key',
        columns: ['buildingId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'booking_participant',
        constraint: 'booking_participant_kind_bookingId_tenantId_key',
        columns: ['kind', 'bookingId', 'tenantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'building_amenity',
        constraint: 'building_amenity_buildingId_kind_key',
        columns: ['buildingId', 'kind'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'unit_amenity',
        constraint: 'unit_amenity_unitId_kind_key',
        columns: ['unitId', 'kind'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'bookable_space',
        index: 'bookable_space_buildingId_idx_c40fd7b4',
        columns: ['buildingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'booking_participant',
        index: 'booking_participant_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_amenity',
        index: 'building_amenity_buildingId_idx_c40fd7b4',
        columns: ['buildingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'space_booking',
        index: 'space_booking_spaceId_idx_bb21015f',
        columns: ['spaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'space_booking',
        index: 'space_booking_spaceId_startsAt_idx_4a67bc05',
        columns: ['spaceId', 'startsAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'space_booking',
        index: 'space_booking_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'unit_amenity',
        index: 'unit_amenity_unitId_idx_be785412',
        columns: ['unitId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'bookable_space',
        foreignKey: {
          name: 'bookable_space_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'booking_participant',
        foreignKey: {
          name: 'booking_participant_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_amenity',
        foreignKey: {
          name: 'building_amenity_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'space_booking',
        foreignKey: {
          name: 'space_booking_spaceId_fkey',
          columns: ['spaceId'],
          references: { schema: 'public', table: 'bookable_space', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'space_booking',
        foreignKey: {
          name: 'space_booking_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'unit_amenity',
        foreignKey: {
          name: 'unit_amenity_unitId_fkey',
          columns: ['unitId'],
          references: { schema: 'public', table: 'unit', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
