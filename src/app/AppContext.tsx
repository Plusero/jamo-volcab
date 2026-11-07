import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppDb } from '../data/db';
import { loadSettings, saveSettings } from '../application/settings';
import { loadVocab, type VocabIndex } from '../application/vocab';
import type { Settings } from '../domain/types';

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

function applyTheme(theme: Settings['theme']) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ vocab: VocabIndex; settings: Settings } | null>(null);
  const [error, setError] = useState<unknown>(null);
  if (error) throw error; // 交给 ErrorBoundary

  useEffect(() => {
    Promise.all([loadVocab(), loadSettings(db)])
      .then(([vocab, settings]) => {
        applyTheme(settings.theme);
        setState({ vocab, settings });
      })
      .catch(setError);
  }, []);

  if (!state) return <div className="loading">加载中…</div>;

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
