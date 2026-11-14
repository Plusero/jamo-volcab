import type { Settings } from '../domain/types';

export const THEME_STORAGE_KEY = 'dutch-vocab-theme';

/** IndexedDB 保存设置；localStorage 仅缓存主题，供 HTML 在首次绘制前读取。 */
export function applyTheme(theme: Settings['theme']): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content = theme === 'system' ? 'light dark' : theme;

  try {
    if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 与学习提示一样，主题缓存允许在 localStorage 被禁用时跳过；设置仍保存在 IndexedDB。
  }
}
