import { useCallback } from 'react';
import { useApp } from '../../app/AppContext';
import { addDaysToKey, learningDayKey } from '../../domain/learning-day';
import { useAsync } from '../../app/useAsync';
import styles from './StatisticsPage.module.css';

const HISTORY_DAYS = 14;
const FORECAST_DAYS = 7;

/** MM-DD */
const shortDay = (key: string) => key.slice(5);

export function StatisticsPage() {
  const { db, settings } = useApp();
  const { timeZone, dayBoundaryHour } = settings;
  const load = useCallback(async () => ({
    cards: await db.cards.toArray(),
    logs: await db.reviewLogs.toArray(),
  }), [db]);
  const [data] = useAsync(load);
  if (!data) return null;
  const { cards, logs } = data;
  if (logs.length === 0 && cards.length === 0) return <p className="muted">还没有学习记录</p>;

  const dayOf = (ms: number) => learningDayKey(ms, timeZone, dayBoundaryHour);
  const today = dayOf(Date.now());

  const perDay = new Map<string, { fresh: number; reviews: number }>();
  for (const l of logs) {
    const key = dayOf(l.reviewedAtMs);
    const d = perDay.get(key) ?? { fresh: 0, reviews: 0 };
    d.reviews++;
    if (l.before === null) d.fresh++;
    perDay.set(key, d);
  }
  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const key = addDaysToKey(today, i - (HISTORY_DAYS - 1));
    return { key, ...(perDay.get(key) ?? { fresh: 0, reviews: 0 }) };
  });
  const maxReviews = Math.max(1, ...history.map((d) => d.reviews));

  const active = cards.filter((c) => !c.suspended);
  const forecast = Array.from({ length: FORECAST_DAYS }, (_, i) => ({ key: addDaysToKey(today, i), count: 0 }));
  for (const c of active) {
    // 今天及更早（过期）计入今天；超出预测范围的忽略
    const key = dayOf(c.dueAtMs);
    const slot = key <= today ? forecast[0] : forecast.find((f) => f.key === key);
    if (slot) slot.count++;
  }
  const maxForecast = Math.max(1, ...forecast.map((f) => f.count));

  return (
    <div className={styles.page}>
      <h1>统计</h1>
      <section className={`card ${styles.totals}`}>
        <div><div className={styles.num}>{active.length}</div><div className="muted">学习中</div></div>
        <div><div className={styles.num}>{cards.length - active.length}</div><div className="muted">已暂停</div></div>
        <div><div className={styles.num}>{logs.length}</div><div className="muted">总复习</div></div>
      </section>

      <section className="card">
        <h2>最近 {HISTORY_DAYS} 天</h2>
        <div className={styles.legend}><span>橙：新词</span><span>蓝：复习</span></div>
        <ul className={styles.bars}>
          {history.map((d) => (
            <li key={d.key} className={styles.bar}>
              <span>{shortDay(d.key)}</span>
              <span className={styles.track}>
                <span className={styles.fresh} style={{ width: `${(d.fresh / maxReviews) * 100}%` }} />
                <span className={styles.reviews} style={{ width: `${((d.reviews - d.fresh) / maxReviews) * 100}%` }} />
              </span>
              <span className={styles.counts}>{d.fresh} / {d.reviews}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>未来 {FORECAST_DAYS} 天到期</h2>
        <ul className={styles.bars}>
          {forecast.map((f, i) => (
            <li key={f.key} className={styles.bar}>
              <span>{i === 0 ? '今天' : shortDay(f.key)}</span>
              <span className={styles.track}>
                <span className={styles.forecast} style={{ width: `${(f.count / maxForecast) * 100}%` }} />
              </span>
              <span className={styles.counts}>{f.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
