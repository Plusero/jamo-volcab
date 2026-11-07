import { useState } from 'react';
import type { Rating } from '../../domain/types';
import { safeStorage } from './display';
import styles from './StudyPage.module.css';

const GUIDE_KEY = 'ratingGuideSeen';

const BUTTONS: { rating: Rating; label: string; shortcut: string; color: string }[] = [
  { rating: 'Again', label: '忘记', shortcut: '1', color: 'var(--again)' },
  { rating: 'Hard', label: '模糊', shortcut: '2', color: 'var(--hard)' },
  { rating: 'Good', label: '认识', shortcut: '3', color: 'var(--good)' },
  { rating: 'Easy', label: '轻松', shortcut: '4', color: 'var(--easy)' },
];

type Props = {
  revealed: boolean;
  easyButton: boolean;
  busy: boolean;
  onReveal(): void;
  onRate(rating: Rating): void;
};

/** 固定在标签栏上方：揭晓前是「显示答案」，揭晓后是评分按钮。 */
export function RatingBar({ revealed, easyButton, busy, onReveal, onRate }: Props) {
  const [guideSeen, setGuideSeen] = useState(() => safeStorage.get(GUIDE_KEY) !== null);

  function dismissGuide() {
    safeStorage.set(GUIDE_KEY, '1');
    setGuideSeen(true);
  }

  if (!revealed) {
    return (
      <div className={styles.bar}>
        <button type="button" className="btn primary" aria-keyshortcuts="Space" onClick={onReveal}>
          显示答案<kbd className={styles.shortcut} aria-hidden="true">空格</kbd>
        </button>
      </div>
    );
  }
  return (
    <div className={styles.bar}>
      {!guideSeen && (
        <div className={styles.guide}>
          <span>揭晓后才觉得眼熟，请选"忘记"</span>
          <button type="button" className={styles.guideClose} aria-label="关闭提示" onClick={dismissGuide}>×</button>
        </div>
      )}
      <div className={styles.rates}>
        {BUTTONS.filter((b) => b.rating !== 'Easy' || easyButton).map((b) => (
          <button key={b.rating} type="button" className={styles.rate} style={{ color: b.color, borderColor: b.color }}
            disabled={busy} aria-keyshortcuts={b.shortcut} onClick={() => onRate(b.rating)}>
            {b.label}<kbd className={styles.shortcut} aria-hidden="true">{b.shortcut}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
