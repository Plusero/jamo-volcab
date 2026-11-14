import { useId, useState } from 'react';
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

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

export function StudySettings() {
  const { settings, updateSettings } = useApp();
  const [tz, setTz] = useState(settings.timeZone);
  const [tzInvalid, setTzInvalid] = useState(false);
  const tzErrorId = useId();

  return (
    <section className="card">
      <h2>学习</h2>
      <NumberField label="每日目标" value={settings.dailyTarget} onSave={(dailyTarget) => updateSettings({ dailyTarget })} />
      <NumberField label="新词上限" value={settings.newLimit} onSave={(newLimit) => updateSettings({ newLimit })} />
      <label className={styles.field}>
        <span>时区</span>
        <input
          type="text" value={tz} autoCapitalize="off" autoCorrect="off" spellCheck={false}
          aria-invalid={tzInvalid} aria-describedby={tzInvalid ? tzErrorId : undefined}
          onChange={(e) => {
            const v = e.target.value;
            setTz(v);
            if (tzInvalid && isTimeZone(v.trim())) setTzInvalid(false);
          }}
          onBlur={() => {
            const v = tz.trim();
            const ok = isTimeZone(v);
            setTzInvalid(!ok);
            if (ok) {
              setTz(v);
              if (v !== settings.timeZone) void updateSettings({ timeZone: v });
            }
          }}
        />
      </label>
      <p id={tzErrorId} className={styles.error} aria-live="polite">
        {tzInvalid ? '无效时区。请输入 Europe/Amsterdam 或 UTC 等有效时区。' : ''}
      </p>
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
