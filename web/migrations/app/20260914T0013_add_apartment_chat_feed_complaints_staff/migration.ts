#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/c6a15ff375a7790837767b8ce31871a5eb29e8a7ed62564f1a7bf7892dcdae32/contract';
import startContract from '../../snapshots/c6a15ff375a7790837767b8ce31871a5eb29e8a7ed62564f1a7bf7892dcdae32/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fd830ccbf4bd4260a0de4fa10b3634e3c2f58f9f9e7f3ee9b1192f51b1faa46f/contract';
import endContract from '../../snapshots/fd830ccbf4bd4260a0de4fa10b3634e3c2f58f9f9e7f3ee9b1192f51b1faa46f/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'chat_group',
        constraint: 'chat_group_scope_check_a40ae3fc',
      }),
      this.createTable({
        schema: 'public',
        table: 'building_post',
        columns: [
          col('authorStaffId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('authorTenantId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('buildingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('noticeboardCategory', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('photoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'building_post_noticeboardCategory_check_3ceb2636',
            "\"noticeboardCategory\" IN ('furniture', 'lost_found', 'borrow', 'giveaway', 'other')",
          ),
          checkExpression(
            'building_post_type_check_54f4d5fe',
            "\"type\" IN ('announcement', 'noticeboard')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'building_post_comment',
        columns: [
          col('authorId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('postId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'building_post_reaction',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('emoji', 'text', {
            notNull: true,
            default: lit('👍'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('postId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'complaint',
        columns: [
          col('assignedStaffId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('photoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('new'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'complaint_category_check_3a483362',
            "\"category\" IN ('plumbing', 'electrical', 'heating', 'appliance', 'pest', 'noise', 'structural', 'other')",
          ),
          checkExpression(
            'complaint_status_check_5df1bb4e',
            "\"status\" IN ('new', 'in_progress', 'resolved')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'complaint_message',
        columns: [
          col('complaintId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('senderStaffId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('senderTenantId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
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
        table: 'direct_notice_message',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('senderStaffId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('senderTenantId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('sentAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('threadId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'direct_notice_thread',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'push_subscription',
        columns: [
          col('auth', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endpoint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('p256dh', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'staff',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'chat_group',
        column: col('unitId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('pseudonym', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'building_post_reaction',
        constraint: 'building_post_reaction_postId_tenantId_key',
        columns: ['postId', 'tenantId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'chat_group',
        constraint: 'chat_group_scope_check_ce77aac6',
        expression: "\"scope\" IN ('building', 'stairwell', 'floor', 'unit')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'chat_group',
        constraint: 'chat_group_unitId_key',
        columns: ['unitId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'direct_notice_thread',
        constraint: 'direct_notice_thread_tenantId_key',
        columns: ['tenantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'push_subscription',
        constraint: 'push_subscription_endpoint_key',
        columns: ['endpoint'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'staff',
        constraint: 'staff_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tenant',
        constraint: 'tenant_pseudonym_key',
        columns: ['pseudonym'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post',
        index: 'building_post_authorStaffId_idx_9658370a',
        columns: ['authorStaffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post',
        index: 'building_post_authorTenantId_idx_c661c2b2',
        columns: ['authorTenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post',
        index: 'building_post_buildingId_createdAt_idx_7b656189',
        columns: ['buildingId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post',
        index: 'building_post_buildingId_idx_c40fd7b4',
        columns: ['buildingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_comment',
        index: 'building_post_comment_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_comment',
        index: 'building_post_comment_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_reaction',
        index: 'building_post_reaction_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_reaction',
        index: 'building_post_reaction_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'complaint',
        index: 'complaint_assignedStaffId_idx_6da9f5f2',
        columns: ['assignedStaffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'complaint',
        index: 'complaint_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'complaint',
        index: 'complaint_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'complaint_message',
        index: 'complaint_message_complaintId_idx_7b731d46',
        columns: ['complaintId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'complaint_message',
        index: 'complaint_message_senderStaffId_idx_f113dfb3',
        columns: ['senderStaffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'complaint_message',
        index: 'complaint_message_senderTenantId_idx_86cb4507',
        columns: ['senderTenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'direct_notice_message',
        index: 'direct_notice_message_senderStaffId_idx_f113dfb3',
        columns: ['senderStaffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'direct_notice_message',
        index: 'direct_notice_message_senderTenantId_idx_86cb4507',
        columns: ['senderTenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'direct_notice_message',
        index: 'direct_notice_message_threadId_idx_6deac339',
        columns: ['threadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'push_subscription',
        index: 'push_subscription_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post',
        foreignKey: {
          name: 'building_post_buildingId_fkey',
          columns: ['buildingId'],
          references: { schema: 'public', table: 'building', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post',
        foreignKey: {
          name: 'building_post_authorTenantId_fkey',
          columns: ['authorTenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post',
        foreignKey: {
          name: 'building_post_authorStaffId_fkey',
          columns: ['authorStaffId'],
          references: { schema: 'public', table: 'staff', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_comment',
        foreignKey: {
          name: 'building_post_comment_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'building_post', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_comment',
        foreignKey: {
          name: 'building_post_comment_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_reaction',
        foreignKey: {
          name: 'building_post_reaction_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'building_post', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_reaction',
        foreignKey: {
          name: 'building_post_reaction_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chat_group',
        foreignKey: {
          name: 'chat_group_unitId_fkey',
          columns: ['unitId'],
          references: { schema: 'public', table: 'unit', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'complaint',
        foreignKey: {
          name: 'complaint_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'complaint',
        foreignKey: {
          name: 'complaint_assignedStaffId_fkey',
          columns: ['assignedStaffId'],
          references: { schema: 'public', table: 'staff', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'complaint_message',
        foreignKey: {
          name: 'complaint_message_complaintId_fkey',
          columns: ['complaintId'],
          references: { schema: 'public', table: 'complaint', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'complaint_message',
        foreignKey: {
          name: 'complaint_message_senderTenantId_fkey',
          columns: ['senderTenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'complaint_message',
        foreignKey: {
          name: 'complaint_message_senderStaffId_fkey',
          columns: ['senderStaffId'],
          references: { schema: 'public', table: 'staff', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_notice_message',
        foreignKey: {
          name: 'direct_notice_message_threadId_fkey',
          columns: ['threadId'],
          references: { schema: 'public', table: 'direct_notice_thread', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_notice_message',
        foreignKey: {
          name: 'direct_notice_message_senderStaffId_fkey',
          columns: ['senderStaffId'],
          references: { schema: 'public', table: 'staff', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_notice_message',
        foreignKey: {
          name: 'direct_notice_message_senderTenantId_fkey',
          columns: ['senderTenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'direct_notice_thread',
        foreignKey: {
          name: 'direct_notice_thread_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'push_subscription',
        foreignKey: {
          name: 'push_subscription_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
