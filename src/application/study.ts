import type { AppDb } from '../data/db';
import { learningDayBounds, learningDayKey } from '../domain/learning-day';
import { getScheduler } from '../domain/scheduler';
import { buildQueue, newQuota, type Queue } from '../domain/study-plan';
import type { DayPlan, Rating, Settings } from '../domain/types';
import { loadSettings } from './settings';

function dayOf(s: Settings, nowMs: number) {
  const dayKey = learningDayKey(nowMs, s.timeZone, s.dayBoundaryHour);
  return { dayKey, ...learningDayBounds(dayKey, s.timeZone, s.dayBoundaryHour) };
}

export type Today = {
  dayKey: string;
  plan: DayPlan;
  /** 今天的新词额度：由当天固定的 D 和当前设置算出 */
  newQuota: number;
  /** 今天已引入的新卡数（从今天的日志推出） */
  newIntroduced: number;
  queue: Queue;
  reviewedToday: number;
};

/**
 * 今日状态。当天第一次调用时固定到期数 D，之后刷新不会重算；新词额度随当前设置变化。
 * @param senseOrder 词库中未退役词义的学习顺序
 */
export async function getToday(db: AppDb, senseOrder: readonly string[], nowMs: number): Promise<Today> {
  const settings = await loadSettings(db);
  const day = dayOf(settings, nowMs);
  const due = (await db.cards.where('dueAtMs').below(day.endMs).toArray()).filter((c) => !c.suspended);

  let plan = await db.dayPlans.get(day.dayKey);
  if (!plan) {
    plan = { dayKey: day.dayKey, dueCount: due.length };
    await db.dayPlans.put(plan);
  }

  const logsToday = await db.reviewLogs.where('reviewedAtMs').between(day.startMs, day.endMs).toArray();
  const newIntroduced = logsToday.filter((l) => l.before === null).length;
  const quota = newQuota(settings, plan.dueCount);
  const newLeft = quota - newIntroduced;
  const known = new Set(await db.cards.toCollection().primaryKeys());
  const newSenseIds: string[] = [];
  for (const id of senseOrder) {
    if (newSenseIds.length >= newLeft) break;
    if (!known.has(id)) newSenseIds.push(id);
  }

  return {
    dayKey: day.dayKey,
    plan,
    newQuota: quota,
    newIntroduced,
    queue: buildQueue(due, newSenseIds, nowMs),
    reviewedToday: logsToday.length,
  };
}

/** 评分：在一个事务里更新卡片并写日志。 */
export async function rate(db: AppDb, senseId: string, rating: Rating, nowMs: number): Promise<void> {
  const scheduler = await getScheduler();
  await db.transaction('rw', [db.cards, db.reviewLogs], async () => {
    const before = (await db.cards.get(senseId)) ?? null;
    const next = scheduler.review(before?.fsrs ?? scheduler.newState(nowMs), rating, nowMs);
    await db.cards.put({ senseId, fsrs: next.fsrs, dueAtMs: next.dueAtMs, suspended: false });
    await db.reviewLogs.add({ senseId, rating, reviewedAtMs: nowMs, before });
  });
}

/** 撤销最后一条评分（新卡被撤销后额度自然退回），返回对应的词义 ID（界面可以重新展示这张卡）。 */
export async function undoLast(db: AppDb): Promise<string> {
  return db.transaction('rw', [db.cards, db.reviewLogs], async () => {
    const last = (await db.reviewLogs.orderBy('id').last())!;
    await db.reviewLogs.delete(last.id);
    if (last.before) await db.cards.put(last.before);
    else await db.cards.delete(last.senseId);
    return last.senseId;
  });
}

/** 暂停/恢复。没学过的词也可以暂停；恢复一张从未复习过的卡等于删掉它，让它重新回到新词队列。 */
export async function setSuspended(db: AppDb, senseId: string, suspended: boolean, nowMs: number): Promise<void> {
  const scheduler = await getScheduler();
  await db.transaction('rw', db.cards, async () => {
    const card = await db.cards.get(senseId);
    if (!suspended && card?.fsrs.reps === 0) {
      await db.cards.delete(senseId);
    } else {
      await db.cards.put(card
        ? { ...card, suspended }
        : { senseId, fsrs: scheduler.newState(nowMs), dueAtMs: nowMs, suspended });
    }
  });
}
