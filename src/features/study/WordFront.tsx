import type { Lexeme, Sense } from '../../domain/types';
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
  return (
    <div className={`card ${styles.front}`}>
      {isNew && <span className={styles.badge}>新词</span>}
      <div className={styles.lemma}>{displayForm(lexeme)}</div>
      <div className={styles.meta}>
        <span className="muted">{posLabel(lexeme.pos)}</span>
        <CefrBadge assessment={lexeme.cefr} />
      </div>
      <TextbookFrequency rank={lexeme.textbookFrequencyRank} />
      <SpeakButton text={spokenForm(lexeme)} voice={voice} rate={rate} label="朗读单词" />
      {!revealed && (
        <ul className={`${styles.examples} ${styles.frontExamples}`} aria-label="语境例句">
          {examples.map((ex) => (
            <li key={ex.nl} className={styles.exNl}>
              <span lang="nl">{ex.nl}</span>
              <SpeakButton text={ex.nl} voice={voice} rate={rate} label="朗读例句" small />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
