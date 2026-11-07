import { useApp } from '../../app/AppContext';
import type { Settings } from '../../domain/types';
import { useDutchVoice } from '../../platform/speech';
import styles from './SettingsPage.module.css';

const RATES: [Settings['speechRate'], string][] = [['normal', '正常'], ['slow', '慢速']];
const THEMES: [Settings['theme'], string][] = [['system', '跟随系统'], ['light', '浅色'], ['dark', '深色']];

function Radios<T extends string>({ name, options, value, onChange }: {
  name: string; options: [T, string][]; value: T; onChange(v: T): void;
}) {
  return (
    <div className={styles.choices}>
      {options.map(([v, label]) => (
        <label key={v} className={styles.choice}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          {label}
        </label>
      ))}
    </div>
  );
}

export function PrefsSettings() {
  const { settings, updateSettings } = useApp();
  const voice = useDutchVoice();
  return (
    <>
      <section className="card">
        <h2>发音</h2>
        <Radios name="rate" options={RATES} value={settings.speechRate} onChange={(speechRate) => updateSettings({ speechRate })} />
        <div className="muted">{voice ? `语音：${voice.name}` : '未找到荷兰语语音'}</div>
      </section>
      <section className="card">
        <h2>外观</h2>
        <Radios name="theme" options={THEMES} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
      </section>
    </>
  );
}
