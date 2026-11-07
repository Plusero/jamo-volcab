import type { Rating } from '../../domain/types';

/** localStorage 可能被禁用（隐私模式），这里是唯一允许 try/catch 的地方。 */
export const safeStorage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* 存储不可用时忽略 */ }
  },
};

/** 快捷键 → 评分（轻松键只在开启时有效）。 */
export function ratingForKey(key: string, easyButton: boolean): Rating | null {
  const map: Record<string, Rating> = { '1': 'Again', '2': 'Hard', '3': 'Good', '4': 'Easy' };
  const r = map[key];
  return r && (r !== 'Easy' || easyButton) ? r : null;
}
