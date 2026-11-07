import styles from './StudyPage.module.css';

type Props = {
  onClick: () => void;
  label?: string;
  small?: boolean;
};

export function SpeakButton({ onClick, label = '朗读', small }: Props) {
  return (
    <button type="button" className={small ? styles.speakSmall : styles.speak} aria-label={label}
      onClick={onClick}>
      🔊
    </button>
  );
}
