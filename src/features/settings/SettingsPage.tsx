import { useApp } from '../../app/AppContext';
import { DataSettings } from './DataSettings';
import { PrefsSettings } from './PrefsSettings';
import styles from './SettingsPage.module.css';
import { StudySettings } from './StudySettings';

export function SettingsPage() {
  const { vocab } = useApp();
  return (
    <div className={styles.page}>
      <h1>设置</h1>
      <StudySettings />
      <PrefsSettings />
      <DataSettings />
      <section className="card">
        <h2>关于</h2>
        <div>词库版本：{vocab.version}</div>
        <div>应用版本：{__APP_VERSION__}</div>
        <div className="muted">词库来源：NT2Lex（CC BY-NC-SA 4.0）</div>
      </section>
    </div>
  );
}
