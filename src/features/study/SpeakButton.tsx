import { speak } from '../../platform/speech';
import styles from './StudyPage.module.css';

type Props = {
  text: string;
  voice: SpeechSynthesisVoice | null;
  rate: 'normal' | 'slow';
  label?: string;
  small?: boolean;
};

/** 没有荷兰语语音时不渲染。 */
export function SpeakButton({ text, voice, rate, label = '朗读', small }: Props) {
  if (!voice) return null;
  return (
    <button type="button" className={small ? styles.speakSmall : styles.speak} aria-label={label}
      onClick={() => speak(text, voice, rate)}>
      🔊
    </button>
  );
}
