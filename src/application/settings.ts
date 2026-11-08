import type { AppDb } from '../data/db';
import type { Settings } from '../domain/types';

export const DEFAULT_SETTINGS: Settings = {
  dailyTarget: 60,
  newLimit: 20,
  timeZone: 'Europe/Amsterdam',
  dayBoundaryHour: 4,
  easyButton: false,
  speechRate: 'normal',
  speechMode: 'system',
  speechVoiceURI: null,
  theme: 'system',
  lastExportAtMs: null,
};

export async function loadSettings(db: AppDb): Promise<Settings> {
  return (await db.settings.get('main'))
    ?? { ...DEFAULT_SETTINGS, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

export async function saveSettings(db: AppDb, patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings(db)), ...patch };
  await db.settings.put(next, 'main');
  return next;
}
