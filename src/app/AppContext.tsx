import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppDb } from '../data/db';
import { loadSettings, saveSettings } from '../application/settings';
import { loadVocab, type VocabIndex } from '../application/vocab';
import type { Settings } from '../domain/types';
import { applyTheme, THEME_STORAGE_KEY } from '../platform/theme';

export type AppState = {
  db: AppDb;
  vocab: VocabIndex;
  settings: Settings;
  updateSettings(patch: Partial<Settings>): Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

/** 页面通过它拿到数据库、词库和设置。 */
export function useApp(): AppState {
  return use(Ctx)!;
}

export const db = new AppDb();

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ vocab: VocabIndex; settings: Settings } | null>(null);
  const [error, setError] = useState<unknown>(null);
  if (error) throw error; // 交给 ErrorBoundary

  useEffect(() => {
    const settings = loadSettings(db).then((settings) => {
      applyTheme(settings.theme);
      return settings;
    });
    Promise.all([loadVocab(), settings])
      .then(([vocab, settings]) => {
        setState({ vocab, settings });
      })
      .catch(setError);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return;
      const theme = (event.newValue ?? 'system') as Settings['theme'];
      applyTheme(theme);
      setState((s) => s && { ...s, settings: { ...s.settings, theme } });
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!state) return <main className="loading">加载中…</main>;

  const value: AppState = {
    db,
    ...state,
    async updateSettings(patch) {
      const settings = await saveSettings(db, patch);
      applyTheme(settings.theme);
      setState((s) => s && { ...s, settings });
    },
  };
  return <Ctx value={value}>{children}</Ctx>;
}
