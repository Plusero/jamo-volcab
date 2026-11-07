import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

/** 有新版本时在底部标签栏上方提示；用户点「更新」才切换到新的 Service Worker。 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className={styles.banner} role="status">
      <span>有新版本</span>
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={() => setNeedRefresh(false)}>
          稍后
        </button>
        <button type="button" className="btn primary" onClick={() => void updateServiceWorker(true)}>
          更新
        </button>
      </div>
    </div>
  );
}
