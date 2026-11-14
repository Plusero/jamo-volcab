// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { applyTheme, THEME_STORAGE_KEY } from '../../src/platform/theme';

const html = readFileSync('index.html', 'utf8');
const bootstrap = new Function('document', 'localStorage', html.match(/<script>([\s\S]*?)<\/script>/)![1]);

beforeEach(() => {
  document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

it.each(['light', 'dark'] as const)('HTML 启动脚本在应用加载前恢复 %s 主题', (theme) => {
  applyTheme(theme);
  delete document.documentElement.dataset.theme;
  document.querySelector('meta')!.content = 'light dark';
  bootstrap(document, localStorage);
  expect(document.documentElement.dataset.theme).toBe(theme);
  expect(document.querySelector('meta')!.content).toBe(theme);
});

it('切回跟随系统时清除主题缓存及覆盖', () => {
  applyTheme('dark');
  applyTheme('system');
  bootstrap(document, localStorage);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  expect(document.documentElement.dataset.theme).toBeUndefined();
  expect(document.querySelector('meta')!.content).toBe('light dark');
});

it('本地缓存不可用时仍应用当前主题', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
  applyTheme('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.querySelector('meta')!.content).toBe('dark');
});
