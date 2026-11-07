import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { getToday, type Today } from '../../application/study';
import styles from './TodayPage.module.css';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function TodayPage() {
  const { db, vocab, settings } = useApp();
  const [today, setToday] = useState<Today | null>(null);
  const [, setCrash] = useState();

  useEffect(() => {
    getToday(db, vocab.senseOrder, Date.now())
      .then(setToday)
      // 交给 ErrorBoundary：在渲染期间抛出
      .catch((e: unknown) => setCrash(() => { throw e; }));
  }, [db, vocab]);

  if (!today) return <div className="loading">加载中…</div>;

  const { queue } = today;
  const dueNow = queue.due.length;
  const newLeft = queue.newSenseIds.length;
  const finished = dueNow === 0 && newLeft === 0 && queue.laterToday === 0;
  const needBackup = settings.lastExportAtMs === null || Date.now() - settings.lastExportAtMs > WEEK_MS;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>今日</h1>

      <section className={`card ${styles.stats}`} aria-label="今日概况">
        <Stat value={dueNow} label="待复习" />
        <Stat value={newLeft} label="新词余量" />
        <Stat value={today.reviewedToday} label="今日已复习" />
      </section>
      {queue.laterToday > 0 && <p className="muted">稍后还有 {queue.laterToday} 张</p>}

      {finished ? (
        <p className={styles.done}>今天完成了 🎉</p>
      ) : (
        <Link to="/study" className={`btn primary ${styles.start}`}>开始学习</Link>
      )}

      {needBackup && (
        <Link to="/settings" className={`card ${styles.backup}`}>
          <strong>该备份了</strong>
          <span className="muted">
            {settings.lastExportAtMs === null ? '你还没有导出过学习数据。' : '距上次导出已超过 7 天。'}
            去设置里导出一份，换设备或清理浏览器数据时不会丢进度。
          </span>
        </Link>
      )}

      <p className={`muted ${styles.version}`}>词库版本 {vocab.version}</p>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.value}>{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
