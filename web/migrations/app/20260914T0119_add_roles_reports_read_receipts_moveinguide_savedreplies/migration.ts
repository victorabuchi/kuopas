#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b295b72c76c7437375bbda018884a0b9874f5f3778fc0de3ab8e523c0831899e/contract';
import endContract from '../../snapshots/b295b72c76c7437375bbda018884a0b9874f5f3778fc0de3ab8e523c0831899e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fd830ccbf4bd4260a0de4fa10b3634e3c2f58f9f9e7f3ee9b1192f51b1faa46f/contract';
import startContract from '../../snapshots/fd830ccbf4bd4260a0de4fa10b3634e3c2f58f9f9e7f3ee9b1192f51b1faa46f/contract.json' with { type: 'json' };
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
      this.createTable({
        schema: 'public',
        table: 'building_post_read',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('postId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('readAt', 'timestamptz', {
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
        table: 'building_post_report',
        columns: [
          col('commentId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('postId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reporterId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'building_post_report_status_check_13409d73',
            "\"status\" IN ('open', 'dismissed', 'actioned')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'move_in_checklist_item',
        columns: [
          col('completedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('itemKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'saved_reply',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdByStaffId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'building_post',
        column: col('contentEn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'building_post',
        column: col('titleEn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('blockedFromNoticeboard', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('role', 'text', {
          notNull: true,
          default: lit('resident'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('staffId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'building_post_read',
        constraint: 'building_post_read_postId_tenantId_key',
        columns: ['postId', 'tenantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'move_in_checklist_item',
        constraint: 'move_in_checklist_item_tenantId_itemKey_key',
        columns: ['tenantId', 'itemKey'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tenant',
        constraint: 'tenant_role_check_d42ba6ef',
        expression: "\"role\" IN ('resident', 'admin')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'tenant',
        constraint: 'tenant_staffId_key',
        columns: ['staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_read',
        index: 'building_post_read_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_read',
        index: 'building_post_read_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_report',
        index: 'building_post_report_commentId_idx_b5a4f615',
        columns: ['commentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_report',
        index: 'building_post_report_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_report',
        index: 'building_post_report_reporterId_idx_aa245831',
        columns: ['reporterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'building_post_report',
        index: 'building_post_report_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'move_in_checklist_item',
        index: 'move_in_checklist_item_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'saved_reply',
        index: 'saved_reply_createdByStaffId_idx_3dc0f553',
        columns: ['createdByStaffId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_read',
        foreignKey: {
          name: 'building_post_read_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'building_post', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_read',
        foreignKey: {
          name: 'building_post_read_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_report',
        foreignKey: {
          name: 'building_post_report_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'building_post', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_report',
        foreignKey: {
          name: 'building_post_report_commentId_fkey',
          columns: ['commentId'],
          references: { schema: 'public', table: 'building_post_comment', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'building_post_report',
        foreignKey: {
          name: 'building_post_report_reporterId_fkey',
          columns: ['reporterId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'move_in_checklist_item',
        foreignKey: {
          name: 'move_in_checklist_item_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'saved_reply',
        foreignKey: {
          name: 'saved_reply_createdByStaffId_fkey',
          columns: ['createdByStaffId'],
          references: { schema: 'public', table: 'staff', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenant',
        foreignKey: {
          name: 'tenant_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'staff', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
