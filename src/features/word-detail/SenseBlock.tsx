import type { Sense } from '../../domain/types';
import { useDutchVoice, useSpeak } from '../../platform/speech';
import { useApp } from '../../app/AppContext';
import styles from './WordDetailPage.module.css';

/** 一个词义：中文义、例句（带发音）、搭配、主题、等级和审校状态。 */
export function SenseBlock({ sense, current }: { sense: Sense; current: boolean }) {
  const voice = useDutchVoice();
  const { play, error } = useSpeak();
  const { settings, vocab } = useApp();
  const cefr = vocab.lexemeById.get(sense.lexemeId)?.cefr;
  return (
    <section className={`card ${styles.sense} ${current ? styles.current : ''}`}>
      <div className={styles.zh}>{sense.zh}</div>
      <ul className={styles.examples}>
        {sense.examples.map((ex) => (
          <li key={ex.nl} className={styles.example}>
            {voice && (
              <button type="button" className="btn" aria-label="播放例句" onClick={() => play(ex.nl, voice, settings.speechRate)}>🔊</button>
            )}
            <div className={styles.exampleText}>
              <div>{ex.nl}</div>
              <div className="muted">{ex.zh}</div>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
      {sense.collocations && sense.collocations.length > 0 && (
        <div><span className="muted">搭配：</span>{sense.collocations.join('；')}</div>
      )}
      <div className={styles.tags}>
        {sense.topics.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
        <span className={styles.tag}>{sense.level}</span>
        {cefr?.review_status === 'needs_review' && (
          <span className={`${styles.tag} ${styles.draft}`}>等级待复核（建议 {cefr.suggested_level}，未采用）</span>
        )}
        {cefr?.review_status === 'insufficient_evidence' && (
          <span className={`${styles.tag} ${styles.draft}`}>等级证据不足</span>
        )}
        {sense.review === 'draft' && <span className={`${styles.tag} ${styles.draft}`}>草稿</span>}
      </div>
    </section>
  );
}
