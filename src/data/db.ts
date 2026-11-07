import Dexie, { type EntityTable, type Table } from 'dexie';
import type { Card, DayPlan, Note, ReviewLog, Settings } from '../domain/types';

/** 只存用户数据；词库是静态文件。升级 schema 时加 version(n)，不删库重建。 */
export class AppDb extends Dexie {
  cards!: EntityTable<Card, 'senseId'>;
  reviewLogs!: EntityTable<ReviewLog, 'id'>;
  dayPlans!: EntityTable<DayPlan, 'dayKey'>;
  notes!: EntityTable<Note, 'senseId'>;
  /** 单行，键为 'main' */
  settings!: Table<Settings, string>;

  constructor(name = 'dutch-vocab-local') {
    super(name);
    this.version(1).stores({
      cards: 'senseId, dueAtMs',
      reviewLogs: '++id, senseId, reviewedAtMs',
      dayPlans: 'dayKey',
      notes: 'senseId',
      settings: '',
    });
    // v2：dayPlans 从 { newQuota } 改为 { dueCount }。旧计划直接清掉，当天打开时会重建。
    this.version(2).upgrade((tx) => tx.table('dayPlans').clear());
  }

  get userTables() {
    return [this.cards, this.reviewLogs, this.dayPlans, this.notes, this.settings];
  }
}
