import { describe, expect, it } from 'vitest';
import { buildQueue, newQuota } from '../../src/domain/study-plan';
import type { Card } from '../../src/domain/types';

const card = (senseId: string, dueAtMs: number, scheduleStatus: string): Card =>
  ({ senseId, dueAtMs, suspended: false, fsrs: { scheduleStatus } });

describe('newQuota', () => {
  const s = { dailyTarget: 60, newLimit: 20 };
  it('复习少时取新词上限', () => expect(newQuota(s, 10)).toBe(20));
  it('按每日目标扣减', () => expect(newQuota(s, 50)).toBe(10));
  it('积压超过目标时为 0', () => expect(newQuota(s, 100)).toBe(0));
});

describe('buildQueue', () => {
  it('已到期的学习卡 → 复习卡；未到期的学习卡计入"稍后"', () => {
    const now = 1_000;
    const q = buildQueue(
      [card('r1', 500, 'review'), card('l-later', 2_000, 'learning'), card('l-now', 900, 'relearning'), card('r0', 100, 'review')],
      ['n1'],
      now,
    );
    expect(q.due.map((c) => c.senseId)).toEqual(['l-now', 'r0', 'r1']);
    expect(q.newSenseIds).toEqual(['n1']);
    expect(q.laterToday).toBe(1);
    expect(q.nextLaterAtMs).toBe(2_000);
  });
});
