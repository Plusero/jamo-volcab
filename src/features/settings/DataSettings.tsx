import { useRef } from 'react';
import { useApp } from '../../app/AppContext';
import { exportBackup, parseBackup, restoreBackup } from '../../application/backup';
import { shareOrDownload } from '../../platform/files';
import { formatDateTime } from '../shared/word';
import styles from './SettingsPage.module.css';

export function DataSettings() {
  const { db, settings, updateSettings } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);

  async function doExport() {
    const now = Date.now();
    const { fileName, json } = await exportBackup(db, now);
    await shareOrDownload(fileName, json);
    await updateSettings({ lastExportAtMs: now }); // 刷新界面状态；exportBackup 已写入数据库
  }

  async function doImport(file: File) {
    const backup = parseBackup(await file.text()); // 不合法会抛错，进入全局错误页
    const ok = confirm(
      `备份时间：${formatDateTime(Date.parse(backup.createdAt))}\n`
      + `卡片 ${backup.data.cards.length} 张，复习记录 ${backup.data.reviewLogs.length} 条\n\n`
      + '将覆盖本机所有学习数据',
    );
    if (!ok) return;
    await restoreBackup(db, backup);
    location.reload();
  }

  return (
    <section className="card">
      <h2>数据</h2>
      <div className={`muted ${styles.dataHelp}`}>
        <p>学习进度、备注和设置会自动保存在当前设备的当前浏览器中，不会上传云端，也不会在不同设备或浏览器间自动同步。</p>
        <p>换设备或浏览器时，请先在原浏览器中「导出备份」，将备份文件传到新设备，再在新浏览器中「导入备份」。导入会覆盖当前浏览器的全部学习数据，不会合并两边的进度。</p>
        <p>请定期导出备份。清除网站数据可能导致记录丢失；无痕模式下的记录在关闭窗口后可能被清除。</p>
      </div>
      <p className="muted" style={{ margin: '0 0 8px' }}>
        上次导出：{settings.lastExportAtMs === null ? '从未' : formatDateTime(settings.lastExportAtMs)}
      </p>
      <div className="row">
        <button className="btn primary" onClick={doExport}>导出备份</button>
        <button className="btn" onClick={() => fileInput.current?.click()}>导入备份</button>
        <input
          ref={fileInput} className={styles.hidden} type="file" accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // 允许再次选择同一文件
            if (file) await doImport(file);
          }}
        />
      </div>
    </section>
  );
}
