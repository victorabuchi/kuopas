#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/bb3eea7ee9fad5024539bebd0158c2dfc6f536e09bb93955fbc34de457656702/contract';
import startContract from '../../snapshots/bb3eea7ee9fad5024539bebd0158c2dfc6f536e09bb93955fbc34de457656702/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c6a15ff375a7790837767b8ce31871a5eb29e8a7ed62564f1a7bf7892dcdae32/contract';
import endContract from '../../snapshots/c6a15ff375a7790837767b8ce31871a5eb29e8a7ed62564f1a7bf7892dcdae32/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'direct_conversation',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('memberAId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('memberBId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'direct_message',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
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
        table: 'parking_spot',
        columns: [
          col('buildingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'sauna_booking',
        columns: [
          col('endsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('slotId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
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
        table: 'sauna_slot',
        columns: [
          col('buildingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'direct_conversation',
        constraint: 'direct_conversation_memberAId_memberBId_key',
        columns: ['memberAId', 'memberBId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'parking_spot',
        constraint: 'parking_spot_tenantId_key',
        columns: ['tenantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'parking_spot',
        constraint: 'parking_spot_buildingId_label_key',
        columns: ['buildingId', 'label'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sauna_booking',
        constraint: 'sauna_booking_slotId_startsAt_key',
        columns: ['slotId', 'startsAt'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sauna_slot',
        constraint: 'sauna_slot_buildingId_label_key',
        columns: ['buildingId', 'label'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'direct_conversation',
        index: 'direct_conversation_memberAId_idx_78d4a87c',
        columns: ['memberAId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'direct_conversation',
        index: 'direct_conversation_memberBId_idx_74b621e0',
        columns: ['memberBId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'direct_message',
        index: 'direct_message_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'direct_message',
        index: 'direct_message_senderId_idx_4689c490',
        columns: ['senderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'parking_spot',
        index: 'parking_spot_buildingId_idx_c40fd7b4',
        columns: ['buildingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sauna_booking',
        index: 'sauna_booking_slotId_idx_4d7c6bc9',
        columns: ['slotId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sauna_booking',
        index: 'sauna_booking_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sauna_slot',
        index: 'sauna_slot_buildingId_idx_c40fd7b4',
        columns: ['buildingId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_conversation',
        foreignKey: {
          name: 'direct_conversation_memberAId_fkey',
          columns: ['memberAId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_conversation',
        foreignKey: {
          name: 'direct_conversation_memberBId_fkey',
          columns: ['memberBId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_message',
        foreignKey: {
          name: 'direct_message_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'direct_conversation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_message',
        foreignKey: {
          name: 'direct_message_senderId_fkey',
          columns: ['senderId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'parking_spot',
        foreignKey: {
          name: 'parking_spot_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'parking_spot',
        foreignKey: {
          name: 'parking_spot_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sauna_booking',
        foreignKey: {
          name: 'sauna_booking_slotId_fkey',
          columns: ['slotId'],
          references: { schema: 'public', table: 'sauna_slot', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sauna_booking',
        foreignKey: {
          name: 'sauna_booking_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sauna_slot',
        foreignKey: {
          name: 'sauna_slot_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
