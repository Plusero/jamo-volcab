import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import styles from './SettingsPage.module.css';

function NumberField({ label, value, onSave }: { label: string; value: number; onSave(v: number): void }) {
  const [text, setText] = useState(String(value));
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number" inputMode="numeric" min={0} step={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text);
          if (text.trim() !== '' && Number.isInteger(n) && n >= 0) onSave(n);
          else setText(String(value));
        }}
      />
    </label>
  );
}

export function StudySettings() {
  const { settings, updateSettings } = useApp();
  const [tz, setTz] = useState(settings.timeZone);
  const [tzInvalid, setTzInvalid] = useState(false);

  return (
    <section className="card">
      <h2>学习</h2>
      <NumberField label="每日目标" value={settings.dailyTarget} onSave={(dailyTarget) => updateSettings({ dailyTarget })} />
      <NumberField label="新词上限" value={settings.newLimit} onSave={(newLimit) => updateSettings({ newLimit })} />
      <label className={styles.field}>
        <span>时区</span>
        <input
          type="text" value={tz} autoCapitalize="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => {
            const v = e.target.value;
            setTz(v);
            const ok = Intl.supportedValuesOf('timeZone').includes(v);
            setTzInvalid(!ok);
            if (ok) void updateSettings({ timeZone: v });
          }}
        />
      </label>
      {tzInvalid && <p className={styles.error}>无效时区</p>}
      <label className={styles.field}>
        <span>启用「轻松」按钮</span>
        <input
          className={styles.check} type="checkbox" checked={settings.easyButton}
          onChange={(e) => updateSettings({ easyButton: e.target.checked })}
        />
      </label>
    </section>
  );
}
