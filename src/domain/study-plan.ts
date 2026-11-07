import type { Card, Settings } from './types';

/** 当天新词额度 = min(新词上限, max(0, 每日目标 − D))，D = 今天结束前到期的旧卡数。 */
export function newQuota(s: Pick<Settings, 'dailyTarget' | 'newLimit'>, dueCount: number): number {
  return Math.max(0, Math.min(s.newLimit, s.dailyTarget - dueCount));
}

export type Queue = {
  /** 现在可以复习的卡：已到期的学习/重学卡 → 今天到期的复习卡 */
  due: Card[];
  /** 今天还能引入的新词 */
  newSenseIds: string[];
  /** 今天稍后才到期的学习/重学卡 */
  laterToday: number;
  nextLaterAtMs: number | null;
};

const isLearning = (c: Card) => c.fsrs.scheduleStatus === 'learning' || c.fsrs.scheduleStatus === 'relearning';
const byDue = (a: Card, b: Card) => a.dueAtMs - b.dueAtMs;

/** `dueToday`：未暂停、且在今天学习日结束前到期的卡。 */
export function buildQueue(dueToday: Card[], newSenseIds: string[], nowMs: number): Queue {
  const learning: Card[] = [];
  const review: Card[] = [];
  const later: Card[] = [];
  for (const c of dueToday) {
    if (!isLearning(c)) review.push(c);
    else if (c.dueAtMs <= nowMs) learning.push(c);
    else later.push(c);
  }
  later.sort(byDue);
  return {
    due: [...learning.sort(byDue), ...review.sort(byDue)],
    newSenseIds,
    laterToday: later.length,
    nextLaterAtMs: later[0]?.dueAtMs ?? null,
  };
}
