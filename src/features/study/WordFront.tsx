import type { Lexeme } from '../../domain/types';
import { displayForm, posLabel, spokenForm } from '../shared/word';
import { SpeakButton } from './SpeakButton';
import styles from './StudyPage.module.css';

type Props = {
  lexeme: Lexeme;
  isNew: boolean;
  voice: SpeechSynthesisVoice | null;
  rate: 'normal' | 'slow';
};

export function WordFront({ lexeme, isNew, voice, rate }: Props) {
  return (
    <div className={`card ${styles.front}`}>
      {isNew && <span className={styles.badge}>新词</span>}
      <div className={styles.lemma}>{displayForm(lexeme)}</div>
      <div className="muted">{posLabel(lexeme.pos)}</div>
      <SpeakButton text={spokenForm(lexeme)} voice={voice} rate={rate} label="朗读单词" />
    </div>
  );
}
