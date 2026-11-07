/**
 * 学习日：IANA 时区 + 本地边界小时（默认 04:00）。
 * 按当地日历计算，不用"减 24 小时"，所以夏令时也正确。
 */

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

function localParts(ms: number, timeZone: string): Parts {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  const parts = f.formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute'), second: get('second') };
}

/** 把墙钟时间当作 UTC 解释，仅用于日历算术。 */
const wallAsUtc = (p: Partial<Parts> & Pick<Parts, 'year' | 'month' | 'day'>) =>
  Date.UTC(p.year, p.month - 1, p.day, p.hour ?? 0, p.minute ?? 0, p.second ?? 0);

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function parseDayKey(key: string) {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

export function addDaysToKey(key: string, days: number): string {
  const d = new Date(wallAsUtc(parseDayKey(key)) + days * 86_400_000);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function learningDayKey(ms: number, timeZone: string, boundaryHour = 4): string {
  const p = localParts(ms, timeZone);
  const key = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  return p.hour < boundaryHour ? addDaysToKey(key, -1) : key;
}

/** 当地 (日期, 小时) → UTC 毫秒。迭代修正时区偏移。 */
export function zonedWallToMs(key: string, hour: number, timeZone: string): number {
  const target = wallAsUtc({ ...parseDayKey(key), hour });
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const diff = target - wallAsUtc(localParts(guess, timeZone));
    if (diff === 0) break;
    guess += diff;
  }
  return guess;
}

/** 学习日的开始（含）和结束（不含），UTC 毫秒。 */
export function learningDayBounds(key: string, timeZone: string, boundaryHour = 4) {
  return {
    startMs: zonedWallToMs(key, boundaryHour, timeZone),
    endMs: zonedWallToMs(addDaysToKey(key, 1), boundaryHour, timeZone),
  };
}
