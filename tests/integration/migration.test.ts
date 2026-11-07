import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { AppDb } from '../../src/data/db';

it('v1 → v2：清掉旧格式的当日计划，卡片和日志保留', async () => {
  const name = `migrate-${crypto.randomUUID()}`;
  const v1 = new Dexie(name);
  v1.version(1).stores({ cards: 'senseId, dueAtMs', reviewLogs: '++id, senseId, reviewedAtMs', dayPlans: 'dayKey', notes: 'senseId', settings: '' });
  await v1.table('dayPlans').put({ dayKey: '2026-11-07', newQuota: 20 });
  await v1.table('cards').put({ senseId: 's-1', fsrs: {}, dueAtMs: 0, suspended: false });
  await v1.table('reviewLogs').add({ senseId: 's-1', rating: 'Good', reviewedAtMs: 0, before: null });
  v1.close();

  const db = new AppDb(name);
  expect(await db.dayPlans.count()).toBe(0);
  expect(await db.cards.count()).toBe(1);
  expect(await db.reviewLogs.count()).toBe(1);
});
