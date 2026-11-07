import type { AppDb } from '../data/db';
import { BackupFile } from '../domain/types';
import { saveSettings } from './settings';

/** 导出全部用户数据。词库随应用发布，不进备份。 */
export async function exportBackup(db: AppDb, nowMs: number): Promise<{ fileName: string; json: string }> {
  const data = await db.transaction('r', db.userTables, async () => ({
    cards: await db.cards.toArray(),
    reviewLogs: await db.reviewLogs.toArray(),
    dayPlans: await db.dayPlans.toArray(),
    notes: await db.notes.toArray(),
    settings: (await db.settings.get('main')) ?? null,
  }));
  const createdAt = new Date(nowMs).toISOString();
  const file: BackupFile = { format: 'dutch-vocab-backup', formatVersion: 1, createdAt, data };
  await saveSettings(db, { lastExportAtMs: nowMs });
  return {
    fileName: `dutch-vocab-backup-${createdAt.replace(/[-:]|\.\d+/g, '')}.json`,
    json: JSON.stringify(file),
  };
}

/** 解析并校验备份文件；不合法直接抛错。界面拿结果展示确认框。 */
export function parseBackup(text: string): BackupFile {
  return BackupFile.parse(JSON.parse(text));
}

/** 用备份整体替换本机数据。在同一个事务里完成，失败时原有数据不变。 */
export async function restoreBackup(db: AppDb, file: BackupFile): Promise<void> {
  const { cards, reviewLogs, dayPlans, notes, settings } = file.data;
  await db.transaction('rw', db.userTables, async () => {
    await Promise.all(db.userTables.map((t) => t.clear()));
    await db.cards.bulkAdd(cards);
    await db.reviewLogs.bulkAdd(reviewLogs);
    await db.dayPlans.bulkAdd(dayPlans);
    await db.notes.bulkAdd(notes);
    if (settings) await db.settings.put(settings, 'main');
  });
}
