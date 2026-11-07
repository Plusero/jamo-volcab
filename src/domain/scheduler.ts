import { DefaultScheduler, Rating as FsrsRating } from 'ts-fsrs';
import type { FsrsState, Rating } from './types';

/** ts-fsrs v6 的薄封装：把库的卡片和 JSON（日期转为 `<字段>Ms`）互相转换。 */

const GRADE: Record<Rating, number> = {
  Again: FsrsRating.Again, Hard: FsrsRating.Hard, Good: FsrsRating.Good, Easy: FsrsRating.Easy,
};

type LibCard = { dueAt: Date } & Record<string, unknown>;
type LibScheduler = {
  newCard(a: { now: Date }): LibCard;
  review(a: { card: LibCard; grade: number; now: Date }): { card: LibCard };
};

export type Scheduler = {
  newState(nowMs: number): FsrsState;
  review(state: FsrsState, rating: Rating, nowMs: number): { fsrs: FsrsState; dueAtMs: number };
};

function encode(card: LibCard): FsrsState {
  const out: FsrsState = {};
  for (const [k, v] of Object.entries(card)) {
    if (v instanceof Date) out[`${k}Ms`] = v.getTime();
    else if (v !== undefined) out[k] = v as FsrsState[string];
  }
  return out;
}

function decode(state: FsrsState): LibCard {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (k.endsWith('Ms') && typeof v === 'number') out[k.slice(0, -2)] = new Date(v);
    else out[k] = v;
  }
  return out as LibCard;
}

let cached: Promise<Scheduler> | undefined;

export function getScheduler(): Promise<Scheduler> {
  cached ??= (async () => {
    const lib = (await DefaultScheduler({
      enableFuzz: false,
      learningSteps: ['1m', '10m'],
      relearningSteps: ['10m'],
    } as never)) as unknown as LibScheduler;
    return {
      newState: (nowMs) => encode(lib.newCard({ now: new Date(nowMs) })),
      review(state, rating, nowMs) {
        const { card } = lib.review({ card: decode(state), grade: GRADE[rating], now: new Date(nowMs) });
        return { fsrs: encode(card), dueAtMs: card.dueAt.getTime() };
      },
    };
  })();
  return cached;
}
