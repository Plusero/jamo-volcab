import { expect, test } from '@playwright/test';

for (const easyButton of [false, true]) {
  test(`学习按钮的快捷键提示（轻松${easyButton ? '开启' : '关闭'}）`, async ({ page, isMobile }) => {
    await page.goto('./');
    if (easyButton) {
      await page.getByRole('link', { name: '设置', exact: true }).click();
      await page.getByLabel('启用「轻松」按钮').check();
      await page.getByRole('link', { name: '今日', exact: true }).click();
    }
    await page.getByRole('link', { name: '开始学习' }).click();

    const reveal = page.getByRole('button', { name: '显示答案', exact: true });
    await expect(reveal).toBeVisible();
    await expect(reveal).toHaveAttribute('aria-keyshortcuts', 'Space');
    await expect(reveal.locator('kbd')).toHaveText('空格');
    await expect(reveal.locator('kbd')).toBeVisible({ visible: !isMobile });

    const labels = easyButton ? ['忘记', '模糊', '认识', '轻松'] : ['忘记', '模糊', '认识'];
    for (const [index, label] of labels.entries()) {
      if (isMobile) await reveal.click();
      else await page.keyboard.press('Space');

      if (!easyButton) await expect(page.getByRole('button', { name: '轻松', exact: true })).toHaveCount(0);
      for (const [ratingIndex, ratingLabel] of labels.entries()) {
        const button = page.getByRole('button', { name: ratingLabel, exact: true });
        const key = String(ratingIndex + 1);
        await expect(button).toHaveAttribute('aria-keyshortcuts', key);
        await expect(button.locator('kbd')).toHaveText(key);
        await expect(button.locator('kbd')).toBeVisible({ visible: !isMobile });
      }

      if (isMobile) await page.getByRole('button', { name: label, exact: true }).click();
      else await page.keyboard.press(String(index + 1));
      await expect(reveal).toBeVisible();
    }
  });
}
