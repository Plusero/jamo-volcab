import { useApp } from '../../app/AppContext';
import type { Settings } from '../../domain/types';
import { useDutchVoice, useSpeak } from '../../platform/speech';
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
  const { play, error, status } = useSpeak();
  return (
    <>
      <section className="card">
        <h2>发音</h2>
        <Radios name="rate" options={RATES} value={settings.speechRate} onChange={(speechRate) => updateSettings({ speechRate })} />
        <div className="muted">{voice ? `语音：${voice.name}` : '未找到荷兰语语音'}</div>
        {voice && (
          <>
            <div className={styles.choices}>
              <button type="button" className="btn" onClick={() => play('Goedemorgen! Hoe gaat het met je?', voice, settings.speechRate)}>试听 {voice.name}</button>
              <button type="button" className="btn" onClick={() => play('Goedemorgen! Hoe gaat het met je?', null, settings.speechRate)}>试听系统默认荷兰语</button>
            </div>
            <p className="muted">能看到语音名称不代表一定能播放。若没有声音，请在设备的语音设置中下载荷兰语语音，并先试听确认。</p>
          </>
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className="muted" role="status">{status}</div>
      </section>
      <section className="card">
        <h2>外观</h2>
        <Radios name="theme" options={THEMES} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
      </section>
    </>
  );
}
