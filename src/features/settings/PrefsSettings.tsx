import { useApp } from '../../app/AppContext';
import type { Settings } from '../../domain/types';
import { pickDutchVoice, useDutchVoices, useSpeak } from '../../platform/speech';
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
  const voices = useDutchVoices();
  const voice = pickDutchVoice(voices, settings.speechVoiceURI);
  const { play, error, status } = useSpeak();
  return (
    <>
      <section className="card">
        <h2>发音</h2>
        <Radios name="rate" options={RATES} value={settings.speechRate} onChange={(speechRate) => updateSettings({ speechRate })} />
        <label className={styles.field}>
          朗读语音
          <select className={styles.voiceSelect} value={voices.some((v) => v.voiceURI === settings.speechVoiceURI) ? settings.speechVoiceURI ?? '' : ''}
            onChange={(event) => updateSettings({ speechVoiceURI: event.target.value || null })}>
            <option value="">自动选择</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}（{v.lang}）</option>)}
          </select>
        </label>
        <div className="muted">{voice ? `语音：${voice.name}` : '未找到荷兰语语音'}</div>
        {voice && (
          <>
            <div className={styles.choices}>
              <button type="button" className="btn" onClick={() => play('Goedemorgen! Hoe gaat het met je?', voice, settings.speechRate)}>试听 {voice.name}</button>
              <button type="button" className="btn" onClick={() => play('Goedemorgen! Hoe gaat het met je?', null, settings.speechRate)}>试听系统默认荷兰语</button>
            </div>
            <p className="muted">若当前语音无声，可选择列表中的其他荷兰语语音试听。选择会保存，并用于单词和例句朗读。</p>
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
