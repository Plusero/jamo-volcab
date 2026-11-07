import type { Lexeme, Sense } from '../../domain/types';
import { useSpeak } from '../../platform/speech';
import { displayForm, posLabel, spokenForm } from '../shared/word';
import { TextbookFrequency } from '../shared/TextbookFrequency';
import { CefrBadge } from '../shared/CefrBadge';
import { SpeakButton } from './SpeakButton';
import styles from './StudyPage.module.css';

type Props = {
  lexeme: Lexeme;
  examples: Sense['examples'];
  revealed: boolean;
  isNew: boolean;
  voice: SpeechSynthesisVoice | null;
  rate: 'normal' | 'slow';
};

export function WordFront({ lexeme, examples, revealed, isNew, voice, rate }: Props) {
  const { play, error } = useSpeak();
  return (
    <div className={`card ${styles.front}`}>
      {isNew && <span className={styles.badge}>新词</span>}
      <div className={styles.lemma}>{displayForm(lexeme)}</div>
      <div className={styles.meta}>
        <span className="muted">{posLabel(lexeme.pos)}</span>
        <CefrBadge assessment={lexeme.cefr} />
      </div>
      <TextbookFrequency rank={lexeme.textbookFrequencyRank} />
      {voice && <SpeakButton onClick={() => play(spokenForm(lexeme), voice, rate)} label="朗读单词" />}
      <ul className={`${styles.examples} ${styles.frontExamples}`} aria-label="语境例句">
        {examples.map((ex) => (
          <li key={ex.nl}>
            <div className={styles.exNl}>
              <span lang="nl">{ex.nl}</span>
              {voice && <SpeakButton onClick={() => play(ex.nl, voice, rate)} label="朗读例句" small />}
            </div>
            {revealed && (
              <div className={styles.reveal}>
                <div className={styles.revealContent}><div className="muted">{ex.zh}</div></div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
