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
  laterToday: number;
  nextLaterAtMs: number | null;
};

export function StudyPage() {
  const { db, vocab, settings } = useApp();
  const voice = useDutchVoice();
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoable, setUndoable] = useState(0); // 本页面会话里已评分、还可以撤销的次数
  const busyRef = useRef(false);
  const [, setCrash] = useState();

  /** 重新计算今日队列并选出下一张；`showSenseId` 用于撤销后重新展示那张卡。 */
  async function refresh(skipped: Set<string>, showSenseId?: string) {
    const { queue } = await getToday(db, vocab.senseOrder, Date.now());
    const ids = [...queue.due.map((c) => c.senseId), ...queue.newSenseIds];
    const senseId = showSenseId ?? ids.find((id) => !skipped.has(id));
    setView({
      current: senseId === undefined ? null : { senseId, isNew: queue.newSenseIds.includes(senseId) },
      revealed: showSenseId !== undefined,
      skipped,
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

  if (!current) {
    return (
      <div className={styles.page}>
        <div className={`card ${styles.finished}`}>
          <h1>本轮完成</h1>
          {view.laterToday > 0 && view.nextLaterAtMs !== null && (
            <p className="muted">稍后还有 {view.laterToday} 张（约 {formatTime(view.nextLaterAtMs, settings.timeZone)}）</p>
          )}
          <Link to="/" className="btn primary">回到今日</Link>
          {undoable > 0 && <button type="button" className="btn" disabled={busy} onClick={onUndo}>撤销</button>}
        </div>
      </div>
    );
  }

  const sense = vocab.senseById.get(current.senseId)!;
  const lexeme = vocab.lexemeById.get(sense.lexemeId)!;

  return (
    <div className={styles.page}>
      <WordFront lexeme={lexeme} examples={sense.examples} revealed={view.revealed}
        isNew={current.isNew} voice={voice} rate={settings.speechRate} />
      {view.revealed && <WordBack key={sense.id} sense={sense} lexeme={lexeme} voice={voice} rate={settings.speechRate} />}

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

function formatTime(ms: number, timeZone: string): string {
  return new Date(ms).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
}
