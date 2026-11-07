import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** 计划 §10 的主流程：学一张卡 → 刷新 → 导出 → 清空后导入。 */
test('学习、刷新、导出、导入', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: '开始学习' }).click();

  await page.getByRole('button', { name: '显示答案' }).click();
  await page.getByRole('button', { name: '认识' }).click();
  await expect(page.getByRole('button', { name: '显示答案' })).toBeVisible();

  await page.reload();
  await page.getByRole('link', { name: '今日', exact: true }).click();
  const reviewed = page.getByLabel('今日概况');
  await expect(reviewed).toContainText('1今日已复习');

  await page.getByRole('link', { name: '设置', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份' }).click();
  const backupPath = await (await download).path();
  const backup = readFileSync(backupPath, 'utf8');
  expect(JSON.parse(backup).data.reviewLogs).toHaveLength(1);

  // 在清空的数据库上导入，进度应恢复
  await page.evaluate(() => new Promise((resolve) => {
    indexedDB.deleteDatabase('dutch-vocab-local').onsuccess = resolve;
  }));
  await page.reload();
  await page.getByRole('link', { name: '设置', exact: true }).click();
  page.once('dialog', (d) => d.accept());
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await page.waitForLoadState('load');
  await page.getByRole('link', { name: '今日', exact: true }).click();
  await expect(page.getByLabel('今日概况')).toContainText('1今日已复习');
});
