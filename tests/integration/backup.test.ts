import { describe, expect, it } from 'vitest';
import { exportBackup, parseBackup, restoreBackup } from '../../src/application/backup';
import { updateNote } from '../../src/application/notes';
import { getToday, rate } from '../../src/application/study';
import { getScheduler } from '../../src/domain/scheduler';
import type { AppDb } from '../../src/data/db';
import { DAY, newDb, SENSES, T0 } from './helpers';

async function dump(db: AppDb) {
  return {
    cards: await db.cards.toArray(),
    reviewLogs: await db.reviewLogs.toArray(),
    dayPlans: await db.dayPlans.toArray(),
    notes: await db.notes.toArray(),
  };
}

async function seeded() {
  const db = await newDb();
  await getToday(db, SENSES, T0);
  await rate(db, 's-0', 'Good', T0);
  await rate(db, 's-1', 'Again', T0);
  await rate(db, 's-1', 'Hard', T0 + 600_000);
  await updateNote(db, 's-0', { text: '笔记', starred: true });
  return db;
}

describe('备份', () => {
  it('导出后导入空库，数据一致，下一次调度结果相同', async () => {
    const a = await seeded();
    const { json, fileName } = await exportBackup(a, T0);
    expect(fileName).toMatch(/^dutch-vocab-backup-\d{8}T\d{6}Z\.json$/);

    const b = await newDb();
    await restoreBackup(b, parseBackup(json));
    expect(await dump(b)).toEqual(await dump(a));

    const s = await getScheduler();
    const [ca, cb] = [(await a.cards.get('s-0'))!, (await b.cards.get('s-0'))!];
    expect(s.review(cb.fsrs, 'Good', T0 + 10 * DAY)).toEqual(s.review(ca.fsrs, 'Good', T0 + 10 * DAY));
  });

  it('坏文件直接抛错', () => {
    expect(() => parseBackup('{"format":')).toThrow();
    expect(() => parseBackup(JSON.stringify({ format: 'other', formatVersion: 1 }))).toThrow();
    expect(() => parseBackup(JSON.stringify({ format: 'dutch-vocab-backup', formatVersion: 2, createdAt: '', data: {} }))).toThrow();
  });

  it('恢复中途失败时事务回滚，原有数据不变', async () => {
    const db = await seeded();
    const original = await dump(db);
    const file = parseBackup((await exportBackup(db, T0)).json);
    file.data.cards.push(file.data.cards[0]!); // 主键重复 → bulkAdd 抛错
    await expect(restoreBackup(db, file)).rejects.toThrow();
    expect(await dump(db)).toEqual(original);
  });
});
