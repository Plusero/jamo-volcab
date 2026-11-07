import { describe, expect, it } from 'vitest';
import { getToday, rate, setSuspended, undoLast } from '../../src/application/study';
import { DAY, MIN, newDb, SENSES, T0 } from './helpers';

describe('学习流程', () => {
  it('评分新卡：写入一张卡和一条日志，扣减新词额度', async () => {
    const db = await newDb();
    const t0 = await getToday(db, SENSES, T0);
    expect(t0.plan.newQuota).toBe(20);
    expect(t0.queue.newSenseIds[0]).toBe('s-0');

    await rate(db, 's-0', 'Good', T0);
    expect(await db.cards.count()).toBe(1);
    expect(await db.reviewLogs.count()).toBe(1);

    const t1 = await getToday(db, SENSES, T0 + MIN);
    expect(t1.newIntroduced).toBe(1);
    expect(t1.queue.newSenseIds).toHaveLength(19);
    expect(t1.queue.newSenseIds).not.toContain('s-0');
    expect(t1.reviewedToday).toBe(1);
  });

  it('刷新不会重新计算新词额度', async () => {
    const db = await newDb({ newLimit: 3 });
    await getToday(db, SENSES, T0);
    for (const id of ['s-0', 's-1', 's-2']) await rate(db, id, 'Good', T0);
    const t = await getToday(db, SENSES, T0 + MIN);
    expect(t.queue.newSenseIds).toEqual([]);
    expect((await getToday(db, SENSES, T0 + 2 * MIN)).queue.newSenseIds).toEqual([]);
  });

  it('Again 的卡稍后出现，到期后排在新词之前', async () => {
    const db = await newDb();
    await getToday(db, SENSES, T0);
    await rate(db, 's-0', 'Again', T0);
    const soon = await getToday(db, SENSES, T0 + 1000);
    expect(soon.queue.due).toHaveLength(0);
    expect(soon.queue.laterToday).toBe(1);
    const later = await getToday(db, SENSES, T0 + 15 * MIN);
    expect(later.queue.due.map((c) => c.senseId)).toEqual(['s-0']);
  });

  it('积压超过每日目标时，新词额度为 0', async () => {
    const db = await newDb({ dailyTarget: 5 });
    for (const id of SENSES.slice(0, 8)) await rate(db, id, 'Good', T0 - 30 * DAY);
    const t = await getToday(db, SENSES, T0);
    expect(t.queue.due).toHaveLength(8);
    expect(t.plan.newQuota).toBe(0);
  });

  it('撤销新卡：删除卡片和日志，退回额度', async () => {
    const db = await newDb();
    await getToday(db, SENSES, T0);
    await rate(db, 's-0', 'Good', T0);
    expect(await undoLast(db)).toBe('s-0');
    expect(await db.cards.count()).toBe(0);
    expect(await db.reviewLogs.count()).toBe(0);
    expect((await getToday(db, SENSES, T0)).newIntroduced).toBe(0);
  });

  it('撤销复习：卡片还原为评分前的状态', async () => {
    const db = await newDb();
    await rate(db, 's-0', 'Good', T0);
    const before = await db.cards.get('s-0');
    await rate(db, 's-0', 'Again', T0 + 5 * DAY);
    await undoLast(db);
    expect(await db.cards.get('s-0')).toEqual(before);
    expect(await db.reviewLogs.count()).toBe(1);
  });

  it('暂停的卡不进入队列；恢复从未学过的词会让它回到新词队列', async () => {
    const db = await newDb();
    await rate(db, 's-0', 'Good', T0 - 30 * DAY);
    await setSuspended(db, 's-0', true, T0);
    await setSuspended(db, 's-1', true, T0);
    const t = await getToday(db, SENSES, T0);
    expect(t.queue.due).toHaveLength(0);
    expect(t.queue.newSenseIds).not.toContain('s-1');

    await setSuspended(db, 's-1', false, T0);
    expect(await db.cards.get('s-1')).toBeUndefined();
    await setSuspended(db, 's-0', false, T0);
    expect((await db.cards.get('s-0'))?.suspended).toBe(false);
  });
});
