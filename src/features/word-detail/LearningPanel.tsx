import { useCallback, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { getNote, updateNote } from '../../application/notes';
import { setSuspended } from '../../application/study';
import { formatDateTime } from '../shared/word';
import { useAsync } from '../../app/useAsync';
import styles from './WordDetailPage.module.css';

/** 学习状态、暂停/恢复、备注和收藏。 */
export function LearningPanel({ senseId }: { senseId: string }) {
  const { db } = useApp();
  const load = useCallback(async () => ({
    card: await db.cards.get(senseId),
    reviews: await db.reviewLogs.where('senseId').equals(senseId).count(),
    note: await getNote(db, senseId),
  }), [db, senseId]);
  const [data, reload] = useAsync(load);
  const [draft, setDraft] = useState<string | null>(null);
  if (!data) return null;
  const { card, reviews, note } = data;

  return (
    <section className="card">
      <h2>学习状态</h2>
      <div>
        {card
          ? <>下次复习：{formatDateTime(card.dueAtMs)}{card.suspended && '（已暂停）'}</>
          : '未学'}
      </div>
      <div className="muted">复习次数：{reviews}</div>
      <div className="row" style={{ margin: '8px 0' }}>
        <button
          className="btn"
          onClick={async () => { await setSuspended(db, senseId, !card?.suspended, Date.now()); reload(); }}
        >
          {card?.suspended ? '恢复' : '暂停'}
        </button>
        <button
          className="btn"
          aria-pressed={note.starred}
          onClick={async () => { await updateNote(db, senseId, { starred: !note.starred }); reload(); }}
        >
          {note.starred ? '★ 已收藏' : '☆ 收藏'}
        </button>
      </div>
      <textarea
        className={styles.note}
        aria-label="备注"
        placeholder="备注"
        value={draft ?? note.text}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={async () => {
          if (draft === null || draft === note.text) return;
          await updateNote(db, senseId, { text: draft });
          setDraft(null);
          reload();
        }}
      />
    </section>
  );
}
