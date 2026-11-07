import { describe, expect, it } from 'vitest';
import { getScheduler } from '../../src/domain/scheduler';
import type { Rating } from '../../src/domain/types';

const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);
const DAY = 86_400_000;

describe('scheduler', () => {
  it('Again 进入分钟级重学，Good 至少一天后复习', async () => {
    const s = await getScheduler();
    const fresh = s.newState(T0);
    expect(s.review(fresh, 'Again', T0).dueAtMs - T0).toBeLessThanOrEqual(10 * 60_000);
    expect(s.review(fresh, 'Good', T0).dueAtMs - T0).toBeGreaterThan(DAY);
  });

  it('状态经 JSON 往返后，下一次评分结果相同', async () => {
    const s = await getScheduler();
    let state = s.newState(T0);
    let t = T0;
    for (const r of ['Good', 'Hard', 'Again', 'Good'] as Rating[]) {
      const out = s.review(state, r, t);
      state = out.fsrs;
      t = out.dueAtMs;
    }
    const restored = JSON.parse(JSON.stringify(state));
    expect(s.review(restored, 'Good', t)).toEqual(s.review(state, 'Good', t));
  });

  it('dueAtMs 与 fsrs 中保存的到期时间一致', async () => {
    const s = await getScheduler();
    const out = s.review(s.newState(T0), 'Good', T0);
    expect(out.fsrs.dueAtMs).toBe(out.dueAtMs);
  });
});
