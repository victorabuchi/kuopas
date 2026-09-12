#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/da0a4d8f79a3407df625730165d45184478c4e7dfa236234290e4d275f800250/contract';
import endContract from '../../snapshots/da0a4d8f79a3407df625730165d45184478c4e7dfa236234290e4d275f800250/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'building',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'chat_group',
        columns: [
          col('buildingId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('floorGroupId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('scope', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('stairwellId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'chat_group_scope_check_a40ae3fc',
            "\"scope\" IN ('building', 'stairwell', 'floor')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'chat_group_member',
        columns: [
          col('chatGroupId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'floor_group',
        columns: [
          col('floor', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('stairwellId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'message',
        columns: [
          col('chatGroupId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('senderId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('sentAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'stairwell',
        columns: [
          col('buildingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tenant',
        columns: [
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'unit',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('floor', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('stairwellId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'chat_group',
        constraint: 'chat_group_buildingId_key',
        columns: ['buildingId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'chat_group',
        constraint: 'chat_group_stairwellId_key',
        columns: ['stairwellId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'chat_group',
        constraint: 'chat_group_floorGroupId_key',
        columns: ['floorGroupId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'chat_group_member',
        constraint: 'chat_group_member_tenantId_chatGroupId_key',
        columns: ['tenantId', 'chatGroupId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'floor_group',
        constraint: 'floor_group_stairwellId_floor_key',
        columns: ['stairwellId', 'floor'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'stairwell',
        constraint: 'stairwell_buildingId_label_key',
        columns: ['buildingId', 'label'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tenant',
        constraint: 'tenant_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'unit',
        constraint: 'unit_stairwellId_code_key',
        columns: ['stairwellId', 'code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chat_group_member',
        index: 'chat_group_member_chatGroupId_idx_7e9f325a',
        columns: ['chatGroupId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chat_group_member',
        index: 'chat_group_member_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'floor_group',
        index: 'floor_group_stairwellId_idx_5df1173b',
        columns: ['stairwellId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_chatGroupId_idx_7e9f325a',
        columns: ['chatGroupId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_senderId_idx_4689c490',
        columns: ['senderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'stairwell',
        index: 'stairwell_buildingId_idx_c40fd7b4',
        columns: ['buildingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenant',
        index: 'tenant_unitId_idx_be785412',
        columns: ['unitId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'unit',
        index: 'unit_stairwellId_idx_5df1173b',
        columns: ['stairwellId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chat_group',
        foreignKey: {
          name: 'chat_group_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chat_group',
        foreignKey: {
          name: 'chat_group_stairwellId_fkey',
          columns: ['stairwellId'],
          references: { schema: 'public', table: 'stairwell', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chat_group',
        foreignKey: {
          name: 'chat_group_floorGroupId_fkey',
          columns: ['floorGroupId'],
          references: { schema: 'public', table: 'floor_group', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chat_group_member',
        foreignKey: {
          name: 'chat_group_member_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chat_group_member',
        foreignKey: {
          name: 'chat_group_member_chatGroupId_fkey',
          columns: ['chatGroupId'],
          references: { schema: 'public', table: 'chat_group', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'floor_group',
        foreignKey: {
          name: 'floor_group_stairwellId_fkey',
          columns: ['stairwellId'],
          references: { schema: 'public', table: 'stairwell', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'message',
        foreignKey: {
          name: 'message_senderId_fkey',
          columns: ['senderId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'message',
        foreignKey: {
          name: 'message_chatGroupId_fkey',
          columns: ['chatGroupId'],
          references: { schema: 'public', table: 'chat_group', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'stairwell',
        foreignKey: {
          name: 'stairwell_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenant',
        foreignKey: {
          name: 'tenant_unitId_fkey',
          columns: ['unitId'],
          references: { schema: 'public', table: 'unit', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'unit',
        foreignKey: {
          name: 'unit_stairwellId_fkey',
          columns: ['stairwellId'],
          references: { schema: 'public', table: 'stairwell', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
