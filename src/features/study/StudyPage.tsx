import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { getToday, rate, setSuspended, undoLast } from '../../application/study';
import type { Rating } from '../../domain/types';
import { useDutchVoice } from '../../platform/speech';
import { ratingForKey } from './display';
import { RatingBar } from './RatingBar';
import { WordBack } from './WordBack';
import { WordFront } from './WordFront';
import styles from './StudyPage.module.css';

type View = {
  current: { senseId: string; isNew: boolean } | null;
  revealed: boolean;
  skipped: Set<string>;
  reviewLeft: number;
  newLeft: number;
  reviewedToday: number;
  newLearned: number;
  reviewsCompleted: number;
  laterToday: number;
  nextLaterAtMs: number | null;
};

export function StudyPage() {
  const { db, vocab, settings } = useApp();
  const voice = useDutchVoice(settings.speechVoiceURI);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoable, setUndoable] = useState(0); // 本页面会话里已评分、还可以撤销的次数
  const busyRef = useRef(false);
  const earlyPracticeIds = useRef(new Set<string>());
  const [, setCrash] = useState();

  /** 重新计算今日队列并选出下一张；`showSenseId` 用于撤销后重新展示那张卡。 */
  async function refresh(skipped: Set<string>, showSenseId?: string, practiceEarly = false) {
    const { queue, reviewedToday, newIntroduced, reviewsCompletedToday } = await getToday(db, vocab.senseOrder, Date.now());
    if (practiceEarly) {
      earlyPracticeIds.current = new Set(queue.laterSenseIds);
      skipped = new Set([...skipped].filter((id) => !earlyPracticeIds.current.has(id)));
    }
    const ids = [
      ...queue.due.map((c) => c.senseId),
      ...queue.laterSenseIds.filter((id) => earlyPracticeIds.current.has(id)),
      ...queue.newSenseIds,
    ];
    const senseId = showSenseId ?? ids.find((id) => !skipped.has(id));
    setView({
      current: senseId === undefined ? null : { senseId, isNew: queue.newSenseIds.includes(senseId) },
      revealed: showSenseId !== undefined,
      skipped,
      reviewLeft: queue.due.length + queue.laterToday,
      newLeft: queue.newSenseIds.length,
      reviewedToday,
      newLearned: newIntroduced,
      reviewsCompleted: reviewsCompletedToday,
      laterToday: queue.laterToday,
      nextLaterAtMs: queue.nextLaterAtMs,
    });
  }

  /** 事件处理里的异步操作：出错交给 ErrorBoundary；执行期间忽略重复触发。 */
  function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    action()
      .catch((e: unknown) => setCrash(() => { throw e; }))
      .finally(() => { busyRef.current = false; setBusy(false); });
  }

  useEffect(() => {
    refresh(new Set()).catch((e: unknown) => setCrash(() => { throw e; }));
  }, []);

  const current = view?.current ?? null;
  const reveal = () => setView((v) => v && { ...v, revealed: true });
  const onRate = (rating: Rating) => run(async () => {
    await rate(db, current!.senseId, rating, Date.now());
    // 提前练习每张卡一遍；评分后再次进入等待的卡，需要主动开启下一轮。
    earlyPracticeIds.current.delete(current!.senseId);
    setUndoable((n) => n + 1);
    await refresh(view!.skipped);
  });
  const onUndo = () => run(async () => {
    const senseId = await undoLast(db);
    setUndoable((n) => n - 1);
    const skipped = new Set(view!.skipped);
    skipped.delete(senseId);
    await refresh(skipped, senseId);
  });
  const onSkip = () => run(() => refresh(new Set(view!.skipped).add(current!.senseId)));
  const onPracticeEarly = () => run(() => refresh(view!.skipped, undefined, true));
  const onSuspend = () => run(async () => {
    await setSuspended(db, current!.senseId, true, Date.now());
    await refresh(view!.skipped);
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!view?.current || busyRef.current) return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const target = e.target as Element;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === ' ' && !view.revealed) {
        if (target.closest('button, a')) return; // 让焦点所在的按钮自己响应空格
        e.preventDefault();
        reveal();
      } else if (view.revealed) {
        const rating = ratingForKey(e.key, settings.easyButton);
        if (rating) onRate(rating);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!view) return <div className="loading">加载中…</div>;

  const progress = (
    <section className={`card ${styles.progress}`} aria-label="今日学习进度" aria-live="polite" aria-atomic="true"
      title={`今日已作答 ${view.reviewedToday} 次`}>
      <StudyProgress label="新词" completed={view.newLearned} remaining={view.newLeft} className={styles.newProgress} />
      <StudyProgress label="复习" completed={view.reviewsCompleted} remaining={view.reviewLeft}
        laterToday={view.laterToday} className={styles.reviewProgress} />
    </section>
  );

  if (!current) {
    return (
      <div className={styles.page}>
        {progress}
        <div className={`card ${styles.finished}`}>
          <h1>本轮完成</h1>
          {view.laterToday > 0 && view.nextLaterAtMs !== null && (
            <p className="muted">稍后还有 {view.laterToday} 张（约 {formatTime(view.nextLaterAtMs, settings.timeZone)}）</p>
          )}
          <Link to="/" className="btn primary">回到今日</Link>
          {view.laterToday > 0 && (
            <button type="button" className="btn" disabled={busy} onClick={onPracticeEarly}>
              提前练习这 {view.laterToday} 张
            </button>
          )}
          {undoable > 0 && <button type="button" className="btn" disabled={busy} onClick={onUndo}>撤销</button>}
        </div>
      </div>
    );
  }

  const sense = vocab.senseById.get(current.senseId)!;
  const lexeme = vocab.lexemeById.get(sense.lexemeId)!;

  return (
    <div className={styles.page}>
      {progress}
      <WordFront key={`front:${sense.id}`} lexeme={lexeme} examples={sense.examples} revealed={view.revealed}
        isNew={current.isNew} voice={voice} rate={settings.speechRate} speechMode={settings.speechMode} />
      {view.revealed && (
        <section key={`answer:${sense.id}`} className={`${styles.reveal} ${styles.answerReveal}`} aria-label="答案">
          <div className={styles.revealContent}>
            <WordBack sense={sense} lexeme={lexeme} />
          </div>
        </section>
      )}

      <div className="row">
        <button type="button" className="btn" disabled={busy || undoable === 0} onClick={onUndo}>撤销</button>
        <button type="button" className="btn" disabled={busy} onClick={onSkip}>跳过</button>
        <button type="button" className="btn" disabled={busy} onClick={onSuspend}>暂停</button>
        <Link to={`/word/${sense.id}`} className={`btn ${styles.detail}`}>详情</Link>
      </div>

      <RatingBar revealed={view.revealed} easyButton={settings.easyButton} busy={busy}
        onReveal={reveal} onRate={onRate} />
    </div>
  );
}

function StudyProgress({ label, completed, remaining, laterToday = 0, className }: {
  label: string; completed: number; remaining: number; laterToday?: number; className: string;
}) {
  const total = completed + remaining;
  const percent = total === 0 ? 100 : Math.floor(completed / total * 100);
  return (
    <div role="group" aria-label={label} className={`${styles.progressGroup} ${className}`}
      title={`已完成 ${completed} / ${total} 个`}>
      <strong>{label}</strong>
      <progress className={styles.progressBar} value={total === 0 ? 1 : completed} max={total || 1}
        aria-label={`${label}进度`} aria-valuetext={`已完成 ${completed} / ${total} 个，剩余 ${remaining} 个，${percent}%`} />
      <span className={styles.progressPercent}>{percent}%</span>
      <span className={styles.progressRemaining}>剩余 {remaining}{laterToday > 0 && <span>（稍后 {laterToday}）</span>}</span>
    </div>
  );
}

function formatTime(ms: number, timeZone: string): string {
  return new Date(ms).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
}
