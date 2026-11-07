import { describe, expect, it } from 'vitest';
import { addDaysToKey, learningDayBounds, learningDayKey, zonedWallToMs } from '../../src/domain/learning-day';

const AMS = 'Europe/Amsterdam';

describe('learningDayKey (T12)', () => {
  it('03:59 本地仍属前一学习日,04:00 起属当日', () => {
    // 2026-01-15 03:59 CET = 02:59Z ; 04:00 CET = 03:00Z
    expect(learningDayKey(Date.UTC(2026, 0, 15, 2, 59), AMS)).toBe('2026-01-14');
    expect(learningDayKey(Date.UTC(2026, 0, 15, 3, 0), AMS)).toBe('2026-01-15');
  });

  it('夏令时开始日(2026-03-29)学习日长度为 23 小时,而不是固定 24 小时', () => {
    const { startMs, endMs } = learningDayBounds('2026-03-28', AMS);
    // 28 日 04:00 CET (UTC+1)=03:00Z ; 29 日 04:00 CEST (UTC+2)=02:00Z
    expect(startMs).toBe(Date.UTC(2026, 2, 28, 3, 0));
    expect(endMs).toBe(Date.UTC(2026, 2, 29, 2, 0));
    expect((endMs - startMs) / 3_600_000).toBe(23);
  });

  it('夏令时结束日(2026-10-25)学习日长度为 25 小时', () => {
    const { startMs, endMs } = learningDayBounds('2026-10-24', AMS);
    expect((endMs - startMs) / 3_600_000).toBe(25);
    expect(endMs).toBe(Date.UTC(2026, 9, 25, 3, 0));
  });

  it('跨日:同一真实时刻在不同时区归入不同学习日', () => {
    const t = Date.UTC(2026, 5, 1, 20, 0); // 20:00Z
    expect(learningDayKey(t, 'Europe/Amsterdam')).toBe('2026-06-01'); // 22:00
    expect(learningDayKey(t, 'Asia/Shanghai')).toBe('2026-06-02'); // 04:00 次日 → 恰好属于次日
    expect(learningDayKey(t - 60_000, 'Asia/Shanghai')).toBe('2026-06-01'); // 03:59
  });

  it('日历加减不受夏令时影响', () => {
    expect(addDaysToKey('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('zonedWallToMs 往返一致', () => {
    for (const key of ['2026-03-29', '2026-10-25', '2026-07-01']) {
      const ms = zonedWallToMs(key, 4, AMS);
      expect(learningDayKey(ms, AMS)).toBe(key);
      expect(learningDayKey(ms - 1, AMS)).toBe(addDaysToKey(key, -1));
    }
  });
});
